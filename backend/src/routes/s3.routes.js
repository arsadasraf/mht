import { Router } from 'express';
import { getUploadUrl, getDownloadUrl, directUpload } from '../controllers/s3.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

// Protect all S3 presigned operations with authentication
router.use(authenticateToken);

router.route('/presigned-upload').get(getUploadUrl).post(getUploadUrl);
router.route('/presigned-download').get(getDownloadUrl).post(getDownloadUrl);
router.post('/direct-upload', directUpload);

export default router;
