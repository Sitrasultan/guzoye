import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import Wishlist from '../models/Wishlist.js';
import TravelerReview from '../models/TravelerReview.js';
import Tour from '../models/Tour.js';
import Guide from '../models/Guide.js';
import User from '../models/User.js';
import { ApiError, asyncHandler } from '../middleware/errors.js';
import { pagination, validateId } from '../middleware/validate.js';
import { pageResult } from '../services/management.js';

function ratingFields(body) {
  const number = (value, name) => {
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 5) throw new ApiError(400, `${name} must be an integer from 1 to 5.`);
    return parsed;
  };
  return {
    tourRating: number(body.tourRating, 'Tour rating'),
    tourComment: String(body.tourComment || '').trim().slice(0, 2000),
    guideRating: number(body.guideRating, 'Guide rating'),
    guideComment: String(body.guideComment || '').trim().slice(0, 2000),
    guideSubRatings: {
      knowledge: number(body.guideSubRatings?.knowledge, 'Guide knowledge'),
      communication: number(body.guideSubRatings?.communication, 'Guide communication'),
      punctuality: number(body.guideSubRatings?.punctuality, 'Guide punctuality'),
      friendliness: number(body.guideSubRatings?.friendliness, 'Guide friendliness')
    }
  };
}
async function refreshGuideRating(guideId, session) {
  const [stats] = await TravelerReview.aggregate([
    { $match: { guide: guideId, hidden: false } },
    { $group: { _id: '$guide', rating: { $avg: '$guideRating' }, count: { $sum: 1 } } }
  ]).session(session);
  await Guide.updateOne({ _id: guideId }, { $set: { rating: stats?.rating || 0, reviewCount: stats?.count || 0 } }, { session });
}
async function refreshTourRating(tourId, session) {
  const [stats] = await TravelerReview.aggregate([
    { $match: { tour: tourId, hidden: false } },
    { $group: { _id: '$tour', rating: { $avg: '$tourRating' }, count: { $sum: 1 } } }
  ]).session(session);
  await Tour.updateOne({ _id: tourId }, { $set: { rating: stats?.rating || 0, reviewCount: stats?.count || 0 } }, { session });
}
export const overview = asyncHandler(async (req, res) => {
  const now = new Date();
  const bookings = await Booking.find({ user: req.user._id }).sort({ departureDate: 1 }).populate('tour', 'title images').populate('guide', 'image rating').populate({ path: 'guide', populate: { path: 'user', select: 'name' } }).lean();
  const saved = await Wishlist.countDocuments({ user: req.user._id });
  const upcoming = bookings.filter(booking => ['pending', 'confirmed'].includes(booking.status) && new Date(booking.departureDate) >= now);
  const past = bookings.filter(booking => booking.status === 'completed' || (['pending', 'confirmed'].includes(booking.status) && new Date(booking.departureDate) < now));
  const cancelled = bookings.filter(booking => ['cancelled', 'declined'].includes(booking.status));
  const next = upcoming[0];
  res.json({ data: {
    nextTrip: next ? { ...next, countdownDays: Math.max(0, Math.ceil((new Date(next.departureDate) - now) / 86400000)) } : null,
    kpis: { upcoming: upcoming.length, completed: bookings.filter(booking => booking.status === 'completed').length, saved },
    trips: { upcoming, past, cancelled },
    activity: bookings.slice(0, 8).map(booking => ({ at: booking.createdAt, text: `${booking.reference}: ${booking.tour?.title || 'Tour'} is ${booking.status}.` }))
  } });
});
export const profile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('name email image profile').lean();
  res.json({ data: { ...(user.profile || {}), theme: user.profile?.theme || 'system', emergencyContact: user.profile?.emergencyContact || {}, notifications: user.profile?.notifications || { email: true, marketing: false } } });
});
export const updateProfile = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const profile = {
    country: String(body.country || '').slice(0, 80),
    bio: String(body.bio || '').slice(0, 2000),
    languages: Array.isArray(body.languages) ? body.languages.slice(0, 20).map(value => String(value).slice(0, 40)) : [],
    interests: Array.isArray(body.interests) ? body.interests.slice(0, 20).map(value => String(value).slice(0, 40)) : [],
    travelStyle: String(body.travelStyle || '').slice(0, 120),
    emergencyContact: { name: String(body.emergencyContact?.name || '').slice(0, 100), phone: String(body.emergencyContact?.phone || '').slice(0, 40) },
    notifications: { email: body.notifications?.email !== false, marketing: body.notifications?.marketing === true }
  };
  if (['light', 'dark', 'system'].includes(body.theme)) profile.theme = body.theme;
  const user = await User.findByIdAndUpdate(req.user._id, { $set: { profile }, ...(body.name ? { name: String(body.name).trim().slice(0, 100) } : {}) }, { new: true, runValidators: true });
  res.json({ data: user, message: 'Profile saved.' });
});
export const wishlist = asyncHandler(async (req, res) => {
  const rows = await Wishlist.find({ user: req.user._id }).sort({ createdAt: -1 }).populate({ path: 'tour', match: { archived: { $ne: true } }, populate: 'destination' }).lean();
  res.json({ data: rows.filter(row => row.tour) });
});
export const addWishlist = asyncHandler(async (req, res) => {
  validateId(req, {}, () => {});
  const tourId = req.body.tourId;
  if (!/^[a-f0-9]{24}$/i.test(String(tourId || ''))) throw new ApiError(400, 'Invalid tour identifier.');
  if (!await Tour.exists({ _id: tourId, archived: { $ne: true } })) throw new ApiError(404, 'Tour not found.');
  await Wishlist.updateOne({ user: req.user._id, tour: tourId }, { $setOnInsert: { user: req.user._id, tour: tourId } }, { upsert: true });
  res.status(201).json({ message: 'Tour saved to your wishlist.' });
});
export const removeWishlist = asyncHandler(async (req, res) => {
  const tourId = req.body.tourId;
  if (!/^[a-f0-9]{24}$/i.test(String(tourId || ''))) throw new ApiError(400, 'Invalid tour identifier.');
  await Wishlist.deleteOne({ user: req.user._id, tour: tourId });
  res.json({ message: 'Tour removed from your wishlist.' });
});
export const reviews = asyncHandler(async (req, res) => {
  const rows = await TravelerReview.find({ user: req.user._id }).sort({ createdAt: -1 }).populate('tour', 'title').lean();
  res.json({ data: rows });
});
export const createReview = asyncHandler(async (req, res) => {
  const bookingId = req.body.bookingId;
  if (!/^[a-f0-9]{24}$/i.test(String(bookingId || ''))) throw new ApiError(400, 'Invalid booking identifier.');
  const booking = await Booking.findOne({ _id: bookingId, user: req.user._id, status: 'completed' });
  if (!booking) throw new ApiError(403, 'You can review only your completed bookings.');
  const data = await mongoose.connection.transaction(async session => {
    const [review] = await TravelerReview.create([{ booking: booking._id, user: req.user._id, tour: booking.tour, guide: booking.guide, ...ratingFields(req.body) }], { session });
    await refreshGuideRating(booking.guide, session);
    await refreshTourRating(booking.tour, session);
    return review;
  });
  res.status(201).json({ data, message: 'Thank you for sharing your experience.' });
});
export const updateReview = asyncHandler(async (req, res) => {
  const review = await TravelerReview.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, ratingFields(req.body), { new: true, runValidators: true });
  if (!review) throw new ApiError(404, 'Review not found.');
  await refreshGuideRating(review.guide); await refreshTourRating(review.tour);
  res.json({ data: review, message: 'Review updated.' });
});
export const deleteReview = asyncHandler(async (req, res) => {
  const review = await TravelerReview.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!review) throw new ApiError(404, 'Review not found.');
  await refreshGuideRating(review.guide); await refreshTourRating(review.tour);
  res.json({ message: 'Review deleted.' });
});
export const guideFeedback = asyncHandler(async (req, res) => {
  const guide = await Guide.findOne({ user: req.user._id }).lean();
  if (!guide) throw new ApiError(404, 'Guide profile not found.');
  const { page, limit } = pagination(req.query);
  const filter = { guide: guide._id, hidden: false };
  const [data, total, distribution] = await Promise.all([
    TravelerReview.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('user', 'name').populate('tour', 'title').lean(),
    TravelerReview.countDocuments(filter),
    TravelerReview.aggregate([{ $match: filter }, { $group: { _id: '$guideRating', count: { $sum: 1 } } }])
  ]);
  pageResult(res, data, total, page, limit);
  res.locals.distribution = [1, 2, 3, 4, 5].map(rating => distribution.find(row => row._id === rating)?.count || 0);
});
export const replyToFeedback = asyncHandler(async (req, res) => {
  const guide = await Guide.findOne({ user: req.user._id }).lean();
  const reply = String(req.body.reply || '').trim();
  if (!guide) throw new ApiError(404, 'Guide profile not found.');
  if (reply.length < 5 || reply.length > 1000) throw new ApiError(400, 'A public reply must be 5-1000 characters.');
  const review = await TravelerReview.findOneAndUpdate({ _id: req.params.id, guide: guide._id }, { guideReply: reply }, { new: true, runValidators: true });
  if (!review) throw new ApiError(404, 'Feedback not found.');
  res.json({ data: review, message: 'Public reply saved.' });
});
export const hideFeedback = asyncHandler(async (req, res) => {
  const reason = String(req.body.reason || '').trim();
  if (reason.length < 5 || reason.length > 1000) throw new ApiError(400, 'A hiding reason of 5-1000 characters is required.');
  const review = await TravelerReview.findByIdAndUpdate(req.params.id, { hidden: true, hiddenReason: reason }, { new: true, runValidators: true });
  if (!review) throw new ApiError(404, 'Feedback not found.');
  await refreshGuideRating(review.guide); await refreshTourRating(review.tour);
  res.json({ data: review, message: 'Feedback hidden.' });
});
