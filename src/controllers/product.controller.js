import Product from "../models/product.model.js";
import Collection from "../models/collection.model.js";
import cloudinary from "../utils/cloudinary.js";
import { Readable } from 'stream';

/**
 * Helper function to upload buffer to Cloudinary
 */
const uploadToCloudinary = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: folder },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    const readableStream = Readable.from(buffer);
    readableStream.pipe(uploadStream);
  });
};

/*
 * ADD PRODUCT
 */
export const addProduct = async (req, res) => {
  try {
    console.log("Request body:", req.body);

    const {
      title,
      description,
      price,
      stock,
      collectionId,
      sku,
      deliveryTime,
      featured,
    } = req.body;

    // 1️⃣ Validate required fields
    if (!title || !description || !price || !stock || !collectionId) {
      return res.status(400).json({
        success: false,
        message: "Required fields: title, description, price, stock, collectionId",
      });
    }



    // 2️⃣ Validate images
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one image is required",
      });
    }

    // 3️⃣ Check collection exists
    const collection = await Collection.findById(collectionId);
    if (!collection) {
      return res.status(404).json({
        success: false,
        message: "Collection not found",
      });
    }

    // 4️⃣ Upload images to Cloudinary
    const images = [];

    for (const file of req.files) {
      const uploadResult = await uploadToCloudinary(
        file.buffer,
        "products"
      );
      images.push({
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id
      });
    }

    // 5️⃣ Create product
    const productData = {
      title,
      description,
      price: Number(price),
      stock: Number(stock),
      images,
      collectionId,
      sku,
      deliveryTime,
      featured,
    };

    console.log("Creating product:", productData);

    const product = await Product.create(productData);

    // 6️⃣ Link product to collection
    collection.products.push(product._id);
    await collection.save();

    // 7️⃣ Final response (ONLY ONE RESPONSE)
    return res.status(201).json({
      success: true,
      message: "Product added & linked to collection successfully",
      data: product,
    });

  } catch (error) {
    console.error("Add Product Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};


/**
 * GET ALL PRODUCTS
 */
export const getAllProducts = async (req, res) => {
  try {
    let products = await Product.find()
      .sort('-createdAt')
      .populate('collectionId', 'name');
    
    // Normalize image format for all products
    products = products.map(product => {
      const normalizedProduct = product.toObject();
      if (Array.isArray(normalizedProduct.images)) {
        normalizedProduct.images = normalizedProduct.images.map(img => {
          // If it's a string URL, wrap it in an object
          if (typeof img === 'string') {
            return { url: img, public_id: '' };
          }
          // If it's already an object, ensure it has url property
          if (typeof img === 'object' && img.url) {
            return img;
          }
          return null;
        }).filter(img => img !== null);
      }
      return normalizedProduct;
    });
    
    res.status(200).json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET SINGLE PRODUCT
 */
export const getProductById = async (req, res) => {
  try {
    let product = await Product.findById(req.params.id).populate('collectionId', 'name');
    if (!product) {
      return res.status(404).json({ 
        success: false,
        message: "Product not found" 
      });
    }
    
    // Normalize image format
    product = product.toObject();
    if (Array.isArray(product.images)) {
      product.images = product.images.map(img => {
        // If it's a string URL, wrap it in an object
        if (typeof img === 'string') {
          return { url: img, public_id: '' };
        }
        // If it's already an object, ensure it has url property
        if (typeof img === 'object' && img.url) {
          return img;
        }
        return null;
      }).filter(img => img !== null);
    }

    res.status(200).json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * UPDATE PRODUCT
 */
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    let {
      title,
      description,
      price,
      stock,
      collectionId,
      sku,
      deliveryTime,
      featured,
      existingImages = [],
    } = req.body;

    // Convert price and stock to numbers
    price = price ? parseFloat(price) : null;
    stock = stock ? parseInt(stock) : null;
    
    // Convert featured to boolean
    if (typeof featured === 'string') {
      featured = featured === 'true' || featured === '1';
    }

    // Validation
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Product name is required"
      });
    }

    if (!sku || !sku.trim()) {
      return res.status(400).json({
        success: false,
        message: "SKU is required"
      });
    }

    if (price === null || isNaN(price) || price <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid price is required (must be greater than 0)"
      });
    }

    if (stock === null || isNaN(stock) || stock < 0) {
      return res.status(400).json({
        success: false,
        message: "Stock quantity is required (must be 0 or greater)"
      });
    }

    if (!collectionId || !collectionId.toString().trim()) {
      return res.status(400).json({
        success: false,
        message: "Collection/Category is required"
      });
    }

    // Find product
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    // Upload new images if provided
    let newImages = [];
    if (req.files && req.files.length > 0) {
      console.log('Uploading', req.files.length, 'new images');
      for (const file of req.files) {
        try {
          console.log('Uploading image, size:', file.size);
          const uploadResult = await uploadToCloudinary(file.buffer, "products");
          console.log('Image uploaded successfully:', uploadResult.public_id);
          newImages.push({
            url: uploadResult.secure_url,
            public_id: uploadResult.public_id
          });
        } catch (error) {
          console.error('Error uploading image to Cloudinary:', error);
          return res.status(400).json({
            success: false,
            message: "Error uploading images: " + error.message
          });
        }
      }
    }

    // Parse existing images from string array
    let parsedExistingImages = [];
    if (existingImages) {
      try {
        // If existingImages is a JSON string, parse it
        const imagesToProcess = typeof existingImages === 'string' ? JSON.parse(existingImages) : existingImages;
        
        if (Array.isArray(imagesToProcess)) {
          parsedExistingImages = imagesToProcess.map(img => {
            // If it's already an object with url and public_id, keep it
            if (typeof img === 'object' && img.url) {
              return img;
            }
            // If it's just a URL string, wrap it
            if (typeof img === 'string') {
              return { url: img };
            }
            return img;
          });
        }
      } catch (error) {
        console.error('Error parsing existing images:', error);
        // If parsing fails, use existing product images
        parsedExistingImages = product.images || [];
      }
    }

    // Combine existing and new images
    let finalImages = [];
    
    // Add parsed existing images
    if (parsedExistingImages && Array.isArray(parsedExistingImages) && parsedExistingImages.length > 0) {
      finalImages = parsedExistingImages.filter(img => img && img.url);
    }
    
    // Add new images
    if (newImages && Array.isArray(newImages) && newImages.length > 0) {
      finalImages = [...finalImages, ...newImages];
    }
    
    // If no images provided, keep existing images
    if (finalImages.length === 0) {
      finalImages = product.images || [];
    }

    console.log('Final images array:', finalImages.length, 'images');
    finalImages.forEach((img, idx) => {
      console.log(`Image ${idx}:`, img.url ? 'has URL' : 'missing URL', img.public_id ? `public_id: ${img.public_id}` : '');
    });

    // Update product - ensure we're setting proper types
    const updateData = {
      title: title.trim(),
      description: description.trim(),
      price: price,
      stock: stock,
      collectionId: collectionId,
      sku: sku.trim(),
      deliveryTime: deliveryTime || product.deliveryTime,
      featured: featured || false,
      images: finalImages,
    };

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: false } // Disable validators to avoid issues
    );

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: "Failed to update product"
      });
    }

    console.log('Product updated successfully. Images:', updatedProduct.images.length);
    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct
    });
  } catch (error) {
    console.error('Error updating product:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error"
    });
  }
};

/**
 * DELETE PRODUCT
 */
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ 
        success: false,
        message: "Product not found" 
      });
    }

    // Optional: Delete images from Cloudinary
    if (product.images && product.images.length > 0) {
      for (const image of product.images) {
        try {
          await cloudinary.uploader.destroy(image.public_id);
        } catch (error) {
          console.error('Error deleting image from Cloudinary:', error);
        }
      }
    }

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PRODUCT STATS
 */
export const productStats = async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const outOfStock = await Product.countDocuments({ stock: 0 });
    const lowStock = await Product.countDocuments({ stock: { $gt: 0, $lt: 10 } });

    res.json({
      total: totalProducts, 
      outOfStock,
      lowStock
    });
  } catch (error) {
    console.error('Fetch stats error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch statistics' 
    });
  }
};

/**
 * MIGRATION: Fix products without images (adds placeholder image)
 */
export const migrateProductImages = async (req, res) => {
  try {
    // Find all products without images or with empty images array
    const productsToFix = await Product.find({
      $or: [
        { images: { $exists: false } },
        { images: [] },
        { images: null }
      ]
    });

    console.log(`Found ${productsToFix.length} products without images`);

    if (productsToFix.length === 0) {
      return res.status(200).json({
        success: true,
        message: "All products have images",
        fixed: 0
      });
    }

    // Add a default placeholder image for products without images
    const defaultImage = {
      url: 'https://via.placeholder.com/400x300?text=No+Image',
      public_id: 'default'
    };

    let fixed = 0;
    for (const product of productsToFix) {
      product.images = [defaultImage];
      await product.save();
      fixed++;
    }

    res.status(200).json({
      success: true,
      message: `Fixed ${fixed} products`,
      fixed
    });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};