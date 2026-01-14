import { Router } from 'express';
import { getWarehouses, createWarehouse } from '../controllers/warehouse_controller';
import { authenticateToken, authorizeRole } from '../src/middleware/auth_middleware'; // 

const router = Router();

//public: Anyone with a valid token can VIEW warehouses
router.get('/', authenticateToken, getWarehouses);

//private : Only ADMIN can CREATE warehouses
router.post('/', authenticateToken, authorizeRole(['ADMIN']), createWarehouse);

export default router;