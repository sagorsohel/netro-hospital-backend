import express from 'express';
import multer from 'multer';
import { uploadBufferToCloudinary } from '../config/cloudinary.js';
import { verifyToken } from '../middleware/auth.js';


const router = express.Router();

// Memory storage for direct buffer upload to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.startsWith('image/') ||
      file.mimetype === 'application/pdf' ||
      file.mimetype.includes('document') ||
      file.mimetype.includes('word') ||
      file.mimetype.includes('sheet') ||
      file.mimetype.includes('text')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only image, PDF, and document files are allowed'), false);
    }
  },
});

/**
 * @route   POST /api/upload/image
 * @desc    Upload department image/icon to Cloudinary
 * @access  Private
 */
router.post(
  '/image',
  verifyToken,
  (req, res, next) => {
    upload.fields([
      { name: 'file', maxCount: 1 },
      { name: 'image', maxCount: 1 },
    ])(req, res, (err) => {
      if (err) return next(err);
      if (req.files) {
        req.file = req.files['file']?.[0] || req.files['image']?.[0];
      }
      next();
    });
  },
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image file uploaded. Please provide a "file" or "image" field.',
        });
      }

    const folder = req.body.folder || 'netro-hospital/departments';
    const filename = req.file.originalname || `upload_${Date.now()}`;

    // Upload to Cloudinary
    try {
      const url = await uploadBufferToCloudinary(req.file.buffer, folder, filename);
      return res.status(200).json({
        success: true,
        url,
        name: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        message: 'File uploaded to Cloudinary successfully.',
      });
    } catch (uploadError) {
      // If Cloudinary env vars missing, fallback gracefully to a mock data url or error
      if (uploadError.message.includes('Cloudinary is not configured')) {
        return res.status(400).json({
          success: false,
          message: uploadError.message,
          hint: 'Please add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in netro-backend/.env',
        });
      }
      throw uploadError;
    }
  } catch (err) {
    next(err);
  }
});

export default router;
