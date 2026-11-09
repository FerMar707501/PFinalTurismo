import { AppError } from '../errors/AppError.js';
import { verifyToken } from '../utils/jwt.js';
import {
  findUserRecordById,
  toPublicUser,
} from '../modules/users/users.repository.js';

function hasAuthorizationHeader(req) {
  return Boolean(req.get('authorization'));
}

function extractBearerToken(req) {
  const header = req.get('authorization');
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
}

function decodePayload(token) {
  try {
    return verifyToken(token);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError(
        401,
        'TOKEN_EXPIRED',
        'La sesión expiró. Inicia sesión de nuevo.',
      );
    }

    throw new AppError(
      401,
      'INVALID_TOKEN',
      'El token de autenticación no es válido.',
    );
  }
}

async function resolveUser(token) {
  const payload = decodePayload(token);
  const userId = Number(payload?.sub);

  if (!Number.isInteger(userId) || userId <= 0) {
    throw new AppError(
      401,
      'INVALID_TOKEN',
      'El token de autenticación no es válido.',
    );
  }

  const record = await findUserRecordById(userId);

  if (!record) {
    throw new AppError(
      401,
      'INVALID_TOKEN',
      'El usuario del token ya no existe.',
    );
  }

  if (!record.active) {
    throw new AppError(
      403,
      'USER_INACTIVE',
      'La cuenta está desactivada. Contacta al administrador.',
    );
  }

  return toPublicUser(record);
}

export async function authenticate(req, _res, next) {
  try {
    const token = extractBearerToken(req);

    if (!token) {
      throw new AppError(
        401,
        'UNAUTHORIZED',
        'Debes iniciar sesión para acceder a este recurso.',
      );
    }

    req.user = await resolveUser(token);
    next();
  } catch (error) {
    next(error);
  }
}

export async function optionalAuthenticate(req, _res, next) {
  if (!hasAuthorizationHeader(req)) {
    return next();
  }

  try {
    const token = extractBearerToken(req);
    if (!token) {
      return next();
    }

    req.user = await resolveUser(token);
  } catch {
    // En rutas públicas un token inválido se trata como acceso anónimo.
  }

  return next();
}

export function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(
        new AppError(
          401,
          'UNAUTHORIZED',
          'Debes iniciar sesión para acceder a este recurso.',
        ),
      );
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          403,
          'FORBIDDEN',
          'No tienes permisos para realizar esta acción.',
        ),
      );
    }

    return next();
  };
}

export const requireAdmin = authorize('admin');
