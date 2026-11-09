import { z } from 'zod';

const nameSchema = z.string().trim().min(2).max(180);
const descriptionSchema = z.string().trim().min(10).max(5000);
const categorySchema = z.string().trim().min(2).max(80);

const coordinateSchema = (min, max, label) =>
  z.coerce
    .number()
    .finite()
    .min(min, `${label} fuera de rango.`)
    .max(max, `${label} fuera de rango.`)
    .nullable()
    .optional();

export const createActivityBody = z.object({
  destinationId: z.coerce.number().int().positive('Destino inválido.'),
  name: nameSchema,
  description: descriptionSchema,
  category: categorySchema,
  durationMin: z.coerce.number().int().min(0).max(65535).default(0),
  price: z.coerce
    .number()
    .finite()
    .min(0)
    .max(9_999_999_999.99)
    .default(0),
  lat: coordinateSchema(-90, 90, 'Latitud'),
  lng: coordinateSchema(-180, 180, 'Longitud'),
  active: z.boolean().default(true),
});

export const updateActivityBody = z
  .object({
    destinationId: z.coerce.number().int().positive('Destino inválido.').optional(),
    name: nameSchema.optional(),
    description: descriptionSchema.optional(),
    category: categorySchema.optional(),
    durationMin: z.coerce.number().int().min(0).max(65535).optional(),
    price: z.coerce
      .number()
      .finite()
      .min(0)
      .max(9_999_999_999.99)
      .optional(),
    lat: coordinateSchema(-90, 90, 'Latitud'),
    lng: coordinateSchema(-180, 180, 'Longitud'),
    active: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debes enviar al menos un campo para actualizar.',
  });

export const listActivitiesQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => value || undefined),
  destinationId: z.coerce.number().int().positive().optional(),
  category: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((value) => value || undefined),
  active: z
    .enum(['true', 'false', '1', '0'])
    .transform((value) => value === 'true' || value === '1')
    .optional(),
});

export const activityIdParams = z.object({
  id: z.coerce.number().int().positive('ID inválido.'),
});
