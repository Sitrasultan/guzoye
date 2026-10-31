import Booking from '../models/Booking.js';
import Tour from '../models/Tour.js';
import { bookingInput, statusInput, bookingFilters } from '../middleware/bookingValidation.js';
import { createBooking, cancelBooking, changeBookingStatus } from '../services/bookingService.js';
const tourFields = 'title images guide destination departures';
async function list(res, filter, query) {
  const { page, limit, status } = bookingFilters(query);
  if (status) filter.status = status;
  const [data, total] = await Promise.all([
    Booking.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit)
      .populate('tour', tourFields).populate('user', 'name email').lean(),
    Booking.countDocuments(filter)
  ]);
  res.set('Cache-Control', 'no-store');
  res.json({ data, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
}
export async function create(req, res) {
  const data = await createBooking(req.user._id, bookingInput(req.body));
  res.status(201).json({ data, message: 'Booking request sent. Your spots are held while your guide reviews it.' });
}
export async function mine(req, res) { await list(res, { user: req.user._id }, req.query); }
export async function cancel(req, res) {
  const data = await cancelBooking(req.user._id, req.params.id);
  res.json({ data, message: 'Booking cancelled. Spots have been restored.' });
}
export async function guideBookings(req, res) {
  bookingFilters(req.query); // Validate before querying.
  const tours = await Tour.find({ guide: req.guide._id }).select('_id').lean();
  await list(res, { tour: { $in: tours.map(t => t._id) } }, req.query);
}
export async function status(req, res) {
  const data = await changeBookingStatus(req.guide._id, req.params.id, statusInput(req.body));
  res.json({ data, message: `Booking ${data.status}.` });
}
export async function adminBookings(req, res) { await list(res, {}, req.query); }
