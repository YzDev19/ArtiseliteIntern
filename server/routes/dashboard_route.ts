import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboard_controller';
import { authenticateToken } from '../src/middleware/auth_middleware';

const router = Router();

router.get('/stats', authenticateToken, getDashboardStats);

export default router;