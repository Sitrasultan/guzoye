import { Router } from 'express';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errors.js';
import * as controller from '../controllers/adminAnalyticsController.js';
const router = Router();
router.use(requireAuth, requireRoles('admin'));
router.get('/overview', asyncHandler(controller.overview));
router.get('/activity', asyncHandler(controller.activity));
export default router;
