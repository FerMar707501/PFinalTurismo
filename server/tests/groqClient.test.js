import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// El módulo lee GROQ_API_KEY al llamar, pero env se valida al importar.
vi.hoisted(() => {
  process.env.GROQ_API_KEY = 'gsk_test_clave_de_pruebas';
});

import { generateChatCompletion } from '../src/ai/groqClient.js';

const originalFetch = global.fetch;

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  };
}

describe('Cliente de Groq', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('interpreta una respuesta correcta con contenido', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        model: 'openai/gpt-oss-120b',
        choices: [
          { message: { content: 'Hola desde Groq' }, finish_reason: 'stop' },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      }),
    );

    const result = await generateChatCompletion({
      model: 'openai/gpt-oss-120b',
      messages: [{ role: 'user', content: 'Hola' }],
      temperature: 0.2,
      maxTokens: 100,
    });

    expect(result.content).toBe('Hola desde Groq');
    expect(result.usage.totalTokens).toBe(15);
    expect(result.toolCalls).toEqual([]);
  });

  it('recupera la llamada cuando Groq responde tool_use_failed', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse(400, {
        error: {
          message: 'Tool choice is none, but model called a tool',
          type: 'invalid_request_error',
          code: 'tool_use_failed',
          failed_generation:
            '{"name": "get_destination_info", "arguments": {"destinationId": 6}}',
        },
      }),
    );

    const result = await generateChatCompletion({
      model: 'openai/gpt-oss-120b',
      messages: [{ role: 'user', content: 'Itinerario' }],
      temperature: 0.2,
      maxTokens: 100,
    });

    expect(result.finishReason).toBe('tool_calls');
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0].name).toBe('get_destination_info');
    expect(JSON.parse(result.toolCalls[0].arguments)).toEqual({
      destinationId: 6,
    });
  });

  it('traduce el límite de tasa a AI_RATE_LIMITED', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(jsonResponse(429, { error: { message: 'rate limit' } }));

    await expect(
      generateChatCompletion({
        model: 'openai/gpt-oss-120b',
        messages: [{ role: 'user', content: 'Hola' }],
        temperature: 0.2,
        maxTokens: 100,
      }),
    ).rejects.toMatchObject({ code: 'AI_RATE_LIMITED' });
  });

  it('traduce una clave inválida a AI_AUTH_ERROR', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(jsonResponse(401, { error: { message: 'invalid key' } }));

    await expect(
      generateChatCompletion({
        model: 'openai/gpt-oss-120b',
        messages: [{ role: 'user', content: 'Hola' }],
        temperature: 0.2,
        maxTokens: 100,
      }),
    ).rejects.toMatchObject({ code: 'AI_AUTH_ERROR' });
  });

  it('rechaza respuestas vacías', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        choices: [{ message: { content: '' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 1, completion_tokens: 0, total_tokens: 1 },
      }),
    );

    await expect(
      generateChatCompletion({
        model: 'openai/gpt-oss-120b',
        messages: [{ role: 'user', content: 'Hola' }],
        temperature: 0.2,
        maxTokens: 100,
      }),
    ).rejects.toMatchObject({ code: 'AI_EMPTY_RESPONSE' });
  });
});
