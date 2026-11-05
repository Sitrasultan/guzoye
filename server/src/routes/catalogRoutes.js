import { Router } from 'express';
import { asyncHandler } from '../middleware/errors.js';
import { validateQuery, validateTourIdentifier } from '../middleware/validate.js';
import * as controller from '../controllers/catalogController.js';

const router = Router();

// Public catalog endpoints. Validation runs before any database query.
router.get('/tours', validateQuery, asyncHandler(controller.listTours));
router.get('/tours/:id', validateTourIdentifier, asyncHandler(controller.getTour));
router.get('/tours/:id/reviews', validateTourIdentifier, asyncHandler(controller.listReviews));

router.get('/destinations', validateQuery, asyncHandler(controller.listDestinations));
router.get('/destinations/:id', validateTourIdentifier, asyncHandler(controller.getDestination));

router.get('/guides', validateQuery, asyncHandler(controller.listGuides));
router.get('/guides/:id', validateTourIdentifier, asyncHandler(controller.getGuide));

export default router;