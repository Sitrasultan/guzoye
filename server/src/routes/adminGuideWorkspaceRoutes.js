import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import Guide from '../models/Guide.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { requireCsrf } from '../middleware/csrf.js';
import { validateId } from '../middleware/validate.js';
import { ApiError, asyncHandler } from '../middleware/errors.js';
import { transaction, audit, pageResult } from '../services/management.js';
import { calculatePerformance, ranking } from '../services/guidePerformance.js';
const router = Router();
router.use(requireAuth, requireRoles('admin'));
router.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 80, skip: req => ['GET', 'HEAD', 'OPTIONS'].includes(req.method), message: { message: 'Too many admin changes. Try again later.' } }));
router.get('/guides', asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
  const filter = {};
  if (req.query.status && ['pending', 'approved', 'rejected'].includes(req.query.status)) filter.status = req.query.status;
  if (req.query.destination && /^[a-f0-9]{24}$/i.test(req.query.destination)) filter.coveredDestinations = new mongoose.Types.ObjectId(req.query.destination);
  if (req.query.suspended === 'true') filter.isActive = false;
  if (req.query.suspended === 'false') filter.isActive = { $ne: false };
  const [guides, total, ranked] = await Promise.all([
    Guide.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
      .populate('user', 'name email role').populate('coveredDestinations', 'name').lean(),
    Guide.countDocuments(filter),
    ranking({ limit: 200 })
  ]);
  const rankMap = new Map(ranked.rows.map(row => [row.guide, row]));
  const data = await Promise.all(guides.map(async guide => {
    const performance = rankMap.get(String(guide._id)) || await calculatePerformance(guide._id);
    return { ...guide, performance: { score: performance?.score || 0, rank: performance?.rank || null, tier: performance?.tier || 'New', ranked: performance?.ranked || false } };
  }));
  data.sort((a, b) => (b.performance.rank || 999999) - (a.performance.rank || 999999) || b.performance.score - a.performance.score);
  pageResult(res, data, total, page, limit);
}));
router.patch('/guides/:id/suspend', requireCsrf, validateId, asyncHandler(async (req, res) => {
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
  if (reason.length < 5 || reason.length > 1000) throw new ApiError(400, 'A suspension reason of 5-1000 characters is required.');
  const data = await transaction(async session => {
    const guide = await Guide.findById(req.params.id).session(session);
    if (!guide) throw new ApiError(404, 'Guide not found.');
    if (guide.isActive === false) return guide;
    guide.isActive = false;
    await guide.save({ session });
    await audit(req.user._id, 'guide_suspend', 'Guide', guide._id, { reason }, session);
    return guide;
  });
  res.json({ data, message: 'Guide suspended.' });
}));
router.patch('/guides/:id/reactivate', requireCsrf, validateId, asyncHandler(async (req, res) => {
  const data = await transaction(async session => {
    const guide = await Guide.findById(req.params.id).session(session);
    if (!guide) throw new ApiError(404, 'Guide not found.');
    if (guide.isActive !== false) return guide;
    guide.isActive = true;
    await guide.save({ session });
    await audit(req.user._id, 'guide_reactivate', 'Guide', guide._id, {}, session);
    return guide;
  });
  res.json({ data, message: 'Guide reactivated.' });
}));
export default router;
