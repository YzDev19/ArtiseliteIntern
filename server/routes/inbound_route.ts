import { Router } from 'express';
import multer from 'multer';
import { createInbound, createBulkInbound } from '../controllers/inbound_controller';
import { getSuppliers, createSupplier } from '../controllers/supplier_controller';
import { authenticateToken } from '../src/middleware/auth_middleware';

const router = Router();

// Configure Multer to save files to 'uploads/'
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Supplier Routes
router.get('/suppliers', getSuppliers);
router.post('/suppliers', createSupplier);

// Inbound Routes
// 'file' is the name of the input field in the frontend form
router.post('/', upload.single('file'), createInbound);
router.post('/bulk', authenticateToken, createBulkInbound);

router

export default router;