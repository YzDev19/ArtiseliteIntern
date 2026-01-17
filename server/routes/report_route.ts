import { Router } from 'express';
import { getValuationReport } from '../controllers/report_controller';
import { authenticateToken } from '../src/middleware/auth_middleware';

const router = Router();

router.get('/valuation', authenticateToken, getValuationReport);

export default router;