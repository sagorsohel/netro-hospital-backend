import express from "express";
import { uploadFile } from "../controllers/upload.controller.js";
import { verifyToken } from "../middleware/auth.js";
import { singleFileFromFields } from "../middleware/upload.js";
import { validate } from "../middleware/validate.js";
import { uploadBodySchema } from "../validators/upload.validator.js";

const router = express.Router();

router.post(
  "/image",
  verifyToken,
  singleFileFromFields("file", "image"),
  validate({ body: uploadBodySchema }),
  uploadFile
);

export default router;
