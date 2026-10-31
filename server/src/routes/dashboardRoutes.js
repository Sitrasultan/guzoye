import { Router } from 'express';
import { requireAuth, requireRoles, requireApprovedGuide } from '../middleware/auth.js';
const router = Router();
router.use(requireAuth);
router.get('/traveler', requireRoles('traveler'), (_req, res) => res.json({ data: { message: 'Explore future departures, request a booking, and manage your reservations.' } }));
router.get('/guide', requireRoles('guide'), (_req, res) => res.json({ data: { message: 'View your application status. Approved guides can manage booking requests for their own tours.' } }));
router.get('/guide/workspace', requireRoles('guide'), requireApprovedGuide, (_req, res) => res.json({ data: { message: 'Guide approval verified. Incoming booking requests are available on your dashboard.' } }));
router.get('/admin', requireRoles('admin'), (_req, res) => res.json({ data: { message: 'Admin access verified.' } }));
export default router;
