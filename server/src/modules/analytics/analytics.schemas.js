import { z } from 'zod';

const dateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Usa el formato YYYY-MM-DD.')
  .optional();

export const usageQuery = z
  .object({
    from: dateSchema,
    to: dateSchema,
    serviceCode: z.string().trim().max(60).optional(),
  })
  .refine(
    (value) =>
      !value.from ||
      !value.to ||
      new Date(`${value.from}T00:00:00Z`) <=
        new Date(`${value.to}T00:00:00Z`),
    {
      message: 'La fecha inicial no puede ser posterior a la final.',
      path: ['from'],
    },
  );

export const createClientBody = z.object({
  name: z.string().trim().min(2).max(120),
  scope: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .default('analytics:read'),
});

export const clientIdParams = z.object({
  id: z.coerce.number().int().positive('ID de cliente inválido.'),
});

export const clientStatusBody = z.object({
  active: z.boolean(),
});
