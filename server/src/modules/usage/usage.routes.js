import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { getQuotaForUser } from './usage.service.js';

const router = Router();

router.get('/me', authenticate, async (req, res) => {
  const quota = await getQuotaForUser(req.user);
  res.set('Cache-Control', 'no-store');
  res.json({ user: req.user, quota });
});

export default router;
