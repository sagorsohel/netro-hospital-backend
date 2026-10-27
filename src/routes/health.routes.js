import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.json({
    status: "healthy",
    service: "netro-hospital-backend",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

export default router;
