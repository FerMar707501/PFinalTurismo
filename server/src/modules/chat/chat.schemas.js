import { z } from 'zod';

export const sendMessageBody = z.object({
  message: z
    .string()
    .trim()
    .min(1, 'El mensaje es obligatorio.')
    .max(4000, 'El mensaje no puede superar 4000 caracteres.'),
  conversationId: z.coerce
    .number()
    .int()
    .positive('El ID de conversación es inválido.')
    .optional(),
});

export const conversationIdParams = z.object({
  id: z.coerce.number().int().positive('ID de conversación inválido.'),
});

export const listConversationsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => value || undefined),
});

export const conversationDetailQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
