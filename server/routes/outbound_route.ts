import { Router } from 'express';
import multer from 'multer';
import { createOutbound,createBulkOutbound } from '../controllers/outbound_controller';
import { getCustomers, createCustomer } from '../controllers/customer_controller';
import { authenticateToken } from '../src/middleware/auth_middleware';

const router = Router();

// Re-use the existing uploads folder
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

router.get('/customers', getCustomers);
router.post('/customers', createCustomer);
router.post('/', upload.single('file'), createOutbound);
router.post('/bulk', authenticateToken, createBulkOutbound)

export default router;