import Guide from '../models/Guide.js';
import Tour from '../models/Tour.js';
import Destination from '../models/Destination.js';
import Booking from '../models/Booking.js';
import { ApiError } from '../middleware/errors.js';
import { profileInput, tourInput, departureInput, filters } from '../middleware/managementValidation.js';
import { transaction, lockTour, activeBookings, pageResult } from '../services/management.js';
export async function profile(req, res) {
  const data = await Guide.findOne({ user: req.user._id }).populate('user', 'name role').lean();
  if (!data) throw new ApiError(404, 'Guide profile not found. Contact support.');
  res.json({ data });
}
export async function updateProfile(req, res) {
  const input = profileInput(req.body);
  const data = await Guide.findOneAndUpdate({ user: req.user._id }, { $set: input }, { new: true, runValidators: true }).populate('user', 'name role');
  if (!data) throw new ApiError(404, 'Guide profile not found.');
  res.json({ data, message: 'Profile saved.' });
}
export async function ownTours(req, res) {
  const { page, limit } = filters(req.query);
  const filter = { guide: req.guide._id };
  const [data, total, counts] = await Promise.all([
    Tour.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('destination').lean(),
    Tour.countDocuments(filter),
    Booking.aggregate([{ $lookup: { from: 'tours', localField: 'tour', foreignField: '_id', as: 'owned' } }, { $match: { 'owned.guide': req.guide._id } }, { $group: { _id: '$tour', total: { $sum: 1 }, active: { $sum: { $cond: [{ $in: ['$status', ['pending', 'confirmed']] }, 1, 0] } } } }])
  ]);
  const lookup = new Map(counts.map(value => [String(value._id), value]));
  pageResult(res, data.map(tour => ({ ...tour, bookingCounts: lookup.get(String(tour._id)) || { total: 0, active: 0 } })), total, page, limit);
}
export async function ownTour(req, res) {
  const data = await Tour.findById(req.params.id).populate('destination').lean();
  if (!data) throw new ApiError(404, 'Tour not found.');
  if (String(data.guide) !== String(req.guide._id)) throw new ApiError(403, 'You can view only your own tours here.');
  const active = await Booking.countDocuments({ tour: data._id, status: { $in: ['pending', 'confirmed'] } });
  res.json({ data: { ...data, activeBookingCount: active } });
}
export async function createTour(req, res) {
  const input = tourInput(req.body);
  if (input.itinerary.length !== input.duration) throw new ApiError(400, 'The itinerary must have one entry per duration day.');
  const data = await transaction(async session => {
    const guide = await Guide.findOneAndUpdate({ _id: req.guide._id, status: 'approved', isActive: { $ne: false } }, { $inc: { mutationVersion: 1 } }, { session, new: true });
    if (!guide) throw new ApiError(403, 'An approved, active guide is required.');
    if (!await Destination.exists({ _id: input.destination }).session(session)) throw new ApiError(400, 'Choose an existing destination.');
    const [created] = await Tour.create([{ ...input, guide: guide._id, archived: false, rating: 0, reviewCount: 0 }], { session });
    return created;
  });
  res.status(201).json({ data, message: 'Tour created. You own its booking requests.' });
}
export async function editTour(req, res) {
  const input = tourInput(req.body, true);
  const data = await transaction(async session => {
    const tour = await lockTour(req.params.id, req.guide._id, session);
    if (tour.archived) throw new ApiError(409, 'Archived tours cannot be edited.');
    if (await activeBookings(tour._id, session)) throw new ApiError(409, 'This tour has active bookings. Its details cannot be edited; archive it instead.');
    if (input.destination && !await Destination.exists({ _id: input.destination }).session(session)) throw new ApiError(400, 'Choose an existing destination.');
    if ((input.itinerary || tour.itinerary).length !== (input.duration || tour.duration)) throw new ApiError(400, 'The itinerary must have one entry per duration day.');
    tour.set(input); await tour.save({ session }); return tour;
  });
  res.json({ data, message: 'Tour saved.' });
}
export async function archiveTour(req, res) {
  const data = await transaction(async session => {
    const tour = await lockTour(req.params.id, req.guide._id, session);
    tour.archived = true; tour.archivedAt ||= new Date(); await tour.save({ session }); return tour;
  });
  res.json({ data, message: 'Tour archived. Existing bookings can still be managed.' });
}
export async function addDeparture(req, res) {
  const input = departureInput(req.body);
  const data = await transaction(async session => {
    const tour = await lockTour(req.params.id, req.guide._id, session);
    if (tour.archived) throw new ApiError(409, 'Cannot add departures to an archived tour.');
    if (tour.departures.length >= 200) throw new ApiError(409, 'Maximum 200 departures per tour.');
    if (tour.departures.some(d => +d.date === +input.date)) throw new ApiError(409, 'A departure already exists at that date and time.');
    tour.departures.push(input); await tour.save({ session }); return tour;
  });
  res.status(201).json({ data, message: 'Departure added.' });
}
export async function removeDeparture(req, res) {
  const data = await transaction(async session => {
    const tour = await lockTour(req.params.id, req.guide._id, session);
    const departure = tour.departures.id(req.params.departureId);
    if (!departure) throw new ApiError(404, 'Departure not found.');
    if (+departure.date <= Date.now()) throw new ApiError(409, 'Only future departures can be removed.');
    if (await activeBookings(tour._id, session, departure._id)) throw new ApiError(409, 'A departure with active bookings cannot be removed.');
    departure.deleteOne(); await tour.save({ session }); return tour;
  });
  res.json({ data, message: 'Departure removed. Booking history retains its date snapshot.' });
}
export async function summary(req, res) {
  const tours = await Tour.find({ guide: req.guide._id }).select('_id archived').lean();
  const byStatus = await Booking.aggregate([{ $match: { tour: { $in: tours.map(t => t._id) } } }, { $group: { _id: '$status', count: { $sum: 1 } } }]);
  res.json({ data: { tours: tours.length, liveTours: tours.filter(t => !t.archived).length, bookings: Object.fromEntries(byStatus.map(row => [row._id, row.count])) } });
}
