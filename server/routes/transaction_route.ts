import { Router } from 'express';
import { createInbound, createOutbound } from '../controllers/transaction_controller';

const router = Router();

router.post('/inbound', createInbound);
router.post('/outbound', createOutbound);

export default router;