import { Router } from 'express';
import { authenticate, requireAdmin } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
  createUserBody,
  listUsersQuery,
  updateUserBody,
  userIdParams,
} from './users.schemas.js';
import {
  createUser,
  deactivateUser,
  getUserDetail,
  listUsers,
  updateUser,
} from './users.service.js';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/', validate({ query: listUsersQuery }), async (req, res) => {
  const result = await listUsers(req.validatedQuery);
  res.json(result);
});

router.get('/:id', validate({ params: userIdParams }), async (req, res) => {
  const result = await getUserDetail(req.params.id);
  res.json(result);
});

router.post('/', validate({ body: createUserBody }), async (req, res) => {
  const result = await createUser(req.body);
  res.status(201).json(result);
});

router.patch(
  '/:id',
  validate({ params: userIdParams, body: updateUserBody }),
  async (req, res) => {
    const result = await updateUser(req.params.id, req.body, req.user.id);
    res.json(result);
  },
);

router.delete(
  '/:id',
  validate({ params: userIdParams }),
  async (req, res) => {
    const result = await deactivateUser(req.params.id, req.user.id);
    res.json({
      message: 'Usuario desactivado correctamente.',
      ...result,
    });
  },
);

export default router;
