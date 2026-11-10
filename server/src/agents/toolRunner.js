import { generateChatCompletion } from '../ai/groqClient.js';
import { AppError } from '../errors/AppError.js';

export const AGENT_MAX_STEPS = 8;
const RATE_LIMIT_MAX_RETRIES = 2;
const RATE_LIMIT_DEFAULT_WAIT_MS = 6000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function completeWithRetry(options) {
  let lastError;

  for (let attempt = 0; attempt <= RATE_LIMIT_MAX_RETRIES; attempt += 1) {
    try {
      return await generateChatCompletion(options);
    } catch (error) {
      lastError = error;

      if (error?.code !== 'AI_RATE_LIMITED' || attempt === RATE_LIMIT_MAX_RETRIES) {
        throw error;
      }

      const waitMs = Math.max(
        RATE_LIMIT_DEFAULT_WAIT_MS,
        (Number(error.retryAfterSeconds) || 0) * 1000,
      );
      await sleep(waitMs);
    }
  }

  throw lastError;
}

function parseArguments(rawArguments) {
  try {
    const parsed = JSON.parse(rawArguments || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    throw new AppError(
      400,
      'INVALID_TOOL_ARGUMENTS',
      'La herramienta recibió argumentos JSON inválidos.',
    );
  }
}

function toolErrorMessage(error) {
  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.message,
    };
  }

  if (error?.name === 'ZodError') {
    return {
      code: 'INVALID_TOOL_ARGUMENTS',
      message: 'Los argumentos de la herramienta no son válidos.',
    };
  }

  return {
    code: 'TOOL_EXECUTION_ERROR',
    message: 'No se pudo ejecutar la herramienta.',
  };
}

function dedupeSources(sources) {
  const seen = new Set();

  return sources.filter((source) => {
    const key = [source.sourceType, source.sourceId, source.title, source.url].join('|');

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

/**
 * Resumen de respaldo cuando el agente agota los pasos sin redactar el texto
 * final (por ejemplo, porque gpt-oss insiste en seguir llamando herramientas).
 * Usa los resultados reales de las herramientas ya ejecutadas para no perder
 * el trabajo de los pasos anteriores.
 */
function buildFallbackAnswer(steps) {
  const lines = ['Resumen elaborado con la información consultada:'];

  for (const step of steps) {
    for (const result of step.results ?? []) {
      if (!result.ok) {
        continue;
      }

      const payload = result.result;
      const label = String(result.tool).replaceAll('_', ' ');

      if (payload && typeof payload === 'object') {
        const name = payload.name ?? payload.destination?.name;
        const summary = payload.summary ?? payload.description;
        const items = payload.activities ?? payload.items;

        if (Array.isArray(items) && items.length > 0) {
          lines.push(`- ${label}: ${items.length} elemento(s) disponibles.`);
          for (const item of items.slice(0, 8)) {
            const title = item.name ?? item.title ?? item.day;
            const price = item.price != null ? ` · Q${item.price} GTQ` : '';
            if (title) {
              lines.push(`  · ${title}${price}`);
            }
          }
          continue;
        }

        if (name) {
          lines.push(`- ${label}: ${name}${summary ? ` — ${String(summary).slice(0, 160)}` : ''}`);
          continue;
        }
      }

      lines.push(`- ${label}: consultado correctamente.`);
    }
  }

  return lines.length > 1 ? lines.join('\n') : '';
}

export async function runToolAgent({
  model,
  temperature,
  maxTokens,
  systemPrompt,
  userPrompt,
  tools,
  executeTool,
  maxSteps = AGENT_MAX_STEPS,
}) {
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
  const steps = [];
  const sources = [];
  const usage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };
  let answer = '';
  let finishReason = null;

  try {
    for (let step = 0; step < maxSteps; step += 1) {
      const isLastStep = step === maxSteps - 1;
      // En el último paso se quitan las herramientas (en lugar de usar
      // tool_choice: 'none') porque gpt-oss sigue invocándolas y Groq
      // devuelve 400 "Tool choice is none, but model called a tool".
      const completion = await completeWithRetry({
        model,
        messages,
        temperature,
        maxTokens,
        tools: isLastStep ? null : tools,
      });

      usage.promptTokens += completion.usage?.promptTokens ?? 0;
      usage.completionTokens += completion.usage?.completionTokens ?? 0;
      usage.totalTokens += completion.usage?.totalTokens ?? 0;
      finishReason = completion.finishReason ?? finishReason;

      const toolCalls = completion.toolCalls ?? [];
      const stepRecord = {
        step: step + 1,
        type: 'tool_calls',
        content: completion.content || null,
        toolCalls: toolCalls.map((toolCall) => ({
          id: toolCall.id,
          name: toolCall.name,
          arguments: toolCall.arguments,
        })),
        results: [],
      };
      steps.push(stepRecord);

      if (toolCalls.length === 0) {
        stepRecord.type = 'final';
        answer = (completion.content ?? '').trim();
        break;
      }

      if (isLastStep) {
        stepRecord.type = 'limit';
        answer = (completion.content ?? '').trim();
        break;
      }

      messages.push({
        role: 'assistant',
        content: completion.content || null,
        tool_calls: toolCalls.map((toolCall) => ({
          id: toolCall.id,
          type: 'function',
          function: {
            name: toolCall.name,
            arguments: toolCall.arguments,
          },
        })),
      });

      const executions = await Promise.all(
        toolCalls.map(async (toolCall) => {
          const startedAt = Date.now();
          let resultData;
          let resultSources = [];
          let error = null;

          try {
            const args = parseArguments(toolCall.arguments);
            const result = await executeTool(toolCall.name, args);
            resultData = result?.data ?? result;
            resultSources = result?.sources ?? [];
          } catch (toolError) {
            error = toolErrorMessage(toolError);
            resultData = { error };
          }

          return {
            toolCall,
            data: resultData,
            sources: resultSources,
            record: {
              tool: toolCall.name,
              arguments: toolCall.arguments,
              ok: error === null,
              error,
              durationMs: Date.now() - startedAt,
              result: resultData,
            },
          };
        }),
      );

      for (const execution of executions) {
        stepRecord.results.push(execution.record);
        sources.push(...execution.sources);
        messages.push({
          role: 'tool',
          tool_call_id: execution.toolCall.id,
          content: JSON.stringify(execution.data),
        });
      }
    }

    if (!answer) {
      answer = buildFallbackAnswer(steps);
    }

    if (!answer) {
      throw new AppError(
        502,
        'AGENT_INCOMPLETE',
        'El agente no produjo una respuesta final dentro del límite de pasos.',
      );
    }

    return {
      content: answer,
      steps,
      sources: dedupeSources(sources),
      usage,
      finishReason,
    };
  } catch (error) {
    if (error && typeof error === 'object') {
      error.agentSteps = steps;
      error.agentUsage = usage;
      error.agentSources = dedupeSources(sources);
    }

    throw error;
  }
}
