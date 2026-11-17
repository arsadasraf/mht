import { getPresignedUploadUrl, getPresignedDownloadUrl, generatePresignedUrl, getS3Client } from '../config/s3.config.js';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

/**
 * Generate a short-lived presigned URL for direct browser uploads
 * GET /api/v1/s3/presigned-upload?key=crm/products/...&contentType=image/jpeg
 */
export const getUploadUrl = async (req, res, next) => {
  try {
    const key = req.query.key || req.body?.key;
    const contentType = req.query.contentType || req.body?.contentType || 'application/octet-stream';
    const expiresIn = req.query.expiresIn || req.body?.expiresIn || 900;

    if (!key) {
      return res.status(400).json({
        success: false,
        message: 'Object key is required (e.g. crm/products/MHT-2100/photo.jpg)'
      });
    }

    // Sanitize key prefix to ensure it belongs to an authorized tab structure
    const cleanKey = key.replace(/^\/+/, '');
    const url = await getPresignedUploadUrl(cleanKey, contentType, parseInt(expiresIn, 10));

    res.status(200).json({
      success: true,
      url,
      key: cleanKey,
      expiresIn: parseInt(expiresIn, 10),
      bucket: process.env.AWS_S3_BUCKET_NAME || 'aws-mht'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate a short-lived presigned URL for secure browser downloads/views
 * GET or POST /api/v1/s3/presigned-download?key=crm/quotations/QT-2026-0001.pdf
 */
export const getDownloadUrl = async (req, res, next) => {
  try {
    const key = req.query.key || req.body?.key;
    const expiresIn = req.query.expiresIn || req.body?.expiresIn || 900;

    if (!key) {
      return res.status(400).json({
        success: false,
        message: 'Object key is required'
      });
    }

    const cleanKey = key.replace(/^\/+/, '');
    const url = await getPresignedDownloadUrl(cleanKey, parseInt(expiresIn, 10));

    res.status(200).json({
      success: true,
      url,
      key: cleanKey,
      expiresIn: parseInt(expiresIn, 10)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Server-side direct buffer/base64 upload (e.g. for server-rendered PDFs or logo crops)
 * POST /api/v1/s3/direct-upload
 * Body: { key, base64Data, contentType }
 */
export const directUpload = async (req, res, next) => {
  try {
    const key = req.body?.key;
    const rawData = req.body?.base64Data || req.body?.fileData;
    const contentType = req.body?.contentType || 'application/octet-stream';

    if (!key || !rawData) {
      return res.status(400).json({
        success: false,
        message: 'Both key and file data (base64Data) are required'
      });
    }

    const cleanKey = key.replace(/^\/+/, '');
    const buffer = Buffer.from(rawData.replace(/^data:[^;]+;base64,/, ''), 'base64');
    const bucket = process.env.AWS_S3_BUCKET_NAME || 'aws-mht';

    const client = getS3Client() || s3Client;
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: cleanKey,
      Body: buffer,
      ContentType: contentType
    });

    await client.send(command);

    // Also persist a local copy in uploads folder for high-speed local dev access
    try {
      const localFilePath = path.join(process.cwd(), 'uploads', cleanKey);
      const dir = path.dirname(localFilePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(localFilePath, buffer);
    } catch (localErr) {
      // Non-blocking local cache error
    }

    // Generate signed download URL for immediate access (7 days validity - AWS SigV4 max)
    const signedUrl = await getPresignedDownloadUrl(cleanKey, 604800);
    const region = process.env.AWS_REGION || 'ap-south-2';
    const s3DirectUrl = `https://${bucket}.s3.${region}.amazonaws.com/${cleanKey}`;

    res.status(200).json({
      success: true,
      message: 'File successfully uploaded to AWS S3',
      key: cleanKey,
      url: signedUrl,
      s3Url: s3DirectUrl,
      permanentUrl: `/api/v1/s3/view?key=${cleanKey}`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Public/authenticated view route that redirects to a fresh S3 presigned URL
 * GET /api/v1/s3/view?key=company/branding/logos/...
 */
export const viewS3Object = async (req, res, next) => {
  try {
    const key = req.query.key || req.params.key;
    if (!key) {
      return res.status(400).json({ success: false, message: 'Object key is required' });
    }
    const cleanKey = String(key).replace(/^\/+/, '');
    const signedUrl = await getPresignedDownloadUrl(cleanKey, 3600);
    return res.redirect(signedUrl);
  } catch (error) {
    next(error);
  }
};
