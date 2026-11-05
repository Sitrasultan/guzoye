import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import User from '../models/User.js';
import Tour from '../models/Tour.js';
import Guide from '../models/Guide.js';
import { ApiError } from '../middleware/errors.js';
import { nextBookingReference } from './identifiers.js';
import { calculateTotal, transitionAllowed } from '../middleware/bookingValidation.js';
export async function inTransaction(operation) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => { result = await operation(session); }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' }, readPreference: 'primary' });
    return result;
  } catch (error) {
    if (error.code === 11000) throw new ApiError(409, 'You already have an active booking for this departure.');
    if (error.code === 20 || error.codeName === 'IllegalOperation') throw new ApiError(503, 'Bookings require a MongoDB replica set or Atlas deployment.');
    throw error;
  } finally { await session.endSession(); }
}
async function restoreSeats(booking, session) {
  const tour = await Tour.findById(booking.tour).session(session);
  const departure = tour?.departures.id(booking.departureId);
  if (!departure) throw new ApiError(409, 'Departure unavailable. No booking status was changed.');
  const group = departure.guideGroups.find(item => String(item.guide) === String(booking.guide));
  if (!group) throw new ApiError(409, 'The booked guide group is unavailable. No booking status was changed.');
  const departureRestored = await Tour.updateOne(
    { _id: tour._id, departures: { $elemMatch: { _id: departure._id, spotsLeft: { $lte: departure.capacity - booking.guests } } } },
    { $inc: { 'departures.$.spotsLeft': booking.guests } },
    { session }
  );
  const groupRestored = await Tour.updateOne(
    { _id: tour._id, 'departures._id': departure._id },
    { $inc: { 'departures.$.guideGroups.$[group].spotsLeft': booking.guests } },
    { session, arrayFilters: [{ 'group._id': group._id, 'group.spotsLeft': { $lte: group.capacity - booking.guests } }] }
  );
  if (departureRestored.modifiedCount !== 1 || groupRestored.modifiedCount !== 1) {
    throw new ApiError(409, 'Availability is inconsistent. No booking status was changed.');
  }
}
export async function createBooking(userId, input) {
  return inTransaction(async session => {
    const activeTraveler = await User.findOneAndUpdate({ _id: userId, role: 'traveler', isActive: { $ne: false } }, { $inc: { mutationVersion: 1 } }, { session, new: true });
    if (!activeTraveler) throw new ApiError(403, 'An active traveler account is required.');
    const tour = await Tour.findById(input.tour).session(session);
    if (!tour) throw new ApiError(404, 'Tour not found.');
    if (tour.archived) throw new ApiError(409, 'This tour is archived and no longer accepts bookings.');
    if (!tour.assignedGuides?.some(id => String(id) === input.guideId)) throw new ApiError(400, 'Choose a guide assigned to this tour.');
    const guide = await Guide.findOne({ _id: input.guideId, status: 'approved', isActive: { $ne: false } }).session(session);
    if (!guide) throw new ApiError(409, 'The selected guide is not currently available.');
    const departure = tour.departures.id(input.departureId);
    if (!departure) throw new ApiError(404, 'Departure not found for this tour.');
    if (+departure.date <= Date.now()) throw new ApiError(409, 'This departure is in the past or has already started.');
    if (guide.blockedDates?.some(blocked => +blocked === +departure.date)) throw new ApiError(409, 'The selected guide is blocked for this departure.');
    const group = departure.guideGroups.find(item => String(item.guide) === String(input.guideId));
    if (!group) throw new ApiError(400, 'The selected guide has no group on this departure.');
    if (await Booking.exists({ user: userId, tour: tour._id, departureId: departure._id, active: true }).session(session)) throw new ApiError(409, 'You already have an active booking for this departure.');
    const groupReserved = await Tour.updateOne(
      { _id: tour._id, 'departures._id': departure._id },
      { $inc: { 'departures.$.guideGroups.$[group].spotsLeft': -input.guests } },
      { session, arrayFilters: [{ 'group._id': group._id, 'group.spotsLeft': { $gte: input.guests } }] }
    );
    if (groupReserved.modifiedCount !== 1) throw new ApiError(409, 'The selected guide group does not have enough spots.');
    const departureReserved = await Tour.updateOne(
      { _id: tour._id, archived: { $ne: true }, departures: { $elemMatch: { _id: departure._id, date: { $gt: new Date() }, spotsLeft: { $gte: input.guests } } } },
      { $inc: { 'departures.$.spotsLeft': -input.guests } },
      { session }
    );
    if (departureReserved.modifiedCount !== 1) throw new ApiError(409, 'Not enough spots remain or this departure is no longer bookable.');
    const reference = await nextBookingReference(session);
    const [booking] = await Booking.create([{ reference, user: userId, tour: tour._id, departureId: departure._id, departureDate: departure.date, guide: input.guideId, guests: input.guests, totalPrice: calculateTotal(tour.price, input.guests), status: 'pending', active: true }], { session });
    const result = booking.toObject(); delete result.active; return result;
  });
}
export async function cancelBooking(userId, id) {
  return inTransaction(async session => {
    const booking = await Booking.findById(id).session(session);
    if (!booking) throw new ApiError(404, 'Booking not found.');
    if (String(booking.user) !== String(userId)) throw new ApiError(403, 'Only the owner can cancel this booking.');
    if (!['pending', 'confirmed'].includes(booking.status)) throw new ApiError(409, `Cannot cancel a ${booking.status} booking.`);
    const updated = await Booking.findOneAndUpdate({ _id: id, status: booking.status }, { $set: { status: 'cancelled', active: false } }, { session, new: true, runValidators: true });
    if (!updated) throw new ApiError(409, 'Booking changed. Refresh and try again.');
    await restoreSeats(booking, session); return updated.toObject();
  });
}
export async function changeBookingStatus(guideId, id, nextStatus) {
  return inTransaction(async session => {
    const booking = await Booking.findById(id).session(session);
    if (!booking) throw new ApiError(404, 'Booking not found.');
    if (String(booking.guide) !== String(guideId)) throw new ApiError(403, 'You can manage only bookings assigned to you.');
    if (!transitionAllowed(booking.status, nextStatus)) throw new ApiError(409, `Cannot change ${booking.status} to ${nextStatus}. Allowed: pending → confirmed/declined; confirmed → completed.`);
    const updated = await Booking.findOneAndUpdate({ _id: id, guide: guideId, status: booking.status }, { $set: { status: nextStatus, active: ['pending', 'confirmed'].includes(nextStatus) } }, { session, new: true, runValidators: true });
    if (!updated) throw new ApiError(409, 'Booking changed. Refresh and try again.');
    if (nextStatus === 'declined') await restoreSeats(booking, session);
    return updated.toObject();
  });
}
