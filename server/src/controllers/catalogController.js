import { guideFilters, discoveryPipeline } from '../services/guideDiscovery.js';
import { identifierFilter } from '../services/identifiers.js';
import mongoose from 'mongoose';
import Tour from '../models/Tour.js';
import Guide from '../models/Guide.js';
import Destination from '../models/Destination.js';
import Review from '../models/Review.js';
import User from '../models/User.js';
import { ApiError } from '../middleware/errors.js';
import { pagination, integer, enumValue, escapeRegex, validateOptionalId } from '../middleware/validate.js';
const guidePopulation = { path: 'assignedGuides', select: 'image rating languages status isActive', populate: { path: 'user', select: 'name role' } };
const population = guidePopulation;
function send(res, data, total, page, limit) { res.json({ data, pagination: { total, page, limit, pages: Math.ceil(total / limit) } }); }
const visibleGuides = () => Guide.find({ status: 'approved', isActive: { $ne: false } }).select('_id');
export async function listTours(req, res) {
  const q = req.query, { page, limit } = pagination(q), filter = { archived: { $ne: true } };
  const sort = enumValue(q.sort, ['rating', 'price-asc', 'price-desc'], 'sort') || 'rating';
  if (q.difficulty) filter.difficulty = enumValue(q.difficulty, ['Easy', 'Moderate', 'Challenging'], 'difficulty');
  if (q.maxPrice) { const price = Number(q.maxPrice); if (!Number.isFinite(price) || price < 0 || price > 1000000) throw new ApiError(400, 'maxPrice must be between 0 and 1000000.'); filter.price = { $lte: price }; }
  if (q.duration) filter.duration = { $lte: integer(q.duration, 'duration', { max: 365 }) };
  if (q.featured) filter.featured = enumValue(q.featured, ['true', 'false'], 'featured') === 'true';
  if (q.guide) validateOptionalId(q.guide);
  const approved = await visibleGuides().lean();
  const approvedIds = approved.map(g => String(g._id));
  filter.assignedGuides = { $in: approvedIds.map(id => new mongoose.Types.ObjectId(id)) };
  if (q.guide) { validateOptionalId(q.guide); filter.assignedGuides = { $in: [new mongoose.Types.ObjectId(q.guide)] }; }
  if (q.region) { const rows = await Destination.find({ region: q.region }).select('_id').lean(); filter.destination = { $in: rows.map(d => d._id) }; }
  if (q.search) { const regex = new RegExp(escapeRegex(q.search), 'i'); const rows = await Destination.find({ name: regex }).select('_id').lean(); filter.$or = [{ title: regex }, { description: regex }, { destination: { $in: rows.map(d => d._id) } }]; }
  const order = sort === 'price-asc' ? { price: 1, _id: 1 } : sort === 'price-desc' ? { price: -1, _id: 1 } : { rating: -1, _id: 1 };
  const [data, total] = await Promise.all([Tour.find(filter).sort(order).skip((page - 1) * limit).limit(limit).populate('destination').populate(population).lean(), Tour.countDocuments(filter)]);
  send(res, data, total, page, limit);
}
export async function getTour(req, res) {
  const filter = identifierFilter(Tour, req.params.id);
  if (!filter) throw new ApiError(400, 'Invalid tour identifier.');
  const data = await Tour.findOne({ ...filter, archived: { $ne: true } }).populate('destination').populate(population).lean();
  const hasAvailableGuide = (data?.assignedGuides || []).some(guide => guide.status === 'approved' && guide.isActive !== false);
  if (!data || !hasAvailableGuide) throw new ApiError(404, 'Tour not found.'); res.json({ data });
}
export async function listDestinations(req, res) {
  const { page, limit } = pagination(req.query), filter = req.query.search ? { name: new RegExp(escapeRegex(req.query.search), 'i') } : {};
  const [data, total] = await Promise.all([Destination.find(filter).sort({ _id: 1 }).skip((page - 1) * limit).limit(limit).lean(), Destination.countDocuments(filter)]); send(res, data, total, page, limit);
}
export async function getDestination(req, res) {
  const filter = identifierFilter(Destination, req.params.id);
  if (!filter) throw new ApiError(400, 'Invalid destination identifier.');
  const data = await Destination.findOne(filter).lean(); if (!data) throw new ApiError(404, 'Destination not found.'); res.json({ data });
}
export async function listGuides(req, res) {
  const filters = guideFilters(req.query);
  const order = filters.sort === 'name' ? { 'user.name': 1, _id: 1 } : filters.sort === 'experience' ? { yearsExperience: -1, _id: 1 } : { rating: -1, _id: 1 };
  const [result] = await Guide.aggregate([...discoveryPipeline(filters), { $sort: order }, { $facet: { data: [{ $skip: (filters.page - 1) * filters.limit }, { $limit: filters.limit }], total: [{ $count: 'count' }] } }]).collation({ locale: 'en', strength: 2 });
  send(res, result?.data || [], result?.total[0]?.count || 0, filters.page, filters.limit);
}
export async function getGuide(req, res) {
  const filter = identifierFilter(Guide, req.params.id);
  if (!filter) throw new ApiError(400, 'Invalid guide identifier.');
  const [data] = await Guide.aggregate([{ $match: filter }, ...discoveryPipeline({ minRating: 0 })]);
  if (!data) throw new ApiError(404, 'Guide not found.'); res.json({ data });
}
export async function listReviews(req, res) {
  const tourFilter = identifierFilter(Tour, req.params.id);
  if (!tourFilter) throw new ApiError(400, 'Invalid tour identifier.');
  const tour = await Tour.findOne({ ...tourFilter, archived: { $ne: true } }).select('assignedGuides').populate('assignedGuides', 'status isActive').lean();
  const hasAvailableGuide = (tour?.assignedGuides || []).some(guide => guide.status === 'approved' && guide.isActive !== false);
  if (!tour || !hasAvailableGuide) throw new ApiError(404, 'Tour not found.');
  const { page, limit } = pagination(req.query), filter = { tour: tour._id };
  const [data, total] = await Promise.all([Review.find(filter).sort({ createdAt: -1, _id: 1 }).skip((page - 1) * limit).limit(limit).populate('user', 'name').lean(), Review.countDocuments(filter)]); send(res, data, total, page, limit);
}
