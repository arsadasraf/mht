import { Router } from 'express';
import { getMasterLookup, getMasterDomainData, createMasterEntity } from '../controllers/master.controller.js';
import { requireAuth } from '../../../middleware/auth.middleware.js';

const router = Router();

// Universal Authentication Check
router.use(requireAuth);

/**
 * Tier 1: Universal Read-Only Lookup for ENTIRE Application
 * Called by CRM, Design, Purchase, Store, Quality, Production, Dispatch without restriction.
 */
router.get('/lookup', getMasterLookup);

/**
 * Tier 2: Domain-specific Management (Filtered by Master RBAC in production)
 */
router.get('/:domain', getMasterDomainData);
router.post('/:domain', createMasterEntity);

export default router;
