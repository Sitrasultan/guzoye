import mongoose from 'mongoose';
import Tour from '../models/Tour.js';
import Booking from '../models/Booking.js';
import AuditLog from '../models/AuditLog.js';
import { ApiError } from '../middleware/errors.js';
export async function transaction(work) {
  const session = await mongoose.startSession();
  try { let result; await session.withTransaction(async () => { result = await work(session); }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' }, readPreference: 'primary' }); return result; }
  catch (error) { if (error.code === 20 || error.codeName === 'IllegalOperation') throw new ApiError(503, 'This operation requires a replica set or Atlas.'); throw error; }
  finally { await session.endSession(); }
}
export async function lockTour(id, guideId, session) {
  const current = await Tour.findById(id).session(session);
  if (!current) throw new ApiError(404, 'Tour not found.');
  if (guideId && String(current.guide) !== String(guideId)) throw new ApiError(403, 'You can manage only your own tours.');
  return Tour.findOneAndUpdate({ _id: id }, { $inc: { mutationVersion: 1 } }, { new: true, session });
}
export async function activeBookings(tourId, session, departureId) {
  return Booking.exists({ tour: tourId, status: { $in: ['pending', 'confirmed'] }, ...(departureId ? { departureId } : {}) }).session(session);
}
export async function audit(actor, action, targetType, target, details, session) { await AuditLog.create([{ actor, action, targetType, target, details }], { session }); }
export function pageResult(res, data, total, page, limit) { res.set('Cache-Control', 'no-store'); res.json({ data, pagination: { total, page, limit, pages: Math.ceil(total / limit) } }); }
