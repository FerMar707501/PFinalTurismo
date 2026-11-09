import { generateChatCompletion } from '../ai/groqClient.js';
import { AppError } from '../errors/AppError.js';

export const AGENT_MAX_STEPS = 6;

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
    const key = [
      source.sourceType,
      source.sourceId,
      source.title,
      source.url,
    ].join('|');

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
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
      const completion = await generateChatCompletion({
        model,
        messages,
        temperature,
        maxTokens,
        tools,
        toolChoice: isLastStep ? 'none' : 'auto',
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
