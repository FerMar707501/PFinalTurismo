import { z } from 'zod';

const nameSchema = z.string().trim().min(2).max(150);
const regionSchema = z.string().trim().min(2).max(120);
const descriptionSchema = z.string().trim().min(10).max(5000);
const categorySchema = z.string().trim().min(2).max(80);
const bestSeasonSchema = z
  .string()
  .trim()
  .max(100)
  .nullable()
  .optional();
const priceLevelSchema = z.coerce.number().int().min(1).max(4);

const coordinateSchema = (min, max, label) =>
  z.coerce
    .number()
    .finite()
    .min(min, `${label} fuera de rango.`)
    .max(max, `${label} fuera de rango.`)
    .nullable()
    .optional();

const tagsSchema = z
  .union([
    z.array(z.string().trim().min(1).max(50)).max(20),
    z.string().trim().max(255),
  ])
  .transform((value) => {
    const list = Array.isArray(value) ? value : value.split(',');
    return list
      .map((item) => item.trim())
      .filter(Boolean)
      .join(',');
  })
  .refine((value) => value.length <= 255, {
    message: 'Las etiquetas no pueden superar 255 caracteres en total.',
  });

export const createDestinationBody = z.object({
  name: nameSchema,
  region: regionSchema,
  description: descriptionSchema,
  category: categorySchema,
  tags: tagsSchema.optional(),
  lat: coordinateSchema(-90, 90, 'Latitud'),
  lng: coordinateSchema(-180, 180, 'Longitud'),
  priceLevel: priceLevelSchema.default(2),
  bestSeason: bestSeasonSchema,
  active: z.boolean().default(true),
});

export const updateDestinationBody = z
  .object({
    name: nameSchema.optional(),
    region: regionSchema.optional(),
    description: descriptionSchema.optional(),
    category: categorySchema.optional(),
    tags: tagsSchema.nullable().optional(),
    lat: coordinateSchema(-90, 90, 'Latitud'),
    lng: coordinateSchema(-180, 180, 'Longitud'),
    priceLevel: priceLevelSchema.optional(),
    bestSeason: bestSeasonSchema,
    active: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debes enviar al menos un campo para actualizar.',
  });

export const listDestinationsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => value || undefined),
  region: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => value || undefined),
  category: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((value) => value || undefined),
  tag: z
    .string()
    .trim()
    .max(50)
    .optional()
    .transform((value) => value || undefined),
  priceLevel: z.coerce.number().int().min(1).max(4).optional(),
  active: z
    .enum(['true', 'false', '1', '0'])
    .transform((value) => value === 'true' || value === '1')
    .optional(),
});

export const destinationIdParams = z.object({
  id: z.coerce.number().int().positive('ID inválido.'),
});
