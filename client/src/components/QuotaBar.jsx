import { formatNumber, quotaTone } from '../utils/format.js';

export default function QuotaBar({ quota, compact = false }) {
  if (!quota) {
    return null;
  }

  const tone = quotaTone(quota);
  const percent = Math.min(100, Math.max(0, Number(quota.percentUsed) || 0));

  return (
    <div className={`quota ${compact ? 'quota-compact' : ''} quota-${tone}`.trim()}>
      <div className="quota-head">
        <span>Consumo mensual</span>
        <strong>{percent.toFixed(1)}%</strong>
      </div>
      <div className="quota-track" aria-hidden="true">
        <span style={{ width: `${percent}%` }} />
      </div>
      <div className="quota-foot">
        <span>{formatNumber(quota.usedTokens)} usados</span>
        <span>{formatNumber(quota.remainingTokens)} disponibles</span>
      </div>
      {!compact ? (
        <div className="quota-meta">
          <span>Límite: {formatNumber(quota.limitTokens)} tokens</span>
          <span>Periodo: {quota.period}</span>
        </div>
      ) : null}
    </div>
  );
}
