import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

// Carga server/.env sin importar desde qué directorio se ejecute el proceso.
loadEnv({ path: path.resolve(currentDir, '../../.env'), quiet: true });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),

  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_NAME: z.string().min(1),
  DB_CONNECTION_LIMIT: z.coerce.number().int().min(1).max(50).default(10),

  JWT_SECRET: z.string().min(16, 'debe tener al menos 16 caracteres'),
  JWT_EXPIRES_IN: z.string().min(1).default('1h'),

  GROQ_API_KEY: z.string().default(''),
  GROQ_MODEL: z.string().min(1).default('openai/gpt-oss-120b'),
  GROQ_MODEL_LITE: z.string().min(1).default('openai/gpt-oss-20b'),
  GROQ_MAX_TOKENS: z.coerce.number().int().min(1).max(32768).default(1024),
  GROQ_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.2),

  CORS_ORIGIN: z.string().min(1).default('http://localhost:5173'),
  TOKEN_QUOTA_DEFAULT: z.coerce.number().int().min(1).default(50000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Configuración inválida en server/.env:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.') || 'ENV'}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = Object.freeze(parsed.data);
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
