import Collection from '../models/collection.model.js';
import Product from '../models/product.model.js';
import cloudinary from '../utils/cloudinary.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';
import { Readable } from 'stream';

//    Get all collections

export const getAllCollections = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      sort = '-createdAt'
    } = req.query;

    // Execute query with pagination
    const collections = await Collection.find()
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean(); // Convert to plain JavaScript objects for better performance

    const count = await Collection.countDocuments();

    res.status(200).json({
      success: true,
      data: collections,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalCollections: count,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error in getting All Collections:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch collections',
      message: error.message
    });
  }
};

// @desc    Get single collection by ID
// @route   GET /api/collections/:id
// @access  Public
export const getCollectionById = async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);

    if (!collection) {
      return res.status(404).json({
        success: false,
        error: 'Collection not found'
      });
    }

    res.status(200).json({
      success: true,
      data: collection
    });
  } catch (error) {
    console.error('Error in getCollectionById:', error);
    
   
    res.status(500).json({
      success: false,
      error: 'Failed to fetch collection',
      message: error.message
    });
  }
};



export const getProductsByCollection = async (req, res) => {
  try {
    const { page = 1, limit = 12, sort = '-createdAt' } = req.query;
    const skip = (page - 1) * limit;

    // Check if collection exists
    const collection = await Collection.findById(req.params.id);
    if (!collection) {
      return res.status(404).json({
        success: false,
        error: 'Collection not found'
      });
    }

    // Get products for this collection
    const products = await Product.find({ 
      collectionId: req.params.id
    })
      .skip(skip)
      .limit(parseInt(limit))
      .sort(sort)
      .lean();

    const totalProducts = await Product.countDocuments({ 
      collectionId: req.params.id 
    });

    res.status(200).json({
      success: true,
      data: {
        collection: {
          _id: collection._id,
          name: collection.name,
          description: collection.description
        },
        products,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalProducts / limit),
          totalProducts,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error in getProductsByCollection:', error);
    
   
    res.status(500).json({
      success: false,
      error: 'Failed to fetch products',
      message: error.message
    });
  }
};

// @desc    Create new collection
export const createCollection = async (req, res) => {
  try {
    const { name, description } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Collection name is required"
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Collection image is required"
      });
    }

    // Check if collection with same name exists (case-insensitive)
    const existingCollection = await Collection.findOne({ 
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } 
    });

    if (existingCollection) {
      return res.status(400).json({
        success: false,
        message: "Collection with this name already exists"
      });
    }

    // Upload image to Cloudinary
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

    const cloudinaryResult = await uploadToCloudinary(req.file.buffer, 'collections');

    // Create collection with Cloudinary image data
    const collection = await Collection.create({
      name: name.trim(),
      description: description?.trim() || "",
      image: {
        public_id: cloudinaryResult.public_id,
        url: cloudinaryResult.secure_url
      }
    });

    res.status(201).json({
      success: true,
      data: collection,
      message: "Collection created successfully"
    });
  } catch (error) {
    console.error('Error in createCollection:', error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create collection"
    });
  }
};

// @desc    Update collection

export const updateCollection = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    let collection = await Collection.findById(req.params.id);

    if (!collection) {
      return res.status(404).json({
        success: false,
        error: 'Collection not found'
      });
    }

    // Update collection fields
    if (name) collection.name = name.trim();
    if (description) collection.description = description.trim();
    
    // Handle image upload if file is provided
    if (req.file) {
      try {
        console.log('Uploading collection image, file size:', req.file.size);
        const uploadResult = await uploadToCloudinary(req.file.buffer, 'collections');
        console.log('Image uploaded successfully:', uploadResult.public_id);
        
        collection.image = {
          url: uploadResult.secure_url,
          public_id: uploadResult.public_id
        };
      } catch (uploadError) {
        console.error('Error uploading image:', uploadError);
        return res.status(400).json({
          success: false,
          error: 'Image upload failed',
          message: uploadError.message
        });
      }
    }

    // Save updated collection
    const updatedCollection = await collection.save();
    console.log('Collection saved with image:', updatedCollection.image);

    return res.status(200).json({
      success: true,
      data: updatedCollection,
      message: 'Collection updated successfully'
    });
  } catch (error) { 
    console.error('Error in updateCollection:', error);

    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        error: 'Invalid collection ID format'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to update collection',
      message: error.message
    });
  }
};


export const deleteCollection = async (req, res) => {
  try {
      // Find collection
      const collection = await Collection.findById(req.params.id);
        if (!collection) {
        return res.status(404).json({
            success: false,
            error: 'Collection not found'
        });
      }
        // Delete collection
        await Collection.findByIdAndDelete(req.params.id);
        res.status(200).json({
            success: true,
            message: 'Collection deleted successfully'
        });
  }
    catch (error) {
    console.error('Error in deleteCollection:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to delete collection',
      message: error.message
    });
  }
};
