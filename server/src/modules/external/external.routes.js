import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { usageQuery } from '../analytics/analytics.schemas.js';
import {
  authenticateApiClient,
  getUsageAnalytics,
} from '../analytics/analytics.service.js';

const router = Router();

/**
 * Lectura para consumidores externos (Power BI, Excel, scripts).
 * Se autentica con la cabecera X-API-Key, no con el JWT de un usuario.
 */
router.get(
  '/usage',
  validate({ query: usageQuery }),
  async (req, res) => {
    const client = await authenticateApiClient(req.get('x-api-key'));
    const result = await getUsageAnalytics(req.validatedQuery);

    res.set('Cache-Control', 'no-store');
    res.set('X-API-Client', client.name);
    res.json(result);
  },
);

export default router;
