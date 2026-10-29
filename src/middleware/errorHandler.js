import multer from "multer";
import { ApiError } from "../utils/ApiError.js";

export const notFound = (req, res, next) => {
  next(ApiError.notFound(`Not Found - ${req.originalUrl}`));
};

export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);

  // Multer errors (file too large, unexpected field, ...) are client errors
  if (err instanceof multer.MulterError) {
    statusCode = 400;
  }

  res.status(statusCode).json({
    success: false,
    message: err.message,
    ...(err.errors && { errors: err.errors }),
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};
