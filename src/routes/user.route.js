import express from "express";
import { registerUser, loginUser, refreshAccessToken, logoutUser, getCurrentUser, updateCurrentUser } from "../controllers/user.controller.js";
import { updateUser, deleteUser, getAllUsers } from "../controllers/user.controller.js";

import { verifyJWT } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.get("/me", verifyJWT, getCurrentUser);
router.put("/me", verifyJWT, updateCurrentUser);
router.post("/refresh-token", refreshAccessToken);
router.put("/update-user/:id", verifyJWT, updateUser);
router.delete("/delete-user/:id", verifyJWT, deleteUser);
router.get("/get-allusers", getAllUsers);


export default router;
