import Booking from '../models/Booking.js';
import Tour from '../models/Tour.js';
import Guide from '../models/Guide.js';
import Review from '../models/Review.js';
import GuideRequest from '../models/GuideRequest.js';
import AuditLog from '../models/AuditLog.js';
import { ApiError, asyncHandler } from '../middleware/errors.js';

function range(query) {
  const preset = query.range || '30';
  const now = new Date();
  let start = new Date(now);
  if (preset === '7') start.setDate(now.getDate() - 7);
  else if (preset === '30') start.setDate(now.getDate() - 30);
  else if (preset === '90') start.setDate(now.getDate() - 90);
  else if (preset === 'custom') {
    start = new Date(query.from);
    const end = new Date(query.to);
    if (Number.isNaN(+start) || Number.isNaN(+end) || +start > +end) throw new ApiError(400, 'Provide a valid custom date range.');
    return { start, end, previousStart: new Date(start.getTime() - (+end - +start)), previousEnd: start };
  } else throw new ApiError(400, 'Range must be 7, 30, 90 or custom.');
  const previousEnd = start, previousStart = new Date(start);
  previousStart.setTime(previousStart.getTime() - (+now - +start));
  return { start, end: now, previousStart, previousEnd };
}
const count = async (model, filter) => model.countDocuments(filter);
const change = (current, previous) => previous === 0 ? (current > 0 ? 100 : 0) : Math.round(((current - previous) / previous) * 1000) / 10;

export const overview = asyncHandler(async (req, res) => {
  const { start, end, previousStart, previousEnd } = range(req.query);
  const currentBooking = { createdAt: { $gte: start, $lte: end } };
  const previousBooking = { createdAt: { $gte: previousStart, $lt: previousEnd } };
  const [pendingGuides, pendingRequests, activeTours, approvedGuides, completedRevenue, avgRating, bookings, statuses, monthly, topTours, destinations, workload, attention] = await Promise.all([
    count(Guide, { status: 'pending', isActive: { $ne: false } }),
    count(GuideRequest, { status: 'pending' }),
    count(Tour, { archived: { $ne: true }, status: { $ne: 'archived' } }),
    count(Guide, { status: 'approved', isActive: { $ne: false } }),
    Booking.aggregate([{ $match: { ...currentBooking, status: 'completed' } }, { $group: { _id: null, amount: { $sum: '$totalPrice' } } }]),
    Review.aggregate([{ $group: { _id: null, value: { $avg: '$rating' }, count: { $sum: 1 } } }]),
    Booking.aggregate([
      { $match: currentBooking },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]),
    Booking.aggregate([{ $match: currentBooking }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Booking.aggregate([
      { $match: currentBooking },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, revenue: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$totalPrice', 0] } } } },
      { $sort: { _id: 1 } }
    ]),
    Booking.aggregate([
      { $match: currentBooking },
      { $group: { _id: '$tour', bookings: { $sum: 1 }, revenue: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$totalPrice', 0] } } } },
      { $sort: { bookings: -1 } }, { $limit: 8 },
      { $lookup: { from: 'tours', localField: '_id', foreignField: '_id', as: 'tour' } },
      { $project: { bookings: 1, revenue: 1, title: { $ifNull: [{ $arrayElemAt: ['$tour.title', 0] }, 'Removed tour'] } } }
    ]),
    Booking.aggregate([
      { $match: currentBooking },
      { $lookup: { from: 'tours', localField: 'tour', foreignField: '_id', as: 'tour' } },
      { $unwind: '$tour' },
      { $lookup: { from: 'destinations', localField: 'tour.destination', foreignField: '_id', as: 'destination' } },
      { $group: { _id: '$tour.destination', bookings: { $sum: 1 }, name: { $first: { $ifNull: [{ $arrayElemAt: ['$destination.name', 0] }, 'Unknown destination'] } } } },
      { $sort: { bookings: -1 } }, { $limit: 8 }
    ]),
    Booking.aggregate([
      { $match: currentBooking },
      { $group: { _id: '$guide', bookings: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }, cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } } } },
      { $sort: { bookings: -1 } }, { $limit: 8 },
      { $lookup: { from: 'guides', localField: '_id', foreignField: '_id', as: 'guide' } },
      { $lookup: { from: 'users', localField: 'guide.user', foreignField: '_id', as: 'user' } },
      { $project: { bookings: 1, completed: 1, cancelled: 1, name: { $ifNull: [{ $arrayElemAt: ['$user.name', 0] }, 'Unknown guide'] } } }
    ]),
    Promise.all([
      count(Tour, { archived: { $ne: true }, assignedGuides: { $size: 0 } }),
      count(Tour, { archived: { $ne: true }, departures: { $size: 0 } }),
      count(Review, { hidden: true }),
      count(Guide, { status: 'approved', isActive: { $ne: false }, assignedTours: { $size: 0 } })
    ])
  ]);
  const [prevPendingGuides, prevRequests, prevActiveTours, prevApproved, prevRevenue, prevBookings] = await Promise.all([
    count(Guide, { status: 'pending', isActive: { $ne: false }, createdAt: { $gte: previousStart, $lt: previousEnd } }),
    count(GuideRequest, { status: 'pending', createdAt: { $gte: previousStart, $lt: previousEnd } }),
    count(Tour, { archived: { $ne: true }, createdAt: { $gte: previousStart, $lt: previousEnd } }),
    count(Guide, { status: 'approved', isActive: { $ne: false }, approvedAt: { $gte: previousStart, $lt: previousEnd } }),
    Booking.aggregate([{ $match: { ...previousBooking, status: 'completed' } }, { $group: { _id: null, amount: { $sum: '$totalPrice' } } }]),
    count(Booking, previousBooking)
  ]);
  const statusMap = Object.fromEntries(['pending', 'confirmed', 'declined', 'cancelled', 'completed'].map(value => [value, statuses.find(row => row._id === value)?.count || 0]));
  const currentBookings = bookings.reduce((sum, row) => sum + row.count, 0);
  res.json({ data: {
    range: { start, end },
    kpis: {
      pendingGuideApprovals: { value: pendingGuides, change: change(pendingGuides, prevPendingGuides) },
      pendingGuideRequests: { value: pendingRequests, change: change(pendingRequests, prevRequests) },
      bookings: { value: currentBookings, change: change(currentBookings, prevBookings), byStatus: statusMap },
      activeTours: { value: activeTours, change: change(activeTours, prevActiveTours) },
      approvedGuides: { value: approvedGuides, change: change(approvedGuides, prevApproved) },
      revenueEstimate: { value: completedRevenue[0]?.amount || 0, change: change(completedRevenue[0]?.amount || 0, prevRevenue[0]?.amount || 0), label: 'Completed bookings only; estimate' },
      averageRating: avgRating[0] ? { value: Math.round(avgRating[0].value * 10) / 10, reviewCount: avgRating[0].count } : { value: null, reviewCount: 0 }
    },
    bookingsOverTime: bookings,
    bookingsByStatus: statusMap,
    revenueByMonth: monthly,
    topTours, bookingsByDestination: destinations, guideWorkload: workload,
    needsAttention: {
      toursWithoutGuides: attention[0], toursWithoutFutureDepartures: attention[1],
      hiddenReviews: attention[2], guidesWithoutAssignments: attention[3],
      pendingGuideApprovals: pendingGuides, pendingGuideRequests: pendingRequests
    }
  } });
});

export const activity = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.type) filter.action = req.query.type;
  const [bookings, requests, guides, audits] = await Promise.all([
    Booking.find(filter.createdAt ? {} : {}).sort({ createdAt: -1 }).limit(20).populate('user', 'name').populate('tour', 'title').lean(),
    GuideRequest.find(filter.status ? { status: filter.status } : {}).sort({ createdAt: -1 }).limit(20).populate('guide').populate('tour', 'title').lean(),
    Guide.find({}).sort({ createdAt: -1 }).limit(20).populate('user', 'name').lean(),
    AuditLog.find(filter).sort({ createdAt: -1 }).limit(20).populate('actor', 'name').lean()
  ]);
  const feed = [
    ...bookings.map(item => ({ at: item.createdAt, type: `booking_${item.status}`, text: `${item.user?.name || 'A traveler'} booked ${item.tour?.title || 'a tour'}.` })),
    ...requests.map(item => ({ at: item.createdAt, type: `guide_request_${item.status}`, text: `${item.guide?.user?.name || 'A guide'} submitted a ${item.type} request.` })),
    ...guides.map(item => ({ at: item.createdAt, type: 'guide_registration', text: `${item.user?.name || 'A guide'} registered.` })),
    ...audits.map(item => ({ at: item.createdAt, type: `admin_${item.action}`, text: `${item.actor?.name || 'An admin'} performed ${item.action}.` }))
  ].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 50);
  res.json({ data: feed });
});
