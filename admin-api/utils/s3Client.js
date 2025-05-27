const { S3Client } = require('@aws-sdk/client-s3');

const REGION = process.env.S3_REGION;
const ENDPOINT = process.env.S3_ENDPOINT;
const ACCESS_KEY = process.env.S3_ACCESS_KEY;
const SECRET_KEY = process.env.S3_SECRET_KEY;

const s3 = new S3Client({
  region: REGION,
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_KEY,
  },
  forcePathStyle: true, // needed for R2
});

module.exports = s3; 