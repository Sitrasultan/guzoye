import User from '../models/User.js';
import Guide from '../models/Guide.js';
import Tour from '../models/Tour.js';
import Booking from '../models/Booking.js';
import AuditLog from '../models/AuditLog.js';
import { ApiError } from '../middleware/errors.js';
import { escapeRegex } from '../middleware/validate.js';
import { filters, text, id, plain } from '../middleware/managementValidation.js';
import { transaction, lockTour, audit, pageResult } from '../services/management.js';
export async function listApplications(req, res) {
  const { page, limit } = filters(req.query, ['status']);
  const status = req.query.status || 'pending';
  if (!['pending', 'approved', 'rejected'].includes(status)) throw new ApiError(400, 'Invalid guide status.');
  const filter = { status, isActive: { $ne: false } };
  const [data, total] = await Promise.all([Guide.find(filter).sort({ createdAt: 1 }).skip((page - 1) * limit).limit(limit).populate('user', 'name email role').lean(), Guide.countDocuments(filter)]);
  pageResult(res, data, total, page, limit);
}
async function reviewApplication(req, res, approved) {
  const reason = approved ? '' : text(plain(req.body).reason, 'reason', 5, 1000);
  const data = await transaction(async session => {
    const guide = await Guide.findById(req.params.id).session(session);
    if (!guide) throw new ApiError(404, 'Guide application not found.');
    if (guide.isActive === false) throw new ApiError(409, 'Guide account is deactivated.');
    const next = approved ? 'approved' : 'rejected';
    if (guide.status === next) return guide;
    // Rejection is an application decision, not a way to revoke live guides.
    if (!approved && guide.status !== 'pending') throw new ApiError(409, 'Only pending applications can be rejected.');
    guide.status = next; guide.rejectionReason = reason;
    if (approved) { guide.approvedAt = new Date(); guide.approvedBy = req.user._id; }
    await guide.save({ session });
    await audit(req.user._id, approved ? 'approve' : 'reject', 'Guide', guide._id, { reason }, session);
    return guide;
  });
  res.json({ data, message: approved ? 'Guide approved.' : 'Guide application rejected with a reason.' });
}
export const approveGuide = (req, res) => reviewApplication(req, res, true);
export const rejectGuide = (req, res) => reviewApplication(req, res, false);
export async function stats(req, res) {
  const [users, approved, pending, tours, byStatus, monthly, top] = await Promise.all([
    User.countDocuments(), Guide.countDocuments({ status: 'approved', isActive: { $ne: false } }), Guide.countDocuments({ status: 'pending', isActive: { $ne: false } }), Tour.countDocuments(),
    Booking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$totalPrice', 0] } } } }]),
    Booking.aggregate([{ $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: 'UTC' } }, count: { $sum: 1 } } }, { $sort: { _id: -1 } }, { $limit: 12 }, { $sort: { _id: 1 } }]),
    Booking.aggregate([{ $group: { _id: '$tour', count: { $sum: 1 }, guests: { $sum: '$guests' } } }, { $sort: { count: -1, _id: 1 } }, { $limit: 5 }, { $lookup: { from: 'tours', localField: '_id', foreignField: '_id', as: 'tour' } }, { $project: { count: 1, guests: 1, title: { $ifNull: [{ $arrayElemAt: ['$tour.title', 0] }, 'Removed tour'] } } }])
  ]);
  res.json({ data: { totalUsers: users, approvedGuides: approved, pendingGuides: pending, totalTours: tours, bookings: Object.fromEntries(byStatus.map(row => [row._id, row.count])), revenueEstimate: byStatus.reduce((sum, row) => sum + row.amount, 0), bookingsPerMonth: monthly, topTours: top } });
}
export async function tours(req, res) {
  const { page, limit } = filters(req.query);
  const [data, total] = await Promise.all([Tour.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate({ path: 'guide', populate: { path: 'user', select: 'name email' } }).populate('destination', 'name').lean(), Tour.countDocuments()]);
  pageResult(res, data, total, page, limit);
}
export async function reassign(req, res) {
  const guideId = id(plain(req.body).guideId, 'guideId');
  const data = await transaction(async session => {
    const guide = await Guide.findOneAndUpdate({ _id: guideId, status: 'approved', isActive: { $ne: false } }, { $inc: { mutationVersion: 1 } }, { session, new: true });
    if (!guide || !await User.exists({ _id: guide.user, isActive: { $ne: false } }).session(session)) throw new ApiError(400, 'Choose an approved, active guide.');
    const tour = await lockTour(req.params.id, null, session);
    const previousGuide = String(tour.guide); tour.guide = guide._id; await tour.save({ session });
    await audit(req.user._id, 'reassign', 'Tour', tour._id, { previousGuide, guideId }, session);
    return tour;
  });
  res.json({ data, message: 'Guide reassigned. Existing requests now belong to the new guide.' });
}
export async function archive(req, res) {
  const data = await transaction(async session => {
    const tour = await lockTour(req.params.id, null, session);
    if (!tour.archived) { tour.archived = true; tour.archivedAt = new Date(); await tour.save({ session }); await audit(req.user._id, 'archive', 'Tour', tour._id, { title: tour.title }, session); }
    return tour;
  });
  res.json({ data, message: 'Tour archived; existing bookings remain manageable.' });
}
export async function users(req, res) {
  const { page, limit } = filters(req.query, ['search', 'role']);
  const filter = {};
  if (req.query.role) { if (!['traveler', 'guide', 'admin'].includes(req.query.role)) throw new ApiError(400, 'Invalid role.'); filter.role = req.query.role; }
  if (req.query.search) { const term = escapeRegex(req.query.search); filter.$or = [{ name: new RegExp(term, 'i') }, { email: new RegExp(term, 'i') }]; }
  const [data, total] = await Promise.all([User.find(filter).select('name email role isActive createdAt').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), User.countDocuments(filter)]);
  pageResult(res, data, total, page, limit);
}
export async function deactivate(req, res) {
  const reason = text(plain(req.body).reason, 'reason', 5, 1000);
  await transaction(async session => {
    const user = await User.findById(req.params.id).session(session);
    if (!user) throw new ApiError(404, 'User not found.');
    if (user.role === 'admin') throw new ApiError(409, 'Admin accounts cannot be deactivated through this dashboard.');
    if (user.isActive === false) return;
    if (user.role === 'traveler' && await Booking.exists({ user: user._id, status: { $in: ['pending', 'confirmed'] } }).session(session)) throw new ApiError(409, 'Resolve this traveler’s active bookings before deactivation.');
    if (user.role === 'guide') {
      const guide = await Guide.findOne({ user: user._id }).session(session);
      if (guide) {
        const owned = await Tour.find({ guide: guide._id }).select('_id archived title').session(session);
        if (await Booking.exists({ tour: { $in: owned.map(t => t._id) }, status: { $in: ['pending', 'confirmed'] } }).session(session)) throw new ApiError(409, 'Reassign this guide’s active-booking tours before deactivation.');
        guide.isActive = false; await guide.save({ session });
        await Tour.updateMany({ guide: guide._id }, { $set: { archived: true, archivedAt: new Date() }, $inc: { mutationVersion: 1 } }, { session });
        for (const tour of owned.filter(t => !t.archived)) await audit(req.user._id, 'archive', 'Tour', tour._id, { reason: 'Guide account deactivated', title: tour.title }, session);
      }
    }
    await User.updateOne({ _id: user._id }, { $set: { isActive: false }, $inc: { tokenVersion: 1 } }, { session });
    await audit(req.user._id, 'deactivate', 'User', user._id, { reason, role: user.role }, session);
  });
  res.json({ message: 'Account deactivated and sessions revoked.' });
}
export async function auditLog(req, res) {
  const { page, limit } = filters(req.query);
  const [data, total] = await Promise.all([AuditLog.find().sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).populate('actor', 'name').lean(), AuditLog.countDocuments()]);
  pageResult(res, data, total, page, limit);
}
