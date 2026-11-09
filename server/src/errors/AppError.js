export class AppError extends Error {
  constructor(statusCode, code, message, details = undefined) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace?.(this, AppError);
  }

  static badRequest(message = 'Solicitud inválida', details = undefined) {
    return new AppError(400, 'BAD_REQUEST', message, details);
  }

  static unauthorized(message = 'No autenticado') {
    return new AppError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'No autorizado') {
    return new AppError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'Recurso no encontrado') {
    return new AppError(404, 'NOT_FOUND', message);
  }

  static conflict(message = 'Conflicto con el estado actual') {
    return new AppError(409, 'CONFLICT', message);
  }

  static tooManyRequests(message = 'Demasiadas solicitudes') {
    return new AppError(429, 'RATE_LIMITED', message);
  }
}
