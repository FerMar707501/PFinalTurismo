import { Router } from 'express';
import {
  authenticate,
  optionalAuthenticate,
  requireAdmin,
} from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
  createDestinationBody,
  destinationIdParams,
  listDestinationsQuery,
  updateDestinationBody,
} from './destinations.schemas.js';
import {
  createDestination,
  deactivateDestination,
  getDestinationById,
  listDestinations,
  updateDestination,
} from './destinations.service.js';

const router = Router();

router.get(
  '/',
  optionalAuthenticate,
  validate({ query: listDestinationsQuery }),
  async (req, res) => {
    const result = await listDestinations(req.validatedQuery, {
      isAdmin: req.user?.role === 'admin',
    });
    res.json(result);
  },
);

router.get(
  '/:id',
  optionalAuthenticate,
  validate({ params: destinationIdParams }),
  async (req, res) => {
    const result = await getDestinationById(req.params.id, {
      isAdmin: req.user?.role === 'admin',
    });
    res.json(result);
  },
);

router.post(
  '/',
  authenticate,
  requireAdmin,
  validate({ body: createDestinationBody }),
  async (req, res) => {
    const result = await createDestination(req.body);
    res.status(201).json(result);
  },
);

router.patch(
  '/:id',
  authenticate,
  requireAdmin,
  validate({
    params: destinationIdParams,
    body: updateDestinationBody,
  }),
  async (req, res) => {
    const result = await updateDestination(req.params.id, req.body);
    res.json(result);
  },
);

router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  validate({ params: destinationIdParams }),
  async (req, res) => {
    const result = await deactivateDestination(req.params.id);
    res.json(result);
  },
);

export default router;
