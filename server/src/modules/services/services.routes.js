import { Router } from 'express';
import {
  authenticate,
  optionalAuthenticate,
  requireAdmin,
} from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
  serviceCodeParams,
  toggleServiceBody,
  updateServiceBody,
} from './services.schemas.js';
import {
  getServiceByCode,
  listServices,
  updateService,
} from './services.service.js';

const router = Router();

router.get('/', optionalAuthenticate, async (req, res) => {
  const result = await listServices({
    isAdmin: req.user?.role === 'admin',
  });
  res.json(result);
});

router.get(
  '/:code',
  optionalAuthenticate,
  validate({ params: serviceCodeParams }),
  async (req, res) => {
    const result = await getServiceByCode(req.params.code, {
      isAdmin: req.user?.role === 'admin',
    });
    res.json(result);
  },
);

router.patch(
  '/:code/status',
  authenticate,
  requireAdmin,
  validate({ params: serviceCodeParams, body: toggleServiceBody }),
  async (req, res) => {
    const result = await updateService(
      req.params.code,
      { enabled: req.body.enabled },
      { isAdmin: true },
    );
    res.json(result);
  },
);

router.patch(
  '/:code',
  authenticate,
  requireAdmin,
  validate({ params: serviceCodeParams, body: updateServiceBody }),
  async (req, res) => {
    const result = await updateService(req.params.code, req.body, {
      isAdmin: true,
    });
    res.json(result);
  },
);

export default router;
