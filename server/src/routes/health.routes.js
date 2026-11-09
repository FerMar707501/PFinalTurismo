import { Router } from 'express';
import { pool } from '../config/db.js';
import { env } from '../config/env.js';
import { APP_NAME, APP_VERSION } from '../config/constants.js';

const router = Router();

router.get('/', async (req, res) => {
  const startedAt = performance.now();

  try {
    const [rows] = await pool.query('SELECT VERSION() AS version');
    const latencyMs = Math.round((performance.now() - startedAt) * 100) / 100;

    res.json({
      status: 'ok',
      service: APP_NAME,
      version: APP_VERSION,
      environment: env.NODE_ENV,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      requestId: req.id,
      database: {
        status: 'up',
        version: rows[0].version,
        latencyMs,
      },
    });
  } catch (error) {
    console.error(`[${req.id}] Health check: MySQL no disponible (${error.code})`);

    res.status(503).json({
      status: 'degraded',
      service: APP_NAME,
      version: APP_VERSION,
      environment: env.NODE_ENV,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      requestId: req.id,
      database: {
        status: 'down',
      },
    });
  }
});

export default router;
