import { Router } from 'express';
import inventoryRoutes from './inventory.routes.js';
import allocationRoutes from './allocation.routes.js';

const router = Router();

router.use('/inventory', inventoryRoutes);
router.use('/allocations', allocationRoutes);

export default router;
