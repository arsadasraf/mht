import 'dotenv/config';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';

let cachedClient = null;

export const getS3Client = () => {
  if (cachedClient) return cachedClient;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || 'ap-south-2';

  if (!accessKeyId || accessKeyId.startsWith('mock_')) {
    return null;
  }

  cachedClient = new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });
  return cachedClient;
};

/**
 * Generate a secure, short-lived presigned URL for upload or download
 * @param {string} key - S3 object key (e.g. projects/PRJ-1001/cad/drawing.dwg)
 * @param {'put'|'get'} action - Operation type
 * @param {string} [contentType] - MIME type for uploads
 * @param {number} [expiresIn=900] - URL validity in seconds (default 15 mins)
 */
export const generatePresignedUrl = async (key, action = 'get', contentType = 'application/octet-stream', expiresIn = 900) => {
  const client = getS3Client();
  const bucket = process.env.AWS_S3_BUCKET_NAME || 'aws-mht';

  if (!client) {
    // Local dev mock URL
    const localUploadDir = path.resolve('uploads');
    if (!fs.existsSync(localUploadDir)) {
      fs.mkdirSync(localUploadDir, { recursive: true });
    }
    return {
      url: `/api/v1/mock-storage/${key}`,
      key,
      isMock: true,
      expiresIn
    };
  }

  if (action === 'put') {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType
    });
    const url = await getSignedUrl(client, command, { expiresIn });
    return { url, key, isMock: false, expiresIn };
  } else {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key
    });
    const url = await getSignedUrl(client, command, { expiresIn });
    return { url, key, isMock: false, expiresIn };
  }
};


export const getPresignedDownloadUrl = async (key, expiresIn = 900) => {
  const result = await generatePresignedUrl(key, 'get', undefined, expiresIn);
  return result.url;
};

export const getPresignedUploadUrl = async (key, contentType = 'application/octet-stream', expiresIn = 900) => {
  const result = await generatePresignedUrl(key, 'put', contentType, expiresIn);
  return result.url;
};
