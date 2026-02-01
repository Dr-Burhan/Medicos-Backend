import express from "express";
import {
  addProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  migrateProductImages,
} from "../controllers/product.controller.js";
import upload from "../middleware/multer.middleware.js";


const router = express.Router();

router.post("/add-product", upload.array("images", 5), addProduct);         
router.get("/get-allproducts", getAllProducts);        
router.get("/get-product/:id", getProductById);     
router.put("/update-product/:id", upload.array("images", 5), updateProduct);
router.delete("/delete-product/:id", deleteProduct);
router.post("/migrate-images", migrateProductImages);

export default router;
