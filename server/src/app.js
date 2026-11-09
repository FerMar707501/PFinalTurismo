import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env.js';
import { APP_NAME, APP_VERSION, API_PREFIX } from './config/constants.js';
import { openapiSpec } from './config/swagger.js';
import apiRouter from './routes/index.js';
import { requestId } from './middleware/requestId.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

// Identificador para correlacionar logs y respuestas.
app.use(requestId);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        fontSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: env.NODE_ENV === 'production' ? [] : null,
      },
    },
  }),
);

const allowedOrigins = env.CORS_ORIGIN.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowAllOrigins = allowedOrigins.includes('*');

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowAllOrigins || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-API-Key',
      'X-Request-Id',
    ],
    exposedHeaders: [
      'X-Request-Id',
      'RateLimit-Limit',
      'RateLimit-Remaining',
      'RateLimit-Reset',
    ],
    maxAge: 86400,
    optionsSuccessStatus: 204,
  }),
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health',
  handler: (req, res, _next, options) => {
    res.status(options.statusCode).json({
      error: {
        code: 'RATE_LIMITED',
        message: 'Demasiadas solicitudes. Intenta de nuevo más tarde.',
      },
      requestId: req.id,
    });
  },
});

app.use(API_PREFIX, apiLimiter);

app.get('/', (_req, res) => {
  res.json({
    service: APP_NAME,
    version: APP_VERSION,
    environment: env.NODE_ENV,
    docs: `${API_PREFIX}/docs`,
    health: `${API_PREFIX}/health`,
    timestamp: new Date().toISOString(),
  });
});

// Documentación OpenAPI
app.get(`${API_PREFIX}/docs.json`, (_req, res) => {
  res.json(openapiSpec);
});

app.use(
  `${API_PREFIX}/docs`,
  swaggerUi.serve,
  swaggerUi.setup(openapiSpec, {
    customSiteTitle: `${APP_NAME} — Documentación`,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      tryItOutEnabled: true,
      docExpansion: 'list',
    },
  }),
);

app.use(API_PREFIX, apiRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
