import { Router } from 'express';
import { getAllUsers, updateUserRole } from '../controllers/user_controller';
import { authenticateToken, authorize } from '../src/middleware/auth_middleware';

const router = Router();

// Only ADMINS can see the list or change roles
router.get('/', authenticateToken, authorize(['ADMIN']), getAllUsers);
router.put('/:id/role', authenticateToken, authorize(['ADMIN']), updateUserRole);

export default router;