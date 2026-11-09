import { Router } from 'express';
import { APP_NAME, APP_VERSION, API_PREFIX } from '../config/constants.js';
import healthRouter from './health.routes.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json({
    service: APP_NAME,
    version: APP_VERSION,
    docs: `${API_PREFIX}/docs`,
    health: `${API_PREFIX}/health`,
  });
});

router.use('/health', healthRouter);

export default router;
