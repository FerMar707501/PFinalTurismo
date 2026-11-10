import { pool } from '../../config/db.js';
import { AppError } from '../../errors/AppError.js';

export function getCurrentPeriod(now = new Date()) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0));
  const key = `${year}-${String(month + 1).padStart(2, '0')}`;

  return { key, start, end };
}

export function buildQuota({
  limitTokens,
  usedTokens = 0,
  successfulRequests = 0,
  blockedRequests = 0,
  period = getCurrentPeriod(),
}) {
  const limit = Math.max(0, Number(limitTokens) || 0);
  const used = Math.max(0, Number(usedTokens) || 0);
  const remaining = Math.max(0, limit - used);
  const percentUsed =
    limit === 0
      ? 100
      : Math.min(100, Math.round((used / limit) * 10000) / 100);

  return {
    period: period.key,
    periodStart: period.start.toISOString(),
    periodEnd: period.end.toISOString(),
    resetAt: period.end.toISOString(),
    limitTokens: limit,
    usedTokens: used,
    remainingTokens: remaining,
    percentUsed,
    exceeded: limit === 0 || used >= limit,
    successfulRequests: Number(successfulRequests) || 0,
    blockedRequests: Number(blockedRequests) || 0,
  };
}

export async function getQuotaForUser(user, period = getCurrentPeriod()) {
  const limitTokens = Number(
    user.tokenLimitMonth ?? user.token_limit_month ?? 0,
  );

  const [rows] = await pool.execute(
    `SELECT
       COALESCE(SUM(CASE WHEN status = 'success' THEN total_tokens ELSE 0 END), 0) AS used_tokens,
       COALESCE(SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END), 0) AS successful_requests,
       COALESCE(SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END), 0) AS blocked_requests
     FROM usage_logs
     WHERE user_id = $1 AND created_at >= $2 AND created_at < $3`,
    [Number(user.id), period.start, period.end],
  );

  const row = rows[0] ?? {};

  return buildQuota({
    limitTokens,
    usedTokens: row.used_tokens,
    successfulRequests: row.successful_requests,
    blockedRequests: row.blocked_requests,
    period,
  });
}

export async function assertQuotaAvailable(user, estimatedTokens = 0) {
  const quota = await getQuotaForUser(user);
  const estimate = Math.max(0, Number(estimatedTokens) || 0);

  if (quota.exceeded || quota.usedTokens + estimate > quota.limitTokens) {
    throw new AppError(
      429,
      'TOKEN_QUOTA_EXCEEDED',
      'Has alcanzado tu límite mensual de tokens.',
      quota,
    );
  }

  return quota;
}

export async function recordUsage(
  {
    userId,
    serviceCode,
    conversationId = null,
    messageId = null,
    model,
    promptTokens = 0,
    completionTokens = 0,
    totalTokens,
    latencyMs = null,
    status = 'success',
    errorCode = null,
  },
  executor = pool,
) {
  const prompt = Math.max(0, Number(promptTokens) || 0);
  const completion = Math.max(0, Number(completionTokens) || 0);
  const total = Math.max(0, Number(totalTokens ?? prompt + completion) || 0);

  const [result] = await executor.execute(
    `INSERT INTO usage_logs
       (user_id, service_code, conversation_id, message_id, model,
        prompt_tokens, completion_tokens, total_tokens, latency_ms,
        status, error_code)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id`,
    [
      userId,
      serviceCode,
      conversationId,
      messageId,
      model,
      prompt,
      completion,
      total,
      latencyMs,
      status,
      errorCode,
    ],
  );

  return { id: Number(result[0].id), totalTokens: total };
}

export function estimateTokens(text = '') {
  return Math.max(1, Math.ceil(String(text).length / 4));
}
