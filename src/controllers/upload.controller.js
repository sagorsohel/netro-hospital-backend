import { uploadBufferToCloudinary } from "../config/cloudinary.js";

/**
 * @desc Upload a single image/document to Cloudinary
 * @route POST /api/v1/upload/image
 * @access Private
 */
export const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded. Please provide a "file" or "image" field.',
      });
    }

    const folder = req.body.folder || "netro-hospital/departments";
    const filename = req.file.originalname || `upload_${Date.now()}`;

    try {
      const url = await uploadBufferToCloudinary(req.file.buffer, folder, filename);
      return res.status(200).json({
        success: true,
        url,
        name: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        message: "File uploaded to Cloudinary successfully.",
      });
    } catch (uploadError) {
      if (uploadError.message.includes("Cloudinary is not configured")) {
        return res.status(400).json({
          success: false,
          message: uploadError.message,
          hint: "Please add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in netro-backend/.env",
        });
      }
      throw uploadError;
    }
  } catch (err) {
    next(err);
  }
};
