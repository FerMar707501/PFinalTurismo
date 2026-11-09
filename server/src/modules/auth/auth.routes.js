import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { loginBody } from './auth.schemas.js';
import { getMe, login } from './auth.service.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res, _next, options) => {
    res.status(options.statusCode).json({
      error: {
        code: 'TOO_MANY_LOGIN_ATTEMPTS',
        message:
          'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.',
      },
      requestId: req.id,
    });
  },
});

router.post(
  '/login',
  loginLimiter,
  validate({ body: loginBody }),
  async (req, res) => {
    const result = await login(req.body.email, req.body.password);
    res.set('Cache-Control', 'no-store');
    res.json(result);
  },
);

router.get('/me', authenticate, async (req, res) => {
  const result = await getMe(req.user);
  res.set('Cache-Control', 'no-store');
  res.json(result);
});

export default router;
