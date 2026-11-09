import { z } from 'zod';

const serviceCodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .regex(/^[a-z0-9_]+$/, 'Código de servicio inválido.');

export const serviceCodeParams = z.object({
  code: serviceCodeSchema,
});

export const updateServiceBody = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().min(10).max(5000).optional(),
    model: z.string().trim().min(1).max(120).optional(),
    temperature: z.coerce.number().finite().min(0).max(2).optional(),
    maxTokens: z.coerce.number().int().min(1).max(32768).optional(),
    systemPrompt: z.string().trim().min(10).max(20000).optional(),
    enabled: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debes enviar al menos un campo para actualizar.',
  });

export const toggleServiceBody = z.object({
  enabled: z.boolean(),
});
