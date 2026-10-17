import { Router } from 'express';
import {
  pushSync,
  pullSync,
  getStats,
  getHistory,
  exportUserData,
  importUserData,
} from '../controllers/syncController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

// All sync endpoints require user authentication
router.use(requireAuth);

router.post('/push', pushSync);
router.get('/pull', pullSync);
router.get('/stats', getStats);
router.get('/history', getHistory);
router.get('/export', exportUserData);
router.post('/import', importUserData);

export default router;
