import Guide from '../models/Guide.js';
import Booking from '../models/Booking.js';
import GuideRequest from '../models/GuideRequest.js';
import Tour from '../models/Tour.js';

// Guzoye guide performance model
// Base weights: rating 40, completion 20, request acceptance 15,
// response time 10, low cancellation/decline 10, completed-tour experience 5.
// If a guide has no reviews, the 40-point rating weight is redistributed
// proportionally across the other measured components.
export const PERFORMANCE_WEIGHTS = {
  rating: 40,
  completion: 20,
  acceptance: 15,
  response: 10,
  reliability: 10,
  experience: 5
};
export const MINIMUM_REVIEWS = 1;
export const MINIMUM_COMPLETED_TOURS = 3;
export const MINIMUM_REQUESTS = 3;
const BAYES_PRIOR_REVIEWS = 5;
const BAYES_PRIOR_RATING = 3.8;
const RESPONSE_TARGET_HOURS = 2;
const RESPONSE_ZERO_HOURS = 72;
const EXPERIENCE_TARGET_TOURS = 20;

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const round1 = value => Math.round(value * 10) / 10;

function tierFor(score, ranked) {
  if (!ranked) return 'New';
  if (score >= 85) return 'Top rated';
  if (score >= 70) return 'Trusted';
  return 'Rising';
}

function responseScore(hours) {
  if (hours === null || Number.isNaN(hours)) return 0;
  if (hours <= RESPONSE_TARGET_HOURS) return 100;
  const span = RESPONSE_ZERO_HOURS - RESPONSE_TARGET_HOURS;
  return clamp(100 - ((hours - RESPONSE_TARGET_HOURS) / span) * 100);
}

export async function calculatePerformance(guideId) {
  const guide = await Guide.findById(guideId).select('rating reviewCount yearsExperience status isActive coveredDestinations').lean();
  if (!guide) return null;
  const [bookingStats, requestStats] = await Promise.all([
    Booking.aggregate([
      { $match: { guide: guide._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    GuideRequest.aggregate([
      { $match: { guide: guide._id, status: { $in: ['approved', 'rejected'] } } },
      { $project: { status: 1, responseHours: { $divide: [{ $subtract: ['$decidedAt', '$createdAt'] }, 3600000] } } },
      { $group: { _id: '$status', count: { $sum: 1 }, avgResponseHours: { $avg: '$responseHours' } } }
    ])
  ]);
  const bookings = Object.fromEntries(bookingStats.map(row => [row._id, row.count]));
  const requests = Object.fromEntries(requestStats.map(row => [row._id, row.count]));
  const pending = await Booking.countDocuments({ guide: guide._id, status: 'pending' });
  const completed = bookings.completed || 0;
  const declined = bookings.declined || 0;
  const cancelled = bookings.cancelled || 0;
  const decidedBookings = completed + declined + cancelled;
  const approvedRequests = requests.approved || 0;
  const rejectedRequests = requests.rejected || 0;
  const decidedRequests = approvedRequests + rejectedRequests;
  const avgResponseHours = requestStats.reduce((sum, row) => sum + (row.avgResponseHours || 0) * row.count, 0) / Math.max(decidedRequests, 1);

  const bayesianRating = guide.reviewCount > 0
    ? (BAYES_PRIOR_RATING * BAYES_PRIOR_REVIEWS + guide.rating * guide.reviewCount) / (BAYES_PRIOR_REVIEWS + guide.reviewCount)
    : null;
  const hasReviews = guide.reviewCount >= MINIMUM_REVIEWS;
  const components = {
    rating: hasReviews ? (bayesianRating / 5) * 100 : null,
    completion: decidedBookings ? (completed / decidedBookings) * 100 : null,
    acceptance: decidedRequests ? (approvedRequests / decidedRequests) * 100 : null,
    response: decidedRequests ? responseScore(avgResponseHours) : null,
    reliability: decidedBookings ? (1 - (cancelled + declined) / decidedBookings) * 100 : null,
    experience: clamp((completed / EXPERIENCE_TARGET_TOURS) * 100)
  };
  const measured = Object.entries(components).filter(([, value]) => value !== null);
  const availableWeight = measured.reduce((sum, [key]) => sum + PERFORMANCE_WEIGHTS[key], 0);
  const rawScore = measured.reduce((sum, [key, value]) => sum + (value * PERFORMANCE_WEIGHTS[key]) / availableWeight, 0);
  const score = round1(clamp(rawScore));
  const ranked = guide.status === 'approved' && guide.isActive !== false && (
    guide.reviewCount >= MINIMUM_REVIEWS ||
    completed >= MINIMUM_COMPLETED_TOURS ||
    decidedRequests >= MINIMUM_REQUESTS
  );
  return {
    guideId: String(guide._id),
    score,
    ranked,
    tier: tierFor(score, ranked),
    rank: null,
    destinationRanks: [],
    metrics: {
      rating: guide.rating || 0,
      reviewCount: guide.reviewCount || 0,
      bayesianRating: bayesianRating === null ? null : round1(bayesianRating),
      completedTours: completed,
      pendingBookings: pending,
      declinedBookings: declined,
      cancelledBookings: cancelled,
      approvedRequests,
      rejectedRequests,
      averageResponseHours: decidedRequests ? round1(avgResponseHours) : null,
      yearsExperience: guide.yearsExperience || 0
    },
    breakdown: Object.fromEntries(Object.entries(components).map(([key, value]) => [key, {
      weight: PERFORMANCE_WEIGHTS[key],
      value: value === null ? null : round1(value),
      contribution: value === null ? 0 : round1((value * PERFORMANCE_WEIGHTS[key]) / availableWeight)
    }])),
    minimumActivity: {
      reviews: MINIMUM_REVIEWS,
      completedTours: MINIMUM_COMPLETED_TOURS,
      decidedRequests: MINIMUM_REQUESTS
    },
    formula: {
      rating: 'Bayesian average: (3.8 * 5 + guide.rating * reviewCount) / (5 + reviewCount), scaled to 100; weight 40.',
      completion: 'completed / (completed + declined + cancelled) * 100; weight 20.',
      acceptance: 'approved guide requests / (approved + rejected guide requests) * 100; weight 15.',
      response: '100 at 2 hours or less, linearly to 0 at 72 hours; weight 10.',
      reliability: '(1 - (cancelled + declined bookings) / decided bookings) * 100; weight 10.',
      experience: 'min(completed tours / 20, 1) * 100; weight 5.',
      redistribution: 'Missing components are excluded and their weights are redistributed proportionally.'
    }
  };
}

export async function ranking({ destinationId, limit = 50 } = {}) {
  const filter = { status: 'approved', isActive: { $ne: false } };
  if (destinationId) filter.coveredDestinations = destinationId;
  const guides = await Guide.find(filter).select('_id rating reviewCount yearsExperience coveredDestinations').limit(Math.min(Number(limit) || 50, 200)).lean();
  const scored = await Promise.all(guides.map(async guide => {
    const performance = await calculatePerformance(guide._id);
    return { guide: String(guide._id), ...performance };
  }));
  scored.sort((a, b) => Number(b.ranked) - Number(a.ranked) || b.score - a.score || b.metrics.completedTours - a.metrics.completedTours);
  const rankedRows = scored.filter(row => row.ranked);
  rankedRows.forEach((row, index) => { row.rank = index + 1; });
  const byDestination = new Map();
  for (const row of scored) {
    for (const destination of row.destinationRanks || []) byDestination.set(destination.destinationId, destination);
  }
  return { rows: scored, overallCount: rankedRows.length };
}

export async function rankingForGuide(guideId) {
  const guide = await Guide.findById(guideId).select('coveredDestinations').populate('coveredDestinations', 'name').lean();
  if (!guide) return { rank: null, destinationRanks: [] };
  const all = await ranking({ limit: 200 });
  const mine = all.rows.find(row => row.guide === String(guideId));
  const destinationRanks = [];
  for (const destination of guide.coveredDestinations || []) {
    const scoped = await ranking({ destinationId: destination._id, limit: 200 });
    const position = scoped.rows.filter(row => row.ranked).findIndex(row => row.guide === String(guideId)) + 1;
    destinationRanks.push({ destinationId: String(destination._id), name: destination.name, rank: position || null });
  }
  return { rank: mine?.rank || null, destinationRanks };
}
