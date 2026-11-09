import { Router } from 'express';
import {
  authenticate,
  optionalAuthenticate,
  requireAdmin,
} from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
  activityIdParams,
  createActivityBody,
  listActivitiesQuery,
  updateActivityBody,
} from './activities.schemas.js';
import {
  createActivity,
  deactivateActivity,
  getActivityById,
  listActivities,
  updateActivity,
} from './activities.service.js';

const router = Router();

router.get(
  '/',
  optionalAuthenticate,
  validate({ query: listActivitiesQuery }),
  async (req, res) => {
    const result = await listActivities(req.validatedQuery, {
      isAdmin: req.user?.role === 'admin',
    });
    res.json(result);
  },
);

router.get(
  '/:id',
  optionalAuthenticate,
  validate({ params: activityIdParams }),
  async (req, res) => {
    const result = await getActivityById(req.params.id, {
      isAdmin: req.user?.role === 'admin',
    });
    res.json(result);
  },
);

router.post(
  '/',
  authenticate,
  requireAdmin,
  validate({ body: createActivityBody }),
  async (req, res) => {
    const result = await createActivity(req.body);
    res.status(201).json(result);
  },
);

router.patch(
  '/:id',
  authenticate,
  requireAdmin,
  validate({
    params: activityIdParams,
    body: updateActivityBody,
  }),
  async (req, res) => {
    const result = await updateActivity(req.params.id, req.body);
    res.json(result);
  },
);

router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  validate({ params: activityIdParams }),
  async (req, res) => {
    const result = await deactivateActivity(req.params.id);
    res.json(result);
  },
);

export default router;
