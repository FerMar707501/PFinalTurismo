import { z } from 'zod';
import { env } from '../../config/env.js';

const emailSchema = z.preprocess(
  (value) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  z.string().email('Correo inválido.').max(190, 'El correo es demasiado largo.'),
);

const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres.')
  .max(72, 'La contraseña no puede superar 72 caracteres.');

const roleSchema = z.enum(['admin', 'user']);
const tokenLimitSchema = z.coerce
  .number()
  .int()
  .min(0, 'El límite de tokens no puede ser negativo.')
  .max(10_000_000, 'El límite de tokens es demasiado alto.');

export const userIdParams = z.object({
  id: z.coerce.number().int().positive('ID inválido.'),
});

export const listUsersQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => value || undefined),
  role: roleSchema.optional(),
  active: z
    .enum(['true', 'false', '1', '0'])
    .transform((value) => value === 'true' || value === '1')
    .optional(),
});

export const createUserBody = z.object({
  name: z.string().trim().min(2).max(120),
  email: emailSchema,
  password: passwordSchema,
  role: roleSchema.default('user'),
  tokenLimitMonth: tokenLimitSchema.default(env.TOKEN_QUOTA_DEFAULT),
  active: z.boolean().default(true),
});

export const updateUserBody = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    email: emailSchema.optional(),
    password: passwordSchema.optional(),
    role: roleSchema.optional(),
    tokenLimitMonth: tokenLimitSchema.optional(),
    active: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debes enviar al menos un campo para actualizar.',
  });
