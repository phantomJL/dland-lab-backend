const { Storage } = require('@google-cloud/storage');
const path = require('path');
require('dotenv').config();

// Create storage instance
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

console.log(process.env.GOOGLE_APPLICATION_CREDENTIALS)

const bucketName = process.env.GOOGLE_CLOUD_BUCKET;
console.log('Bucket name:', bucketName);
const bucket = storage.bucket(bucketName);

// Upload file to Google Cloud Storage
const uploadFile = async (file, customPath) => {
  try {
    if (!file) {
      throw new Error('No file provided');
    }
    
    const blob = bucket.file(customPath);
    const blobStream = blob.createWriteStream({
      resumable: false,
      metadata: {
        contentType: file.mimetype
      }
    });
    
    return new Promise((resolve, reject) => {
      blobStream.on('error', (err) => {
        reject(err);
      });
      
      blobStream.on('finish', async () => {
        // Generate a signed URL that expires in 1 week
        const [url] = await blob.getSignedUrl({
          action: 'read',
          expires: Date.now() + 7 * 24 * 60 * 60 * 1000 // 1 week
        });
        
        resolve({
          url,
          path: blob.name
        });
      });
      
      blobStream.end(file.buffer);
    });
  } catch (err) {
    console.error('Error uploading file:', err);
    throw new Error(`Could not upload file: ${err.message}`);
  }
};

// Generate a fresh signed URL for a file
const generateSignedUrl = async (filePath) => {
  try {
    const blob = bucket.file(filePath);
    const [url] = await blob.getSignedUrl({
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000 // 1 week
    });
    
    return url;
  } catch (err) {
    console.error('Error generating signed URL:', err);
    throw new Error(`Could not generate signed URL: ${err.message}`);
  }
};

// List files in a directory
const listFiles = async (prefix) => {
  console.log("......................here is the prefix",prefix)
  try {
    const options = {
      prefix,
    };
    
    // Lists files in the bucket with the given prefix
    const [files] = await bucket.getFiles(options);
    console.log("......................here is the files", files)
    
    return files.map(file => ({
      name: file.name,
      path: file.name,
      size: file.metadata.size
    }));
  } catch (err) {
    console.error('Error listing files:', err);
    throw new Error(`Could not list files: ${err.message}`);
  }
};

// Get a signed URL for a file in your bucket
const getSignedUrl = async (filePath) => {
  try {
    const file = bucket.file(filePath);
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 1 week
    });
    
    return url;
  } catch (err) {
    console.error('Error generating signed URL:', err);
    throw new Error(`Could not generate signed URL: ${err.message}`);
  }
};

// Export these functions
module.exports = {
  uploadFile,
  generateSignedUrl,
  listFiles,
  getSignedUrl
};