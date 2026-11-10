import { pool, withTransaction } from '../../config/db.js';
import { generateChatCompletion } from '../../ai/groqClient.js';
import { AppError } from '../../errors/AppError.js';
import { buildContext, retrieveDocuments } from '../../rag/retrieval.js';
import { SCOPE_RULE } from '../../config/country.js';
import { getPagination } from '../../utils/pagination.js';
import { getServiceByCode } from '../services/services.service.js';
import {
  assertQuotaAvailable,
  estimateTokens,
  getQuotaForUser,
  recordUsage,
} from '../usage/usage.service.js';

const CHAT_SERVICE_CODE = 'chat_rag';
const HISTORY_LIMIT = 10;
const RETRIEVAL_HISTORY_MESSAGES = 2;
const TITLE_MAX_LENGTH = 120;
const RAG_TOP_K = 5;

function parseJson(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  return value;
}

export function serializeConversation(row) {
  const conversation = {
    id: Number(row.id),
    title: row.title ?? null,
    serviceCode: row.service_code,
    lastMessageAt: row.last_message_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  if (row.message_count !== undefined && row.message_count !== null) {
    conversation.messageCount = Number(row.message_count);
  }

  if (row.last_message_content !== undefined && row.last_message_content !== null) {
    conversation.lastMessage = row.last_message_content;
  }

  return conversation;
}

export function serializeMessage(row) {
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    conversationId: Number(row.conversation_id),
    role: row.role,
    content: row.content,
    sources: parseJson(row.sources_json) ?? [],
    tokensIn: Number(row.tokens_in),
    tokensOut: Number(row.tokens_out),
    createdAt: row.created_at,
  };
}

async function getOwnedConversation(userId, conversationId) {
  const [rows] = await pool.execute(
    `SELECT *
     FROM conversations
     WHERE id = $1 AND user_id = $2 AND service_code = $3
     LIMIT 1`,
    [conversationId, userId, CHAT_SERVICE_CODE],
  );

  if (!rows[0]) {
    throw AppError.notFound('Conversación no encontrada.');
  }

  return rows[0];
}

async function getConversationHistory(conversationId) {
  const [rows] = await pool.execute(
    `SELECT role, content
     FROM messages
     WHERE conversation_id = $1 AND role IN ('user', 'assistant')
     ORDER BY id DESC
     LIMIT ${HISTORY_LIMIT}`,
    [conversationId],
  );

  return rows.reverse();
}

function buildRetrievalQuery(message, history) {
  const previousUserMessages = history
    .filter((item) => item.role === 'user')
    .slice(-RETRIEVAL_HISTORY_MESSAGES)
    .map((item) => item.content);

  return [...previousUserMessages, message].join(' ');
}

function buildPromptMessages({ service, history, message, sources }) {
  const context = buildContext(sources);
  const systemContent = [
    service.systemPrompt,
    SCOPE_RULE,
    '',
    'CONTEXTO RECUPERADO DEL CATÁLOGO:',
    context,
  ].join('\n');

  return [
    { role: 'system', content: systemContent },
    ...history.map((item) => ({
      role: item.role,
      content: item.content,
    })),
    { role: 'user', content: message },
  ];
}

function estimatePromptTokens(messages) {
  return messages.reduce(
    (total, message) => total + estimateTokens(message.content) + 4,
    0,
  );
}

function buildTitle(message) {
  const clean = message.replace(/\s+/g, ' ').trim();

  if (clean.length <= TITLE_MAX_LENGTH) {
    return clean;
  }

  return `${clean.slice(0, TITLE_MAX_LENGTH - 3)}...`;
}

async function logUsageSafely(usage) {
  try {
    await recordUsage(usage);
  } catch (error) {
    console.error('[chat] No se pudo registrar el consumo:', error.message);
  }
}

export async function sendChatMessage(user, { message, conversationId }) {
  const service = await getServiceByCode(CHAT_SERVICE_CODE, {
    isAdmin: true,
  });

  if (!service.enabled) {
    throw new AppError(
      409,
      'SERVICE_DISABLED',
      'El servicio de chat está desactivado temporalmente.',
    );
  }

  let existingConversation = null;
  let history = [];

  if (conversationId) {
    existingConversation = await getOwnedConversation(
      user.id,
      conversationId,
    );
    history = await getConversationHistory(existingConversation.id);
  }

  const retrievalQuery = buildRetrievalQuery(message, history);
  const sources = await retrieveDocuments(retrievalQuery, {
    limit: RAG_TOP_K,
  });
  const promptMessages = buildPromptMessages({
    service,
    history,
    message,
    sources,
  });
  const estimatedPromptTokens = estimatePromptTokens(promptMessages);
  const estimatedTotalTokens = estimatedPromptTokens + service.maxTokens;

  try {
    await assertQuotaAvailable(user, estimatedTotalTokens);
  } catch (error) {
    if (error instanceof AppError && error.code === 'TOKEN_QUOTA_EXCEEDED') {
      await logUsageSafely({
        userId: user.id,
        serviceCode: CHAT_SERVICE_CODE,
        conversationId: existingConversation?.id ?? null,
        model: service.model,
        status: 'blocked',
        errorCode: error.code,
      });
    }

    throw error;
  }

  const startedAt = Date.now();
  let completion;

  try {
    completion = await generateChatCompletion({
      model: service.model,
      messages: promptMessages,
      temperature: service.temperature,
      maxTokens: service.maxTokens,
    });
  } catch (error) {
    const aiError =
      error instanceof AppError
        ? error
        : new AppError(
            502,
            'AI_UPSTREAM_ERROR',
            'No se pudo obtener respuesta del servicio de IA.',
          );

    await logUsageSafely({
      userId: user.id,
      serviceCode: CHAT_SERVICE_CODE,
      conversationId: existingConversation?.id ?? null,
      model: service.model,
      latencyMs: Date.now() - startedAt,
      status: 'error',
      errorCode: aiError.code,
    });

    throw aiError;
  }

  const latencyMs = Date.now() - startedAt;
  const answer = String(completion.content ?? '').trim();

  if (!answer) {
    const emptyError = new AppError(
      502,
      'AI_EMPTY_RESPONSE',
      'El servicio de IA devolvió una respuesta vacía.',
    );

    await logUsageSafely({
      userId: user.id,
      serviceCode: CHAT_SERVICE_CODE,
      conversationId: existingConversation?.id ?? null,
      model: service.model,
      latencyMs,
      status: 'error',
      errorCode: emptyError.code,
    });

    throw emptyError;
  }

  const usage = completion.usage ?? {};
  let promptTokens = Math.max(0, Number(usage.promptTokens) || 0);
  let completionTokens = Math.max(0, Number(usage.completionTokens) || 0);
  let totalTokens = Math.max(
    0,
    Number(usage.totalTokens) || promptTokens + completionTokens,
  );

  if (totalTokens === 0) {
    promptTokens = estimatedPromptTokens;
    completionTokens = estimateTokens(answer);
    totalTokens = promptTokens + completionTokens;
  }

  const stored = await withTransaction(async (connection) => {
    let finalConversationId;
    const title = buildTitle(message);

    if (!existingConversation) {
      const [conversationResult] = await connection.execute(
        `INSERT INTO conversations
           (user_id, service_code, title, last_message_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         RETURNING id`,
        [user.id, CHAT_SERVICE_CODE, title],
      );

      finalConversationId = Number(conversationResult[0].id);
    } else {
      finalConversationId = Number(existingConversation.id);

      await connection.execute(
        `UPDATE conversations
         SET title = COALESCE(title, $1),
             last_message_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [title, finalConversationId],
      );
    }

    const [userMessageResult] = await connection.execute(
      `INSERT INTO messages
         (conversation_id, role, content, tokens_in, tokens_out)
       VALUES ($1, 'user', $2, 0, 0)
       RETURNING id`,
      [finalConversationId, message],
    );

    const [assistantMessageResult] = await connection.execute(
      `INSERT INTO messages
         (conversation_id, role, content, sources_json, tokens_in, tokens_out)
       VALUES ($1, 'assistant', $2, $3::jsonb, $4, $5)
       RETURNING id`,
      [
        finalConversationId,
        answer,
        sources.length > 0 ? JSON.stringify(sources) : null,
        promptTokens,
        completionTokens,
      ],
    );

    await recordUsage(
      {
        userId: user.id,
        serviceCode: CHAT_SERVICE_CODE,
        conversationId: finalConversationId,
        messageId: assistantMessageResult[0].id,
        model: completion.model ?? service.model,
        promptTokens,
        completionTokens,
        totalTokens,
        latencyMs,
        status: 'success',
      },
      connection,
    );

    return {
      conversationId: finalConversationId,
      userMessageId: Number(userMessageResult[0].id),
      assistantMessageId: Number(assistantMessageResult[0].id),
    };
  });

  const conversation = await getOwnedConversation(
    user.id,
    stored.conversationId,
  );
  const [messageRows] = await pool.execute(
    `SELECT * FROM messages WHERE id = ANY($1::bigint[]) ORDER BY id ASC`,
    [[stored.userMessageId, stored.assistantMessageId]],
  );
  const userMessage = messageRows.find(
    (item) => Number(item.id) === stored.userMessageId,
  );
  const assistantMessage = messageRows.find(
    (item) => Number(item.id) === stored.assistantMessageId,
  );
  const quota = await getQuotaForUser(user);

  return {
    conversation: serializeConversation(conversation),
    userMessage: serializeMessage(userMessage),
    message: serializeMessage(assistantMessage),
    sources,
    usage: {
      promptTokens,
      completionTokens,
      totalTokens,
      latencyMs,
      model: completion.model ?? service.model,
    },
    quota,
  };
}

export async function listConversations(userId, { page, limit, search }) {
  const conditions = ['c.user_id = $1', 'c.service_code = $2'];
  const params = [userId, CHAT_SERVICE_CODE];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`c.title ILIKE $${params.length}`);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const offset = (page - 1) * limit;
  // El conteo reutiliza el mismo WHERE y los mismos parámetros.

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM conversations c ${where}`,
    params,
  );

  const [rows] = await pool.execute(
    `SELECT
       c.*,
       (SELECT COUNT(*) FROM messages m
        WHERE m.conversation_id = c.id) AS message_count,
       (SELECT m.content FROM messages m
        WHERE m.conversation_id = c.id
        ORDER BY m.id DESC LIMIT 1) AS last_message_content
     FROM conversations c
     ${where}
     ORDER BY COALESCE(c.last_message_at, c.created_at) DESC, c.id DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );

  return {
    data: rows.map(serializeConversation),
    pagination: getPagination(page, limit, countRows[0]?.total),
  };
}

export async function getConversation(userId, conversationId, { limit }) {
  const conversation = await getOwnedConversation(userId, conversationId);
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const [countRows] = await pool.execute(
    'SELECT COUNT(*) AS total FROM messages WHERE conversation_id = $1',
    [conversationId],
  );
  const [rows] = await pool.execute(
    `SELECT *
     FROM (
       SELECT * FROM messages
       WHERE conversation_id = $1
       ORDER BY id DESC
       LIMIT ${safeLimit}
     ) recent
     ORDER BY id ASC`,
    [conversationId],
  );

  return {
    conversation: {
      ...serializeConversation(conversation),
      messageCount: Number(countRows[0]?.total ?? 0),
    },
    messages: rows.map(serializeMessage),
  };
}
