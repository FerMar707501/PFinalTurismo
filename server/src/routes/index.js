import { Router } from 'express';
import { APP_NAME, APP_VERSION, API_PREFIX } from '../config/constants.js';
import healthRouter from './health.routes.js';
import authRouter from '../modules/auth/auth.routes.js';
import usersRouter from '../modules/users/users.routes.js';
import destinationsRouter from '../modules/catalog/destinations.routes.js';
import activitiesRouter from '../modules/catalog/activities.routes.js';
import servicesRouter from '../modules/services/services.routes.js';
import usageRouter from '../modules/usage/usage.routes.js';
import chatRouter from '../modules/chat/chat.routes.js';
import agentsRouter from '../modules/agents/agents.routes.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json({
    service: APP_NAME,
    version: APP_VERSION,
    docs: `${API_PREFIX}/docs`,
    health: `${API_PREFIX}/health`,
    endpoints: {
      auth: `${API_PREFIX}/auth`,
      users: `${API_PREFIX}/users`,
      destinations: `${API_PREFIX}/destinations`,
      activities: `${API_PREFIX}/activities`,
      services: `${API_PREFIX}/services`,
      usage: `${API_PREFIX}/usage`,
      chat: `${API_PREFIX}/chat`,
      agents: `${API_PREFIX}/agents`,
    },
  });
});

router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use('/users', usersRouter);
router.use('/destinations', destinationsRouter);
router.use('/activities', activitiesRouter);
router.use('/services', servicesRouter);
router.use('/usage', usageRouter);
router.use('/chat', chatRouter);
router.use('/agents', agentsRouter);

export default router;
