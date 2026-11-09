import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';

function normalizeError(error) {
  if (error instanceof AppError) {
    return error;
  }

  if (error?.name === 'ZodError') {
    return new AppError(
      400,
      'VALIDATION_ERROR',
      'Los datos enviados no son válidos.',
      error.issues?.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    );
  }

  if (error?.type === 'entity.parse.failed') {
    return new AppError(
      400,
      'INVALID_JSON',
      'El cuerpo de la solicitud no contiene JSON válido.',
    );
  }

  if (error?.type === 'entity.too.large') {
    return new AppError(
      413,
      'PAYLOAD_TOO_LARGE',
      'El cuerpo de la solicitud es demasiado grande.',
    );
  }

  if (error?.code === 'ER_DUP_ENTRY') {
    return new AppError(
      409,
      'DUPLICATE_ENTRY',
      'Ya existe un registro con esos datos.',
    );
  }

  if (error?.code === 'ER_ROW_IS_REFERENCED_2') {
    return new AppError(
      409,
      'RESOURCE_IN_USE',
      'No se puede eliminar porque tiene registros relacionados.',
    );
  }

  if (error?.code === 'ER_NO_REFERENCED_ROW_2') {
    return new AppError(
      409,
      'INVALID_REFERENCE',
      'La referencia indicada no existe.',
    );
  }

  if (error?.code === 'ECONNREFUSED') {
    return new AppError(
      503,
      'DATABASE_UNAVAILABLE',
      'La base de datos no está disponible.',
    );
  }

  return new AppError(
    500,
    'INTERNAL_ERROR',
    'Ocurrió un error interno en el servidor.',
  );
}

export function notFound(req, _res, next) {
  next(
    new AppError(
      404,
      'NOT_FOUND',
      `La ruta ${req.method} ${req.originalUrl} no existe.`,
    ),
  );
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const normalized = normalizeError(error);

  if (normalized.statusCode >= 500) {
    console.error(`[${req.id}]`, error);
  } else if (env.NODE_ENV !== 'test') {
    console.warn(
      `[${req.id}] ${normalized.statusCode} ${normalized.code}: ${normalized.message}`,
    );
  }

  const body = {
    error: {
      code: normalized.code,
      message: normalized.message,
    },
    requestId: req.id,
  };

  if (normalized.details) {
    body.error.details = normalized.details;
  }

  if (env.NODE_ENV === 'development' && normalized.statusCode >= 500) {
    body.error.stack = error?.stack;
  }

  res.status(normalized.statusCode).json(body);
}
