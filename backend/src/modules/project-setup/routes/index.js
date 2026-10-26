import { Router } from 'express';
import projectRoutes from './project.routes.js';
import milestoneRoutes from './milestone.routes.js';
import stageMasterRoutes from './stageMaster.routes.js';

const router = Router();

router.use('/projects', projectRoutes);
router.use('/milestones', milestoneRoutes);
router.use('/stage-masters', stageMasterRoutes);

export default router;
