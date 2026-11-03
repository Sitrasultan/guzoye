import { bindTourImages, purge } from '../services/mediaLifecycle.js';
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
  if (input.coveredDestinations && await Destination.countDocuments({ _id: { $in: input.coveredDestinations } }) !== input.coveredDestinations.length) throw new ApiError(400, 'Choose existing destinations.');
  const data = await Guide.findOneAndUpdate({ user: req.user._id }, { $set: input }, { new: true, runValidators: true }).populate('user', 'name role');
  if (!data) throw new ApiError(404, 'Guide profile not found.');
  res.json({ data, message: 'Profile saved.' });
}
export async function ownTours(req, res) {
  const { page, limit } = filters(req.query);
  const filter = { assignedGuides: req.guide._id };
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
export async function createTour() { throw new ApiError(410, 'Guides can no longer create tours. Guzoye admins own tours and assign guides.'); }
export async function editTour() { throw new ApiError(410, 'Guides can no longer edit tours. Contact a Guzoye admin for tour changes.'); }
export async function archiveTour() { throw new ApiError(410, 'Guides can no longer archive tours. Contact a Guzoye admin.'); }
export async function addDeparture() { throw new ApiError(410, 'Guides can no longer add departures. Contact a Guzoye admin.'); }
export async function removeDeparture() { throw new ApiError(410, 'Guides can no longer remove departures. Contact a Guzoye admin.'); }
export async function summary(req, res) {
  const tours = await Tour.find({ assignedGuides: req.guide._id }).select('_id archived').lean();
  const byStatus = await Booking.aggregate([{ $match: { tour: { $in: tours.map(t => t._id) } } }, { $group: { _id: '$status', count: { $sum: 1 } } }]);
  res.json({ data: { tours: tours.length, liveTours: tours.filter(t => !t.archived).length, bookings: Object.fromEntries(byStatus.map(row => [row._id, row.count])) } });
}
