import { z } from 'zod';

const emailSchema = z.preprocess(
  (value) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  z.string().email('Correo inválido.').max(190, 'El correo es demasiado largo.'),
);

export const loginBody = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, 'La contraseña es obligatoria.')
    .max(72, 'La contraseña no puede superar 72 caracteres.'),
});
