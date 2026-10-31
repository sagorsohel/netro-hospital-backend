import express from "express";
import {
  getRooms,
  getRoomStats,
  getRoomById,
  createRoom,
  updateRoom,
  toggleRoomStatus,
  deleteRoom,
} from "../controllers/room.controller.js";
import { verifyToken, requireRoles } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createRoomSchema,
  updateRoomSchema,
  updateRoomStatusSchema,
  roomListQuerySchema,
} from "../validators/room.validator.js";

const router = express.Router();

// Read & Analytics
router.get("/", verifyToken, validate({ query: roomListQuerySchema }), getRooms);
router.get("/stats", verifyToken, getRoomStats);
router.get("/:id", verifyToken, getRoomById);

// Mutations
router.post("/", verifyToken, validate({ body: createRoomSchema }), createRoom);
router.put("/:id", verifyToken, validate({ body: updateRoomSchema }), updateRoom);
router.patch(
  "/:id/status",
  verifyToken,
  validate({ body: updateRoomStatusSchema }),
  toggleRoomStatus
);

// Delete (Admin only)
router.delete("/:id", verifyToken, requireRoles("admin"), deleteRoom);

export default router;
