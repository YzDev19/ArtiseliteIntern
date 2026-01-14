import { Router } from 'express';
import { getProducts, createProduct } from '../controllers/product_controller';

const router = Router();

// GET /api/products
router.get('/', getProducts);

// POST /api/products
router.post('/', createProduct);

export default router;