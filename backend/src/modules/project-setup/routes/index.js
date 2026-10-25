import { Router } from 'express';
import projectRoutes from './project.routes.js';
import milestoneRoutes from './milestone.routes.js';

const router = Router();

router.use('/projects', projectRoutes);
router.use('/milestones', milestoneRoutes);

export default router;
