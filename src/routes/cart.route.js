import express from "express";
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} from "../controllers/cart.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = express.Router();

// All cart routes require authentication
router.use(verifyJWT);

router.get("/get-cart", getCart);
router.post("/add-to-cart", addToCart);
router.put("/update-cart-item", updateCartItem);
router.post("/remove-from-cart", removeFromCart);
router.post("/clear-cart", clearCart);

export default router;
