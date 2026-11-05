import mongoose from 'mongoose';
import Tour from '../models/Tour.js';
import Guide from '../models/Guide.js';
import Destination from '../models/Destination.js';
import Booking from '../models/Booking.js';
import User from '../models/User.js';
import { ApiError } from '../middleware/errors.js';
import { transaction, activeBookings, audit, pageResult } from '../services/management.js';
import { pagination } from '../middleware/validate.js';

function requireObject(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ApiError(400, 'A JSON object is required.');
  return body;
}
function id(value, field) {
  if (typeof value !== 'string' || !/^[a-f0-9]{24}$/i.test(value)) throw new ApiError(400, `${field} must be a valid resource identifier.`);
  return value;
}
function guideIds(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 10) throw new ApiError(400, 'Assign between 1 and 10 guides.');
  const ids = [...new Set(value.map(item => id(item, 'guideIds')))];
  return ids.map(value => new mongoose.Types.ObjectId(value));
}
function evenGroups(guideList, capacity, spotsLeft) {
  const count = guideList.length;
  const base = Math.floor(capacity / count);
  const remainder = capacity % count;
  const baseSpots = Math.floor(spotsLeft / count);
  const spotsRemainder = spotsLeft % count;
  return guideList.map((guide, index) => ({
    guide,
    capacity: base + (index < remainder ? 1 : 0),
    spotsLeft: baseSpots + (index < spotsRemainder ? 1 : 0)
  }));
}
function tourInput(body, partial = false) {
  const input = requireObject(body);
  const required = partial ? [] : ['title', 'destination', 'description', 'price', 'duration', 'difficulty', 'capacity', 'itinerary', 'images'];
  for (const field of required) if (input[field] === undefined) throw new ApiError(400, `${field} is required.`);
  const clean = {};
  if (input.title !== undefined) {
    if (typeof input.title !== 'string' || input.title.trim().length < 3 || input.title.length > 180) throw new ApiError(400, 'Title must be 3-180 characters.');
    clean.title = input.title.trim();
  }
  if (input.destination !== undefined) clean.destination = id(input.destination, 'destination');
  if (input.description !== undefined) {
    if (typeof input.description !== 'string' || input.description.length < 20 || input.description.length > 10000) throw new ApiError(400, 'Description must be 20-10000 characters.');
    clean.description = input.description;
  }
  for (const field of ['price', 'duration', 'capacity']) {
    if (input[field] !== undefined) {
      const value = Number(input[field]);
      const maximum = field === 'price' ? 1000000 : 365;
      if (!Number.isSafeInteger(value) || value < 1 || value > maximum) throw new ApiError(400, `${field} is invalid.`);
      clean[field] = value;
    }
  }
  if (input.difficulty !== undefined) {
    if (!['Easy', 'Moderate', 'Challenging'].includes(input.difficulty)) throw new ApiError(400, 'Difficulty is invalid.');
    clean.difficulty = input.difficulty;
  }
  if (input.itinerary !== undefined) {
    if (!Array.isArray(input.itinerary) || input.itinerary.length < 1) throw new ApiError(400, 'Itinerary is required.');
    clean.itinerary = input.itinerary.map((day, index) => {
      if (!day || typeof day !== 'object') throw new ApiError(400, 'Itinerary days are invalid.');
      const dayNumber = Number(day.day ?? index + 1);
      if (!Number.isInteger(dayNumber) || dayNumber < 1) throw new ApiError(400, 'Itinerary day numbers are invalid.');
      if (typeof day.title !== 'string' || !day.title.trim() || typeof day.description !== 'string' || !day.description.trim()) throw new ApiError(400, 'Each itinerary day needs a title and description.');
      return { day: dayNumber, title: day.title.trim(), description: day.description.trim() };
    });
  }
  if (input.images !== undefined) {
    if (!Array.isArray(input.images) || input.images.length < 1 || input.images.length > 12) throw new ApiError(400, 'Provide 1-12 image URLs.');
    clean.images = input.images;
  }
  if (input.included !== undefined) clean.included = Array.isArray(input.included) ? input.included.filter(item => typeof item === 'string' && item.trim()) : [];
  if (input.excluded !== undefined) clean.excluded = Array.isArray(input.excluded) ? input.excluded.filter(item => typeof item === 'string' && item.trim()) : [];
  return clean;
}
export async function listTours(req, res) {
  const { page, limit } = pagination(req.query);
  const filter = {};
  if (req.query.archived === 'true') filter.archived = true;
  if (req.query.archived === 'false') filter.archived = { $ne: true };
  const [data, total] = await Promise.all([
    Tour.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
      .populate('destination').populate({ path: 'assignedGuides', populate: { path: 'user', select: 'name email' } }).lean(),
    Tour.countDocuments(filter)
  ]);
  pageResult(res, data, total, page, limit);
}
export async function createTour(req, res) {
  const input = tourInput(req.body);
  const assignedGuides = guideIds(req.body.assignedGuides);
  const data = await transaction(async session => {
    if (!await User.exists({ _id: req.user._id, role: 'admin', isActive: { $ne: false } }).session(session)) throw new ApiError(403, 'An active admin is required.');
    if (!await Destination.exists({ _id: input.destination }).session(session)) throw new ApiError(400, 'Choose an existing destination.');
    const guides = await Guide.find({ _id: { $in: assignedGuides }, status: 'approved', isActive: { $ne: false } }).session(session);
    if (guides.length !== assignedGuides.length) throw new ApiError(400, 'All assigned guides must be approved and active.');
    const departures = (req.body.departures || []).map(item => {
      const date = new Date(item.date);
      const capacity = Number(item.capacity);
      if (!(date instanceof Date) || Number.isNaN(+date) || +date <= Date.now()) throw new ApiError(400, 'Departures must be in the future.');
      if (!Number.isSafeInteger(capacity) || capacity < 1 || capacity > 1000) throw new ApiError(400, 'Departure capacity is invalid.');
      return { date, capacity, spotsLeft: capacity, guideGroups: evenGroups(assignedGuides, capacity, capacity) };
    });
    const [created] = await Tour.create([{ ...input, owner: req.user._id, assignedGuides, guide: assignedGuides[0], departures, archived: false, rating: 0, reviewCount: 0 }], { session });
    await audit(req.user._id, 'tour_create', 'Tour', created._id, { title: created.title }, session);
    return created;
  });
  res.status(201).json({ data, message: 'Tour created and guides assigned.' });
}
export async function updateTour(req, res) {
  const input = tourInput(req.body, true);
  const data = await transaction(async session => {
    const tour = await Tour.findOneAndUpdate({ _id: req.params.id }, { $inc: { mutationVersion: 1 } }, { session, new: true });
    if (!tour) throw new ApiError(404, 'Tour not found.');
    if (input.destination && !await Destination.exists({ _id: input.destination }).session(session)) throw new ApiError(400, 'Choose an existing destination.');
    if (input.itinerary && (input.itinerary.length !== (input.duration || tour.duration))) throw new ApiError(400, 'The itinerary must have one entry per duration day.');
    tour.set(input); await tour.save({ session });
    await audit(req.user._id, 'tour_update', 'Tour', tour._id, { fields: Object.keys(input) }, session);
    return tour;
  });
  res.json({ data, message: 'Tour updated.' });
}
export async function assignGuides(req, res) {
  const assignedGuides = guideIds(requireObject(req.body).guideIds);
  const data = await transaction(async session => {
    const tour = await Tour.findOneAndUpdate({ _id: req.params.id }, { $inc: { mutationVersion: 1 } }, { session, new: true });
    if (!tour) throw new ApiError(404, 'Tour not found.');
    if (await activeBookings(tour._id, session)) throw new ApiError(409, 'Finish or cancel active bookings before changing guide assignments.');
    const guides = await Guide.find({ _id: { $in: assignedGuides }, status: 'approved', isActive: { $ne: false } }).session(session);
    if (guides.length !== assignedGuides.length) throw new ApiError(400, 'All assigned guides must be approved and active.');
    tour.assignedGuides = assignedGuides;
    tour.guide = assignedGuides[0];
    for (const departure of tour.departures) {
      if (+departure.date <= Date.now()) continue;
      departure.guideGroups = evenGroups(assignedGuides, departure.capacity, departure.spotsLeft);
    }
    await tour.save({ session });
    await audit(req.user._id, 'tour_guides_assign', 'Tour', tour._id, { assignedGuides }, session);
    return tour;
  });
  res.json({ data, message: 'Guide assignments updated.' });
}
export async function addDeparture(req, res) {
  const input = requireObject(req.body);
  const date = new Date(input.date);
  const capacity = Number(input.capacity);
  if (!(date instanceof Date) || Number.isNaN(+date) || +date <= Date.now()) throw new ApiError(400, 'Departure must be in the future.');
  if (!Number.isSafeInteger(capacity) || capacity < 1 || capacity > 1000) throw new ApiError(400, 'Capacity must be a whole number from 1 to 1000.');
  const data = await transaction(async session => {
    const tour = await Tour.findOneAndUpdate({ _id: req.params.id }, { $inc: { mutationVersion: 1 } }, { session, new: true });
    if (!tour) throw new ApiError(404, 'Tour not found.');
    if (tour.archived) throw new ApiError(409, 'Cannot add departures to an archived tour.');
    if (!tour.assignedGuides?.length) throw new ApiError(409, 'Assign at least one guide first.');
    if (tour.departures.some(item => +item.date === +date)) throw new ApiError(409, 'A departure already exists at that date and time.');
    tour.departures.push({ date, capacity, spotsLeft: capacity, guideGroups: evenGroups(tour.assignedGuides, capacity, capacity) });
    await tour.save({ session });
    await audit(req.user._id, 'departure_create', 'Tour', tour._id, { date }, session);
    return tour;
  });
  res.status(201).json({ data, message: 'Departure added with one group per assigned guide.' });
}
export async function removeDeparture(req, res) {
  const data = await transaction(async session => {
    const tour = await Tour.findOneAndUpdate({ _id: req.params.id }, { $inc: { mutationVersion: 1 } }, { session, new: true });
    if (!tour) throw new ApiError(404, 'Tour not found.');
    const departure = tour.departures.id(req.params.departureId);
    if (!departure) throw new ApiError(404, 'Departure not found.');
    if (+departure.date <= Date.now()) throw new ApiError(409, 'Only future departures can be removed.');
    if (await activeBookings(tour._id, session, departure._id)) throw new ApiError(409, 'A departure with active bookings cannot be removed.');
    departure.deleteOne(); await tour.save({ session });
    await audit(req.user._id, 'departure_remove', 'Tour', tour._id, { departureId: departure._id }, session);
    return tour;
  });
  res.json({ data, message: 'Departure removed.' });
}


function destinationInput(body) {
  const input = requireObject(body);
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const region = typeof input.region === 'string' ? input.region.trim() : '';
  const description = typeof input.description === 'string' ? input.description.trim() : '';
  const image = typeof input.image === 'string' ? input.image.trim() : '';
  if (name.length < 2 || name.length > 100) throw new ApiError(400, 'Destination name must be 2-100 characters.');
  if (region.length < 2 || region.length > 100) throw new ApiError(400, 'Region must be 2-100 characters.');
  if (description.length < 20 || description.length > 3000) throw new ApiError(400, 'Destination description must be 20-3000 characters.');
  if (!/^https:\/\/.+/i.test(image) || image.length > 2000) throw new ApiError(400, 'Provide a valid https image URL.');
  return { name, region, description, image };
}
export async function createDestination(req, res) {
  const input = destinationInput(req.body);
  const data = await transaction(async session => {
    if (await Destination.exists({ name: input.name }).session(session)) throw new ApiError(409, 'A destination with this name already exists.');
    const [created] = await Destination.create([input], { session });
    await audit(req.user._id, 'destination_create', 'Destination', created._id, { name: created.name }, session);
    return created;
  });
  res.status(201).json({ data, message: 'Destination created.' });
}
export async function setTourStatus(req, res) {
  const status = requireObject(req.body).status;
  if (!['draft', 'published', 'archived'].includes(status)) throw new ApiError(400, 'Tour status is invalid.');
  const data = await transaction(async session => {
    const tour = await Tour.findById(req.params.id).session(session);
    if (!tour) throw new ApiError(404, 'Tour not found.');
    if (status === 'published') {
      if (!tour.images?.length) throw new ApiError(409, 'Add at least one image before publishing.');
      if (!tour.assignedGuides?.length) throw new ApiError(409, 'Assign at least one approved guide before publishing.');
      if (!tour.departures.some(item => +new Date(item.date) > Date.now())) throw new ApiError(409, 'Add at least one future departure before publishing.');
    }
    tour.status = status; tour.archived = status === 'archived';
    if (status === 'archived') tour.archivedAt = new Date();
    await tour.save({ session });
    await audit(req.user._id, 'tour_status_change', 'Tour', tour._id, { status }, session);
    return tour;
  });
  res.json({ data, message: `Tour marked ${status}.` });
}
export async function listGuides(req, res) {
  const guides = await Guide.find({ status: 'approved', isActive: { $ne: false } })
    .populate('user', 'name email').populate('coveredDestinations', 'name').lean();
  const workload = await Booking.aggregate([{ $match: { status: { $in: ['pending', 'confirmed'] } } }, { $group: { _id: '$guide', count: { $sum: 1 } } }]);
  const workloadMap = Object.fromEntries(workload.map(row => [String(row._id), row.count]));
  res.json({ data: guides.map(guide => ({ ...guide, currentWorkload: workloadMap[String(guide._id)] || 0 })) });
}
export async function uploadTourImage(req, res) {
  if (!req.file?.buffer) throw new ApiError(400, 'Choose an image to upload.');
  const { prepareImage } = await import('../services/imageValidation.js');
  const { storeImage } = await import('../services/mediaStorage.js');
  const bytes = await prepareImage(req.file.buffer, 'tour');
  const stored = await storeImage(bytes);
  await audit(req.user._id, 'admin_media_upload', 'Tour', req.user._id, { url: stored.url });
  res.status(201).json({ data: { url: stored.url, _id: stored.key || stored.url }, message: 'Image uploaded.' });
}
