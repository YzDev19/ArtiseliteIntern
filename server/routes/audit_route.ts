import { Router } from 'express';
import { getAuditLogs } from '../controllers/audit_controller.ts';

const router = Router();

router.get('/', getAuditLogs);

export default router;