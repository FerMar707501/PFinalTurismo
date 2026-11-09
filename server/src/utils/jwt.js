import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const ISSUER = 'rutaia-api';
const AUDIENCE = 'rutaia-client';

export function signToken(user) {
  return jwt.sign(
    {
      role: user.role,
      email: user.email,
    },
    env.JWT_SECRET,
    {
      subject: String(user.id),
      expiresIn: env.JWT_EXPIRES_IN,
      issuer: ISSUER,
      audience: AUDIENCE,
    },
  );
}

export function verifyToken(token) {
  return jwt.verify(token, env.JWT_SECRET, {
    issuer: ISSUER,
    audience: AUDIENCE,
  });
}
