import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import Tour from '../models/Tour.js';
import Guide from '../models/Guide.js';
import { ApiError } from '../middleware/errors.js';
import { calculateTotal, transitionAllowed } from '../middleware/bookingValidation.js';
export async function inTransaction(operation) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => { result = await operation(session); }, {
      readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' }, readPreference: 'primary'
    });
    return result;
  } catch (error) {
    if (error.code === 11000) throw new ApiError(409, 'You already have an active booking for this departure.');
    if (error.code === 20 || error.codeName === 'IllegalOperation') throw new ApiError(503, 'Bookings require a MongoDB replica set or Atlas deployment. See Phase 4 setup.');
    throw error;
  } finally { await session.endSession(); }
}
async function restoreSeats(booking, session) {
  const tour = await Tour.findById(booking.tour).session(session);
  const departure = tour?.departures.id(booking.departureId);
  if (!departure) throw new ApiError(409, 'Departure is unavailable. Contact support; no booking status was changed.');
  const updated = await Tour.updateOne({
    _id: tour._id,
    departures: { $elemMatch: { _id: departure._id, spotsLeft: { $lte: departure.capacity - booking.guests } } }
  }, { $inc: { 'departures.$.spotsLeft': booking.guests } }, { session });
  if (updated.modifiedCount !== 1) throw new ApiError(409, 'Availability is inconsistent. Contact support; no status was changed.');
}
export async function createBooking(userId, input) {
  return inTransaction(async session => {
    const tour = await Tour.findById(input.tour).session(session);
    if (!tour) throw new ApiError(404, 'Tour not found.');
    if (!await Guide.exists({ _id: tour.guide, status: 'approved' }).session(session)) throw new ApiError(409, 'This tour does not have an approved guide.');
    const departure = tour.departures.id(input.departureId);
    if (!departure) throw new ApiError(404, 'Departure not found for this tour.');
    if (departure.date.getTime() <= Date.now()) throw new ApiError(409, 'This departure is in the past or has already started.');
    if (await Booking.exists({ user: userId, tour: tour._id, departureId: departure._id, active: true }).session(session)) throw new ApiError(409, 'You already have an active booking for this departure.');
    // Bind all predicates to the SAME array element. Concurrent last-seat requests
    // contend on this Tour document; the loser retries and fails the spots check.
    const reserved = await Tour.findOneAndUpdate({
      _id: tour._id,
      departures: { $elemMatch: { _id: departure._id, date: { $gt: new Date() }, spotsLeft: { $gte: input.guests } } }
    }, { $inc: { 'departures.$.spotsLeft': -input.guests } }, { session, new: true });
    if (!reserved) throw new ApiError(409, 'Not enough spots remain, or this departure has started. Refresh availability.');
    const [booking] = await Booking.create([{
      user: userId, tour: tour._id, departureId: departure._id,
      departureDate: departure.date, guests: input.guests,
      totalPrice: calculateTotal(tour.price, input.guests), status: 'pending', active: true
    }], { session });
    // Any insert failure aborts the transaction and automatically restores the
    // decrement. Do not add a second compensating increment after rollback.
    const publicBooking = booking.toObject();
    delete publicBooking.active;
    return publicBooking;
  });
}
export async function cancelBooking(userId, id) {
  return inTransaction(async session => {
    const booking = await Booking.findById(id).session(session);
    if (!booking) throw new ApiError(404, 'Booking not found.');
    if (String(booking.user) !== String(userId)) throw new ApiError(403, 'Only the booking owner can cancel this booking.');
    if (!['pending', 'confirmed'].includes(booking.status)) throw new ApiError(409, `Cannot cancel a ${booking.status} booking. Only pending or confirmed bookings may be cancelled.`);
    const updated = await Booking.findOneAndUpdate({ _id: id, status: booking.status }, {
      $set: { status: 'cancelled', active: false }
    }, { session, new: true, runValidators: true });
    if (!updated) throw new ApiError(409, 'Booking changed. Refresh and try again.');
    await restoreSeats(booking, session);
    return updated.toObject();
  });
}
export async function changeBookingStatus(guideId, id, nextStatus) {
  return inTransaction(async session => {
    const booking = await Booking.findById(id).session(session);
    if (!booking) throw new ApiError(404, 'Booking not found.');
    const ownedTour = await Tour.exists({ _id: booking.tour, guide: guideId }).session(session);
    if (!ownedTour) throw new ApiError(403, 'You can change bookings only for your own tours.');
    if (!transitionAllowed(booking.status, nextStatus)) throw new ApiError(409, `Cannot change ${booking.status} to ${nextStatus}. Allowed: pending → confirmed/declined; confirmed → completed.`);
    const updated = await Booking.findOneAndUpdate({ _id: id, status: booking.status }, {
      $set: { status: nextStatus, active: ['pending', 'confirmed'].includes(nextStatus) }
    }, { session, new: true, runValidators: true });
    if (!updated) throw new ApiError(409, 'Booking changed. Refresh and try again.');
    if (nextStatus === 'declined') await restoreSeats(booking, session);
    // Completed bookings retain consumed seats; they do not create new inventory.
    return updated.toObject();
  });
}
