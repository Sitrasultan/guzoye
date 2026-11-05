import mongoose from 'mongoose';
import GuideRequest, { GUIDE_REQUEST_TYPES } from '../models/GuideRequest.js';
import Guide from '../models/Guide.js';
import Tour from '../models/Tour.js';
import Destination from '../models/Destination.js';
import Booking from '../models/Booking.js';
import { ApiError, asyncHandler } from '../middleware/errors.js';
import { transaction, audit, pageResult } from '../services/management.js';
import { pagination } from '../middleware/validate.js';

function body(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError(400, 'A JSON object is required.');
  return value;
}
function objectId(value, field) {
  if (typeof value !== 'string' || !/^[a-f0-9]{24}$/i.test(value)) throw new ApiError(400, `${field} must be a valid identifier.`);
  return new mongoose.Types.ObjectId(value);
}
function evenGroups(guides, capacity, spotsLeft) {
  const base = Math.floor(capacity / guides.length), rem = capacity % guides.length;
  const baseLeft = Math.floor(spotsLeft / guides.length), remLeft = spotsLeft % guides.length;
  return guides.map((guide, i) => ({ guide, capacity: base + (i < rem ? 1 : 0), spotsLeft: baseLeft + (i < remLeft ? 1 : 0) }));
}

export const createRequest = asyncHandler(async (req, res) => {
  const input = body(req.body);
  const type = input.type;
  if (!GUIDE_REQUEST_TYPES.includes(type)) throw new ApiError(400, 'Request type is invalid.');
  const message = typeof input.message === 'string' ? input.message.trim() : '';
  if (message.length < 10 || message.length > 2000) throw new ApiError(400, 'Add a message of 10-2000 characters.');
  const data = await transaction(async session => {
    const guide = await Guide.findOne({ user: req.user._id, status: 'approved', isActive: { $ne: false } }).session(session);
    if (!guide) throw new ApiError(403, 'Only approved, active guides can submit requests.');
    const doc = { guide: guide._id, type, message, status: 'pending' };
    if (type === 'tour_assignment') {
      doc.tour = objectId(input.tourId, 'tourId');
      const tour = await Tour.findById(doc.tour).session(session);
      if (!tour || tour.archived) throw new ApiError(404, 'Tour not found.');
      if (tour.assignedGuides.some(g => String(g) === String(guide._id))) throw new ApiError(409, 'You are already assigned to this tour.');
    }
    if (type === 'destination_assignment') {
      doc.destination = objectId(input.destinationId, 'destinationId');
      if (!await Destination.exists({ _id: doc.destination }).session(session)) throw new ApiError(404, 'Destination not found.');
    }
    if (type === 'time_off' && input.blockedDates !== undefined) {
      if (!Array.isArray(input.blockedDates) || input.blockedDates.length > 60) throw new ApiError(400, 'Provide up to 60 blocked dates.');
      doc.message = `${message}\nRequested dates: ${input.blockedDates.join(', ')}`;
    }
    const duplicate = await GuideRequest.exists({ guide: guide._id, type, status: 'pending', tour: doc.tour || null, destination: doc.destination || null }).session(session);
    if (duplicate) throw new ApiError(409, 'You already have a pending request for this item.');
    const [created] = await GuideRequest.create([doc], { session });
    await audit(req.user._id, 'guide_request_create', 'GuideRequest', created._id, { type }, session);
    return created;
  });
  res.status(201).json({ data, message: 'Request submitted.' });
});

export const myRequests = asyncHandler(async (req, res) => {
  const { page, limit } = pagination(req.query);
  const guide = await Guide.findOne({ user: req.user._id }).select('_id').lean();
  if (!guide) return pageResult(res, [], 0, page, limit);
  const filter = { guide: guide._id };
  if (req.query.status && GUIDE_REQUEST_STATUSES.includes(req.query.status)) filter.status = req.query.status;
  const [data, total] = await Promise.all([
    GuideRequest.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
      .populate('tour', 'title').populate('destination', 'name').lean(),
    GuideRequest.countDocuments(filter)
  ]);
  pageResult(res, data, total, page, limit);
});

export const cancelRequest = asyncHandler(async (req, res) => {
  const data = await transaction(async session => {
    const guide = await Guide.findOne({ user: req.user._id }).select('_id').session(session);
    if (!guide) throw new ApiError(404, 'Guide profile not found.');
    const request = await GuideRequest.findOne({ _id: req.params.id, guide: guide._id }).session(session);
    if (!request) throw new ApiError(404, 'Request not found.');
    if (request.status !== 'pending') throw new ApiError(409, 'Only pending requests can be cancelled.');
    request.status = 'cancelled'; await request.save({ session });
    await audit(req.user._id, 'guide_request_cancel', 'GuideRequest', request._id, {}, session);
    return request;
  });
  res.json({ data, message: 'Request cancelled.' });
});

export const listRequests = asyncHandler(async (req, res) => {
  const { page, limit } = pagination(req.query);
  const filter = {};
  if (req.query.status && GUIDE_REQUEST_STATUSES.includes(req.query.status)) filter.status = req.query.status;
  if (req.query.type && GUIDE_REQUEST_TYPES.includes(req.query.type)) filter.type = req.query.type;
  if (req.query.guide && /^[a-f0-9]{24}$/i.test(req.query.guide)) filter.guide = req.query.guide;
  const [data, total] = await Promise.all([
    GuideRequest.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
      .populate({ path: 'guide', populate: { path: 'user', select: 'name email' } })
      .populate('tour', 'title').populate('destination', 'name').lean(),
    GuideRequest.countDocuments(filter)
  ]);
  pageResult(res, data, total, page, limit);
});

export const decideRequest = asyncHandler(async (req, res) => {
  const input = body(req.body);
  const approve = req.path.endsWith('/approve');
  const note = approve ? (typeof input.note === 'string' ? input.note.trim().slice(0, 1000) : '') : (() => {
    const value = typeof input.reason === 'string' ? input.reason.trim() : '';
    if (value.length < 5 || value.length > 1000) throw new ApiError(400, 'A rejection reason of 5-1000 characters is required.');
    return value;
  })();
  const data = await transaction(async session => {
    const request = await GuideRequest.findById(req.params.id).session(session);
    if (!request) throw new ApiError(404, 'Request not found.');
    if (request.status !== 'pending') throw new ApiError(409, 'This request has already been decided.');
    const guide = await Guide.findById(request.guide).session(session);
    if (!guide || guide.status !== 'approved' || guide.isActive === false) throw new ApiError(409, 'The guide must be approved and active.');
    if (approve) {
      if (request.type === 'tour_assignment') {
        const tour = await Tour.findById(request.tour).session(session);
        if (!tour || tour.archived) throw new ApiError(404, 'Tour not found.');
        if (tour.assignedGuides.some(g => String(g) === String(guide._id))) throw new ApiError(409, 'Guide is already assigned.');
        tour.assignedGuides.push(guide._id);
        if (!tour.guide) tour.guide = guide._id;
        for (const departure of tour.departures) {
          if (+departure.date <= Date.now()) continue;
          departure.guideGroups = evenGroups(tour.assignedGuides, departure.capacity, departure.spotsLeft);
        }
        await tour.save({ session });
        await audit(req.user._id, 'tour_guides_assign', 'Tour', tour._id, { guideId: guide._id, source: 'guide_request' }, session);
      }
      if (request.type === 'destination_assignment') {
        if (!guide.coveredDestinations.some(d => String(d) === String(request.destination))) {
          guide.coveredDestinations.push(request.destination); await guide.save({ session });
        }
      }
      if (request.type === 'time_off') {
        const dates = (request.message.match(/\d{4}-\d{2}-\d{2}/g) || []).map(value => new Date(`${value}T00:00:00.000Z`)).filter(value => !Number.isNaN(+value));
        guide.blockedDates = [...new Set([...guide.blockedDates.map(value => value.toISOString().slice(0, 10)), ...dates.map(value => value.toISOString().slice(0, 10))])].map(value => new Date(`${value}T00:00:00.000Z`));
        await guide.save({ session });
      }
    }
    request.status = approve ? 'approved' : 'rejected';
    request.decisionNote = note; request.decidedBy = req.user._id; request.decidedAt = new Date();
    await request.save({ session });
    await audit(req.user._id, approve ? 'guide_request_approve' : 'guide_request_reject', 'GuideRequest', request._id, { note }, session);
    return request;
  });
  res.json({ data, message: approve ? 'Request approved.' : 'Request rejected.' });
});
