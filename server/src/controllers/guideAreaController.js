import mongoose from 'mongoose';
import Guide from '../models/Guide.js';
import Tour from '../models/Tour.js';
import Booking from '../models/Booking.js';
import Review from '../models/Review.js';
import Destination from '../models/Destination.js';
import { ApiError, asyncHandler } from '../middleware/errors.js';
import { pagination, validateId, enumValue } from '../middleware/validate.js';
import { pageResult } from '../services/management.js';
import { calculatePerformance, rankingForGuide } from '../services/guidePerformance.js';

function dateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new ApiError(400, 'Provide a date in YYYY-MM-DD format.');
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(+date)) throw new ApiError(400, 'Provide a valid date.');
  return date;
}

async function currentGuide(req) {
  const guide = await Guide.findOne({ user: req.user._id }).populate('coveredDestinations', 'name region image').lean();
  if (!guide) throw new ApiError(404, 'Guide profile not found.');
  return guide;
}

export const overview = asyncHandler(async (req, res) => {
  const guide = await currentGuide(req);
  const guideId = guide._id;
  const tours = await Tour.find({ assignedGuides: guideId }).populate('destination', 'name').lean();
  const tourIds = tours.map(tour => tour._id);
  const now = new Date();
  const upcoming = tours.flatMap(tour => tour.departures
    .filter(departure => new Date(departure.date) >= now && (tour.archived !== true))
    .map(departure => {
      const group = departure.guideGroups.find(item => String(item.guide) === String(guideId));
      return {
        tourId: String(tour._id), title: tour.title, destination: tour.destination?.name || '',
        departureId: String(departure._id), date: departure.date, capacity: departure.capacity,
        spotsLeft: departure.spotsLeft, groupCapacity: group?.capacity ?? 0, groupSpotsLeft: group?.spotsLeft ?? 0
      };
    }).sort((a, b) => new Date(a.date) - new Date(b.date))).slice(0, 8);
  const [statusCounts, monthly, ratingTrend, performance, ranks] = await Promise.all([
    Booking.aggregate([{ $match: { guide: guideId } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Booking.aggregate([
      { $match: { guide: guideId, createdAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, bookings: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]),
    Review.aggregate([
      { $lookup: { from: 'tours', localField: 'tour', foreignField: '_id', as: 'tour' } },
      { $unwind: '$tour' },
      { $match: { 'tour.assignedGuides': guideId } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, rating: { $avg: '$rating' }, reviews: { $sum: 1 } } },
      { $sort: { _id: 1 } }, { $limit: 12 }
    ]),
    calculatePerformance(guideId),
    rankingForGuide(guideId)
  ]);
  const counts = Object.fromEntries(statusCounts.map(row => [row._id, row.count]));
  res.json({ data: {
    guide: { id: String(guide._id), status: guide.status, rejectionReason: guide.rejectionReason, name: req.user.name, image: guide.image, rating: guide.rating, reviewCount: guide.reviewCount },
    kpis: {
      pendingRequests: counts.pending || 0,
      upcomingTours: upcoming.length,
      completedTours: counts.completed || 0,
      rating: guide.rating || 0,
      rank: ranks.rank,
      tier: performance?.tier || 'New',
      score: performance?.score || 0
    },
    upcomingDepartures: upcoming,
    bookingsPerMonth: monthly,
    ratingTrend,
    activity: [
      ...statusCounts.map(row => ({ at: new Date(), type: `bookings_${row._id}`, text: `${row.count} ${row._id} booking(s) assigned to you.` })),
      ...upcoming.slice(0, 5).map(item => ({ at: item.date, type: 'upcoming_departure', text: `${item.title} departs with ${item.groupCapacity} guest capacity in your group.` }))
    ].slice(0, 10)
  } });
});

export const schedule = asyncHandler(async (req, res) => {
  const guide = await currentGuide(req);
  const tours = await Tour.find({ assignedGuides: guide._id, archived: { $ne: true } }).populate('destination', 'name').lean();
  const now = new Date();
  const upcomingGroups = tours.flatMap(tour => tour.departures
    .filter(departure => new Date(departure.date) >= now)
    .map(departure => {
      const group = departure.guideGroups.find(item => String(item.guide) === String(guide._id));
      return {
        tourId: String(tour._id), title: tour.title, destination: tour.destination?.name || '',
        departureId: String(departure._id), date: departure.date, capacity: departure.capacity,
        spotsLeft: departure.spotsLeft, groupCapacity: group?.capacity ?? 0, groupSpotsLeft: group?.spotsLeft ?? 0
      };
    })).sort((a, b) => new Date(a.date) - new Date(b.date));
  res.json({ data: {
    assignedTours: tours.map(tour => ({ _id: String(tour._id), title: tour.title, destination: tour.destination?.name || '', status: tour.status, departures: tour.departures.length })),
    assignedDestinations: guide.coveredDestinations || [],
    upcomingGroups,
    blockedDates: (guide.blockedDates || []).map(value => new Date(value).toISOString().slice(0, 10))
  } });
});

export const addBlockedDate = asyncHandler(async (req, res) => {
  const date = dateOnly(req.body?.date);
  const guide = await Guide.findOne({ user: req.user._id });
  if (!guide) throw new ApiError(404, 'Guide profile not found.');
  const tours = await Tour.find({ assignedGuides: guide._id }).select('_id').lean();
  const conflict = await Booking.exists({ guide: guide._id, status: 'confirmed', departureDate: { $gte: date, $lt: new Date(date.getTime() + 86400000) } });
  if (conflict) throw new ApiError(409, 'This date has a confirmed booking and cannot be blocked.');
  const key = date.toISOString().slice(0, 10);
  if (!guide.blockedDates.some(value => new Date(value).toISOString().slice(0, 10) === key)) {
    guide.blockedDates.push(date);
    await guide.save();
  }
  res.json({ data: { blockedDates: guide.blockedDates.map(value => new Date(value).toISOString().slice(0, 10)) }, message: 'Date blocked.' });
});

export const removeBlockedDate = asyncHandler(async (req, res) => {
  const date = dateOnly(req.body?.date);
  const guide = await Guide.findOne({ user: req.user._id });
  if (!guide) throw new ApiError(404, 'Guide profile not found.');
  const key = date.toISOString().slice(0, 10);
  guide.blockedDates = guide.blockedDates.filter(value => new Date(value).toISOString().slice(0, 10) !== key);
  await guide.save();
  res.json({ data: { blockedDates: guide.blockedDates.map(value => new Date(value).toISOString().slice(0, 10)) }, message: 'Date unblocked.' });
});

export const feedback = asyncHandler(async (req, res) => {
  await currentGuide(req);
  // Review is currently tour-scoped and has no guide reference or public guide reply.
  // Return an explicit unsupported empty state rather than inventing data.
  res.json({ data: { supported: false, items: [], average: null, distribution: [0, 0, 0, 0, 0] } });
});

export const myPerformance = asyncHandler(async (req, res) => {
  const guide = await currentGuide(req);
  const [performance, ranks] = await Promise.all([calculatePerformance(guide._id), rankingForGuide(guide._id)]);
  res.json({ data: { ...performance, rank: ranks.rank, destinationRanks: ranks.destinationRanks } });
});

export const publicPerformance = asyncHandler(async (req, res) => {
  validateId(req, {}, () => {});
  const performance = await calculatePerformance(req.params.id);
  if (!performance) throw new ApiError(404, 'Guide not found.');
  const ranks = await rankingForGuide(req.params.id);
  res.json({ data: { ...performance, rank: ranks.rank, destinationRanks: ranks.destinationRanks } });
});

export const ranking = asyncHandler(async (req, res) => {
  const { page, limit } = pagination(req.query);
  const destinationId = enumValue(req.query.destination && /^[a-f0-9]{24}$/i.test(req.query.destination) ? req.query.destination : '', [''], 'destination');
  const result = await ranking({ destinationId: destinationId || undefined, limit: 200 });
  const rows = result.rows.slice((page - 1) * limit, page * limit);
  pageResult(res, rows, result.rows.length, page, limit);
});
