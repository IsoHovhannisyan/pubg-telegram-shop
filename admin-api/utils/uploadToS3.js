const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REGION = process.env.S3_REGION;
const BUCKET = process.env.S3_BUCKET;
const ENDPOINT = process.env.S3_ENDPOINT; // e.g. https://<accountid>.r2.cloudflarestorage.com
const ACCESS_KEY = process.env.S3_ACCESS_KEY;
const SECRET_KEY = process.env.S3_SECRET_KEY;
const PUBLIC_BASE = process.env.S3_PUBLIC_BASE; // e.g. https://pub-...r2.dev

const s3 = new S3Client({
  region: REGION,
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_KEY,
  },
  forcePathStyle: true, // needed for R2
});

async function uploadToS3(localFilePath, originalName, folder = '') {
  const ext = path.extname(originalName);
  const key = `${folder}${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
  const fileStream = fs.createReadStream(localFilePath);

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: fileStream,
    ContentType: getContentType(ext),
    // ACL: 'public-read', // Not needed for R2
  });

  await s3.send(command);

  // Construct public URL using S3_PUBLIC_BASE
  const publicUrl = `${PUBLIC_BASE.replace(/\/$/, '')}/${key}`;
  return publicUrl;
}

function getContentType(ext) {
  switch (ext.toLowerCase()) {
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.png': return 'image/png';
    case '.gif': return 'image/gif';
    default: return 'application/octet-stream';
  }
}

module.exports = uploadToS3; 