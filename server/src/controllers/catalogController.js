import Tour from '../models/Tour.js';
import Guide from '../models/Guide.js';
import Destination from '../models/Destination.js';
import Review from '../models/Review.js';
import User from '../models/User.js';
import { ApiError } from '../middleware/errors.js';
import { pagination, integer, enumValue, escapeRegex, validateOptionalId } from '../middleware/validate.js';
const population = { path: 'guide', populate: { path: 'user', select: 'name role' } };
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
  const approved = await visibleGuides().lean(); filter.guide = { $in: approved.map(g => g._id).filter(value => !q.guide || String(value) === q.guide) };
  if (q.region) { const rows = await Destination.find({ region: q.region }).select('_id').lean(); filter.destination = { $in: rows.map(d => d._id) }; }
  if (q.search) { const regex = new RegExp(escapeRegex(q.search), 'i'); const rows = await Destination.find({ name: regex }).select('_id').lean(); filter.$or = [{ title: regex }, { description: regex }, { destination: { $in: rows.map(d => d._id) } }]; }
  const order = sort === 'price-asc' ? { price: 1, _id: 1 } : sort === 'price-desc' ? { price: -1, _id: 1 } : { rating: -1, _id: 1 };
  const [data, total] = await Promise.all([Tour.find(filter).sort(order).skip((page - 1) * limit).limit(limit).populate('destination').populate(population).lean(), Tour.countDocuments(filter)]);
  send(res, data, total, page, limit);
}
export async function getTour(req, res) {
  const data = await Tour.findOne({ _id: req.params.id, archived: { $ne: true } }).populate('destination').populate(population).lean();
  if (!data || data.guide?.status !== 'approved' || data.guide?.isActive === false) throw new ApiError(404, 'Tour not found.'); res.json({ data });
}
export async function listDestinations(req, res) {
  const { page, limit } = pagination(req.query), filter = req.query.search ? { name: new RegExp(escapeRegex(req.query.search), 'i') } : {};
  const [data, total] = await Promise.all([Destination.find(filter).sort({ _id: 1 }).skip((page - 1) * limit).limit(limit).lean(), Destination.countDocuments(filter)]); send(res, data, total, page, limit);
}
export async function getDestination(req, res) { const data = await Destination.findById(req.params.id).lean(); if (!data) throw new ApiError(404, 'Destination not found.'); res.json({ data }); }
export async function listGuides(req, res) {
  const { page, limit } = pagination(req.query), filter = { status: 'approved', isActive: { $ne: false } };
  if (req.query.language) filter.languages = req.query.language;
  if (req.query.search) { const users = await User.find({ name: new RegExp(escapeRegex(req.query.search), 'i') }).select('_id').lean(); filter.user = { $in: users.map(u => u._id) }; }
  const [data, total] = await Promise.all([Guide.find(filter).sort({ rating: -1, _id: 1 }).skip((page - 1) * limit).limit(limit).populate('user', 'name role').lean(), Guide.countDocuments(filter)]); send(res, data, total, page, limit);
}
export async function getGuide(req, res) { const data = await Guide.findOne({ _id: req.params.id, status: 'approved', isActive: { $ne: false } }).populate('user', 'name role').lean(); if (!data) throw new ApiError(404, 'Guide not found.'); res.json({ data }); }
export async function listReviews(req, res) {
  const tour = await Tour.findOne({ _id: req.params.id, archived: { $ne: true } }).select('guide').lean();
  if (!tour || !await Guide.exists({ _id: tour.guide, status: 'approved', isActive: { $ne: false } })) throw new ApiError(404, 'Tour not found.');
  const { page, limit } = pagination(req.query), filter = { tour: req.params.id };
  const [data, total] = await Promise.all([Review.find(filter).sort({ createdAt: -1, _id: 1 }).skip((page - 1) * limit).limit(limit).populate('user', 'name').lean(), Review.countDocuments(filter)]); send(res, data, total, page, limit);
}
