import { env } from '../../config/env.js';
import { AppError } from '../../errors/AppError.js';
import { signToken } from '../../utils/jwt.js';
import { verifyPassword } from '../../utils/password.js';
import {
  findUserRecordByEmail,
  toPublicUser,
} from '../users/users.repository.js';
import { getQuotaForUser } from '../usage/usage.service.js';

export async function login(email, password) {
  const record = await findUserRecordByEmail(email);

  if (!record) {
    throw new AppError(
      401,
      'INVALID_CREDENTIALS',
      'Correo o contraseña incorrectos.',
    );
  }

  const passwordIsValid = await verifyPassword(
    password,
    record.password_hash,
  );

  if (!passwordIsValid) {
    throw new AppError(
      401,
      'INVALID_CREDENTIALS',
      'Correo o contraseña incorrectos.',
    );
  }

  if (!record.active) {
    throw new AppError(
      403,
      'USER_INACTIVE',
      'La cuenta está desactivada. Contacta al administrador.',
    );
  }

  const user = toPublicUser(record);
  const token = signToken(user);
  const quota = await getQuotaForUser(user);

  return {
    token,
    tokenType: 'Bearer',
    expiresIn: env.JWT_EXPIRES_IN,
    user,
    quota,
  };
}

export async function getMe(user) {
  const quota = await getQuotaForUser(user);

  return { user, quota };
}
