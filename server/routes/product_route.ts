import { Router } from 'express';
import { authenticateToken, authorize } from '../src/middleware/auth_middleware';
import { getProducts, createProduct, archiveProduct, updateProduct, createBulkProducts} from '../controllers/product_controller';

const router = Router();

// GET /api/products
router.get('/', getProducts);

// POST /api/products
router.post('/', createProduct);

router.delete('/:id', archiveProduct);

router.put('/:id', updateProduct);

router.post('/bulk', createBulkProducts);

router.delete('/:id', authenticateToken, authorize(['ADMIN']), archiveProduct);

router.post('/', authenticateToken, authorize(['ADMIN', 'MANAGER']), createProduct);

router.put('/:id', authenticateToken, authorize(['ADMIN', 'MANAGER']), updateProduct);

router.get('/', authenticateToken, getProducts);

export default router;