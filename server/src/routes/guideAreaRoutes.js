import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth, requireRoles, requireApprovedGuide } from '../middleware/auth.js';
import { requireCsrf } from '../middleware/csrf.js';
import { validateId } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errors.js';
import * as controller from '../controllers/guideAreaController.js';
const router = Router();
const writeLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, message: { message: 'Too many schedule changes. Try again later.' } });
// Public ranking and performance endpoints.
router.get('/guides/ranking', asyncHandler(controller.ranking));
router.get('/guides/:id/performance', validateId, asyncHandler(controller.publicPerformance));
// Guide workspace endpoints.
router.get('/guide/overview', requireAuth, requireRoles('guide'), asyncHandler(controller.overview));
router.get('/guide/schedule', requireAuth, requireRoles('guide'), requireApprovedGuide, asyncHandler(controller.schedule));
router.post('/guide/schedule/blocked-dates', writeLimit, requireAuth, requireRoles('guide'), requireApprovedGuide, requireCsrf, asyncHandler(controller.addBlockedDate));
router.delete('/guide/schedule/blocked-dates', writeLimit, requireAuth, requireRoles('guide'), requireApprovedGuide, requireCsrf, asyncHandler(controller.removeBlockedDate));
router.get('/guide/feedback', requireAuth, requireRoles('guide'), requireApprovedGuide, asyncHandler(controller.feedback));
router.get('/guide/performance', requireAuth, requireRoles('guide'), requireApprovedGuide, asyncHandler(controller.myPerformance));
export default router;
