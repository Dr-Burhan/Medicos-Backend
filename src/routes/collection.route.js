import {
    getAllCollections,
    getCollectionById,
    getProductsByCollection,
    createCollection,
    updateCollection,
    deleteCollection
} from '../controllers/collection.controller.js';

import express from 'express';
import upload from '../middleware/multer.middleware.js';
import { verifyJWT } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/get-collections', getAllCollections);
router.get('/get-collection/:id', getCollectionById);
router.get('/:id/products', getProductsByCollection);
router.post('/create', verifyJWT, upload.single('image'), createCollection);
router.put('/update-collection/:id', upload.single('image'), updateCollection);
router.delete('/delete-collection/:id', deleteCollection);

export default router;