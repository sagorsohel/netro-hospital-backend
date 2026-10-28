import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Upload a file buffer directly to Cloudinary
 * @param {Buffer} fileBuffer
 * @param {string} folder
 * @param {string} filename
 * @returns {Promise<string>} Secure URL of uploaded image
 */
export const uploadBufferToCloudinary = (fileBuffer, folder = 'netro-hospital/departments', filename = '') => {
  return new Promise((resolve, reject) => {
    // If Cloudinary is not configured yet, throw clear instructions
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return reject(
        new Error(
          'Cloudinary is not configured in .env. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.'
        )
      );
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: filename ? filename.replace(/\.[^/.]+$/, '') : undefined,
        resource_type: 'auto',
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result?.secure_url || result?.url);
      }
    );

    uploadStream.end(fileBuffer);
  });
};

export default cloudinary;
