import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const REQUEST_TIMEOUT_MS = 60_000;

function assertConfigured() {
  if (!env.GROQ_API_KEY) {
    throw new AppError(
      503,
      'AI_NOT_CONFIGURED',
      'El servicio de IA no está configurado. Falta GROQ_API_KEY en el backend.',
    );
  }
}

function parseFailedToolCall(failedGeneration) {
  if (typeof failedGeneration !== 'string') {
    return null;
  }

  try {
    const parsed = JSON.parse(failedGeneration);
    if (!parsed?.name || typeof parsed.name !== 'string') {
      return null;
    }

    return {
      id: `recovered_${Date.now().toString(36)}`,
      name: parsed.name,
      arguments:
        typeof parsed.arguments === 'string'
          ? parsed.arguments
          : JSON.stringify(parsed.arguments ?? {}),
    };
  } catch {
    return null;
  }
}

function mapUpstreamError(status, body) {
  const payload = body?.error ?? {};

  if (status === 401 || status === 403) {
    return new AppError(
      503,
      'AI_AUTH_ERROR',
      'El servicio de IA rechazó la autenticación configurada.',
    );
  }

  if (status === 429) {
    const error = new AppError(
      503,
      'AI_RATE_LIMITED',
      'El servicio de IA está temporalmente saturado. Intenta de nuevo en unos segundos.',
    );
    error.retryAfterSeconds = 6;
    return error;
  }

  if (status >= 400 && status < 500) {
    return new AppError(
      502,
      'AI_BAD_REQUEST',
      payload.message
        ? `El servicio de IA rechazó la solicitud: ${payload.message}`
        : 'El servicio de IA rechazó la solicitud generada.',
    );
  }

  return new AppError(
    502,
    'AI_UPSTREAM_ERROR',
    'No se pudo obtener respuesta del servicio de IA.',
  );
}

/**
 * Llama a la API de Groq (compatible con OpenAI) usando fetch directo.
 * Se evita el SDK para poder inspeccionar el cuerpo de error completo:
 * gpt-oss puede devolver `tool_use_failed` con la llamada que intentó hacer,
 * y esa información permite recuperar el paso en lugar de abortar el agente.
 */
export async function generateChatCompletion({
  model,
  messages,
  temperature,
  maxTokens,
  tools = null,
}) {
  assertConfigured();

  const request = {
    model,
    messages,
    temperature,
    max_completion_tokens: maxTokens,
    stream: false,
  };

  if (Array.isArray(tools) && tools.length > 0) {
    request.tools = tools;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  let text;

  try {
    response = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    text = await response.text();
  } catch {
    throw new AppError(
      502,
      'AI_UPSTREAM_ERROR',
      'No se pudo obtener respuesta del servicio de IA.',
    );
  } finally {
    clearTimeout(timer);
  }

  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  if (!response.ok) {
    const payload = body?.error ?? {};

    // El modelo intentó invocar una herramienta que ya no estaba disponible.
    // Se devuelve la llamada para que el agente la procese como un paso más.
    if (payload.code === 'tool_use_failed') {
      const recovered = parseFailedToolCall(payload.failed_generation);
      if (recovered) {
        return {
          content: '',
          finishReason: 'tool_calls',
          toolCalls: [recovered],
          model,
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        };
      }
    }

    throw mapUpstreamError(response.status, body);
  }

  const choice = body?.choices?.[0];
  const message = choice?.message;
  const rawToolCalls = Array.isArray(message?.tool_calls)
    ? message.tool_calls
    : [];
  const toolCalls = rawToolCalls
    .filter((toolCall) => toolCall?.function?.name)
    .map((toolCall) => ({
      id: toolCall.id,
      name: toolCall.function.name,
      arguments: toolCall.function.arguments ?? '{}',
    }));
  const content = typeof message?.content === 'string' ? message.content : '';

  if (content.trim().length === 0 && toolCalls.length === 0) {
    throw new AppError(
      502,
      'AI_EMPTY_RESPONSE',
      'El servicio de IA devolvió una respuesta vacía.',
    );
  }

  const usage = body?.usage ?? {};
  const promptTokens = Math.max(0, Number(usage.prompt_tokens) || 0);
  const completionTokens = Math.max(0, Number(usage.completion_tokens) || 0);
  const totalTokens = Math.max(
    0,
    Number(usage.total_tokens) || promptTokens + completionTokens,
  );

  return {
    content: content.trim(),
    finishReason: choice?.finish_reason ?? null,
    toolCalls,
    model: body?.model ?? model,
    usage: {
      promptTokens,
      completionTokens,
      totalTokens,
    },
  };
}
