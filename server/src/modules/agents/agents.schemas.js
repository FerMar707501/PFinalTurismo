import { z } from 'zod';

const budget = z.enum(['bajo', 'medio', 'alto']);

const commonFields = {
  originCity: z.string().trim().min(2).max(120).default('Bogotá'),
  travelers: z.coerce.number().int().min(1).max(20).default(2),
  budget: budget.default('medio'),
  interests: z
    .array(z.string().trim().min(1).max(60))
    .max(8)
    .default([]),
};

export const itineraryBody = z.object({
  destinationId: z.coerce
    .number()
    .int()
    .positive('El ID del destino es inválido.'),
  days: z.coerce.number().int().min(1).max(15),
  ...commonFields,
  notes: z.string().trim().max(500).optional(),
});

export const compareBody = z.object({
  destinationIds: z
    .array(z.coerce.number().int().positive())
    .min(2, 'Debes indicar al menos dos destinos.')
    .max(4, 'Puedes comparar como máximo cuatro destinos.')
    .refine((ids) => new Set(ids).size === ids.length, {
      message: 'No puedes repetir destinos en la comparación.',
    }),
  days: z.coerce.number().int().min(1).max(15).default(3),
  ...commonFields,
});

export const runIdParams = z.object({
  id: z.coerce.number().int().positive('ID de ejecución inválido.'),
});

export const listRunsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  serviceCode: z.enum(['agent_itinerary', 'agent_compare']).optional(),
  status: z.enum(['running', 'success', 'error', 'partial']).optional(),
});
