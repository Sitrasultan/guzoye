import { Router } from 'express';
import { asyncHandler } from '../middleware/errors.js';
import { validateId, validateQuery } from '../middleware/validate.js';
import { listTours,getTour,listDestinations,getDestination,listGuides,getGuide,listReviews } from '../controllers/catalogController.js';
const router=Router();
router.use(validateQuery);
router.get('/tours',asyncHandler(listTours));
router.get('/tours/:id/reviews',validateId,asyncHandler(listReviews));
router.get('/tours/:id',validateId,asyncHandler(getTour));
router.get('/destinations',asyncHandler(listDestinations));
router.get('/destinations/:id',validateId,asyncHandler(getDestination));
router.get('/guides',asyncHandler(listGuides));
router.get('/guides/:id',validateId,asyncHandler(getGuide));
// All data writes are deliberately absent until authentication and roles exist.
export default router;
