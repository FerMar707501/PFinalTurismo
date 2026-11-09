import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
  compareBody,
  itineraryBody,
  listRunsQuery,
  runIdParams,
} from './agents.schemas.js';
import {
  getAgentRun,
  listAgentRuns,
  runCompareAgent,
  runItineraryAgent,
} from './agents.service.js';

const router = Router();

router.use(authenticate);

router.post(
  '/itinerary',
  validate({ body: itineraryBody }),
  async (req, res) => {
    const result = await runItineraryAgent(req.user, req.body);
    res.set('Cache-Control', 'no-store');
    res.status(201).json(result);
  },
);

router.post(
  '/compare',
  validate({ body: compareBody }),
  async (req, res) => {
    const result = await runCompareAgent(req.user, req.body);
    res.set('Cache-Control', 'no-store');
    res.status(201).json(result);
  },
);

router.get(
  '/runs',
  validate({ query: listRunsQuery }),
  async (req, res) => {
    const result = await listAgentRuns(req.user.id, req.validatedQuery);
    res.set('Cache-Control', 'no-store');
    res.json(result);
  },
);

router.get(
  '/runs/:id',
  validate({ params: runIdParams }),
  async (req, res) => {
    const result = await getAgentRun(req.user.id, req.params.id);
    res.set('Cache-Control', 'no-store');
    res.json(result);
  },
);

export default router;
