import { Router } from 'express';
import { getInventory, addStock, transferStock } from '../controllers/inventory_controller';
import { authenticateToken } from '../src/middleware/auth_middleware';

const router = Router();

router.get('/', getInventory);
router.post('/add', addStock);
router.post('/transfer', authenticateToken, transferStock);

export default router;