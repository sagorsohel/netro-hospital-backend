import multer from "multer";
import { ApiError } from "../utils/ApiError.js";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const isAllowedMimeType = (mimetype) =>
  mimetype.startsWith("image/") ||
  mimetype === "application/pdf" ||
  mimetype.includes("document") ||
  mimetype.includes("word") ||
  mimetype.includes("sheet") ||
  mimetype.includes("text");

// Memory storage for direct buffer upload to Cloudinary
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (isAllowedMimeType(file.mimetype)) {
      cb(null, true);
    } else {
      cb(ApiError.badRequest("Only image, PDF, and document files are allowed"), false);
    }
  },
});

/**
 * Accept a single file under any of the given field names and expose it as req.file
 * @param {...string} fieldNames
 */
export const singleFileFromFields = (...fieldNames) => {
  const handler = upload.fields(fieldNames.map((name) => ({ name, maxCount: 1 })));

  return (req, res, next) => {
    handler(req, res, (err) => {
      if (err) return next(err);
      if (req.files) {
        req.file = fieldNames.map((name) => req.files[name]?.[0]).find(Boolean);
      }
      next();
    });
  };
};
