import { Router } from 'express';
import {
  getLocations,
  createLocation,
  updateLocation,
  deleteLocation
} from '../controllers/location.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';

const router = Router();

router.get('/', authenticate, getLocations);
router.post('/', authenticate, createLocation);
router.put('/:id', authenticate, updateLocation);
router.delete('/:id', authenticate, deleteLocation);

export default router;

