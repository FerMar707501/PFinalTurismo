import Groq from 'groq-sdk';
import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';

let client = null;

function getClient() {
  if (!env.GROQ_API_KEY) {
    throw new AppError(
      503,
      'AI_NOT_CONFIGURED',
      'El servicio de IA no está configurado. Falta GROQ_API_KEY en el backend.',
    );
  }

  if (!client) {
    client = new Groq({ apiKey: env.GROQ_API_KEY });
  }

  return client;
}

export async function generateChatCompletion({
  model,
  messages,
  temperature,
  maxTokens,
}) {
  const groq = getClient();

  let completion;

  try {
    completion = await groq.chat.completions.create({
      model,
      messages,
      temperature,
      max_completion_tokens: maxTokens,
      stream: false,
    });
  } catch (error) {
    const status = Number(error?.status);

    if (status === 401 || status === 403) {
      throw new AppError(
        503,
        'AI_AUTH_ERROR',
        'El servicio de IA rechazó la autenticación configurada.',
      );
    }

    if (status === 429) {
      throw new AppError(
        503,
        'AI_RATE_LIMITED',
        'El servicio de IA está temporalmente saturado. Intenta de nuevo en unos segundos.',
      );
    }

    if (status >= 400 && status < 500) {
      throw new AppError(
        502,
        'AI_BAD_REQUEST',
        'El servicio de IA rechazó la solicitud generada.',
      );
    }

    throw new AppError(
      502,
      'AI_UPSTREAM_ERROR',
      'No se pudo obtener respuesta del servicio de IA.',
    );
  }

  const content = completion?.choices?.[0]?.message?.content;

  if (typeof content !== 'string' || content.trim().length === 0) {
    throw new AppError(
      502,
      'AI_EMPTY_RESPONSE',
      'El servicio de IA devolvió una respuesta vacía.',
    );
  }

  const usage = completion.usage ?? {};
  const promptTokens = Math.max(0, Number(usage.prompt_tokens) || 0);
  const completionTokens = Math.max(0, Number(usage.completion_tokens) || 0);
  const totalTokens = Math.max(
    0,
    Number(usage.total_tokens) || promptTokens + completionTokens,
  );

  return {
    content: content.trim(),
    model: completion.model ?? model,
    usage: {
      promptTokens,
      completionTokens,
      totalTokens,
    },
  };
}
