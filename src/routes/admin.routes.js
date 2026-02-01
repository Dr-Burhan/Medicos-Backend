import express from "express";
import { verifyJWT } from '../middleware/auth.middleware.js';
import { isAdmin } from '../middleware/auth.middleware.js';
import { getAdminStats, updateUserRole } from "../controllers/admin.controller.js";

const router = express.Router();

router.get(
  "/stats",
  verifyJWT,
  isAdmin,
  getAdminStats
);

router.put(
  "/user/update-role/:userId",
  verifyJWT,
  isAdmin,
  updateUserRole
);

export default router;
