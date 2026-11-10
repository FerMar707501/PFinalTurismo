import { Router } from 'express';
import { authenticate, requireAdmin } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
  clientIdParams,
  clientStatusBody,
  createClientBody,
  usageQuery,
} from './analytics.schemas.js';
import {
  createApiClient,
  getUsageAnalytics,
  getUsageCsv,
  listApiClients,
  setApiClientStatus,
} from './analytics.service.js';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

router.get(
  '/usage',
  validate({ query: usageQuery }),
  async (req, res) => {
    const result = await getUsageAnalytics(req.validatedQuery);
    res.set('Cache-Control', 'no-store');
    res.json(result);
  },
);

router.get(
  '/usage.csv',
  validate({ query: usageQuery }),
  async (req, res) => {
    const result = await getUsageCsv(req.validatedQuery);
    res.set('Cache-Control', 'no-store');
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    res.send(result.content);
  },
);

router.get('/clients', async (_req, res) => {
  const result = await listApiClients();
  res.set('Cache-Control', 'no-store');
  res.json({ data: result });
});

router.post(
  '/clients',
  validate({ body: createClientBody }),
  async (req, res) => {
    const result = await createApiClient(req.body);
    res.status(201).json(result);
  },
);

router.patch(
  '/clients/:id/status',
  validate({ params: clientIdParams, body: clientStatusBody }),
  async (req, res) => {
    const result = await setApiClientStatus(
      req.params.id,
      req.body.active,
    );
    res.json(result);
  },
);

export default router;
