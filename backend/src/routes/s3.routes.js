import { Router } from 'express';
import { getUploadUrl, getDownloadUrl, directUpload, viewS3Object } from '../controllers/s3.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

// Public view redirect endpoint for embedded document/logo rendering
router.get('/view', viewS3Object);

// Protect all S3 presigned operations with authentication
router.use(authenticateToken);

router.route('/presigned-upload').get(getUploadUrl).post(getUploadUrl);
router.route('/presigned-download').get(getDownloadUrl).post(getDownloadUrl);
router.post('/direct-upload', directUpload);

export default router;
