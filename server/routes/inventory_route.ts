import { Router } from 'express';
import { getInventory, addStock } from '../controllers/inventory_controller';

const router = Router();
router.get('/', getInventory);
router.post('/add', addStock);
export default router;