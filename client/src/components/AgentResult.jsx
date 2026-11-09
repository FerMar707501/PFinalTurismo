import Icon from './Icon.jsx';
import RichText from './RichText.jsx';
import SourceList from './SourceList.jsx';
import { formatDateTime, formatNumber, toolLabel } from '../utils/format.js';

function parseArgs(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function StepTool({ result }) {
  const args = parseArgs(result.arguments);

  return (
    <li className={`step-tool ${result.ok ? 'ok' : 'failed'}`.trim()}>
      <span className="step-tool-icon">
        <Icon name={result.ok ? 'check' : 'alert'} size={14} />
      </span>
      <div className="step-tool-body">
        <div className="step-tool-title">
          <strong>{toolLabel(result.tool)}</strong>
          <span>{formatNumber(result.durationMs ?? 0)} ms</span>
        </div>
        {args && Object.keys(args).length > 0 ? (
          <div className="step-tool-args">
            {Object.entries(args).map(([key, value]) => (
              <span key={key}>
                {key}: <strong>{String(value)}</strong>
              </span>
            ))}
          </div>
        ) : null}
        {result.error ? (
          <p className="step-tool-error">{result.error.message}</p>
        ) : null}
        {result.result ? (
          <details className="step-json">
            <summary>Ver resultado de la herramienta</summary>
            <pre>{JSON.stringify(result.result, null, 2)}</pre>
          </details>
        ) : null}
      </div>
    </li>
  );
}

export default function AgentResult({ result, onViewHistory }) {
  if (!result) {
    return null;
  }

  const usage = result.usage ?? {};
  const steps = result.steps ?? [];
  const toolResults = steps.flatMap((step) => step.results ?? []);
  const finalStep = steps.find((step) => step.type === 'final');

  return (
    <section className="agent-result panel">
      <header className="agent-result-head">
        <div>
          <span className="eyebrow">
            <Icon name="sparkles" size={14} /> Resultado del agente
          </span>
          <h2>Tu plan está listo</h2>
          <p>
            Generado con {formatNumber(usage.totalTokens)} tokens y{' '}
            {toolResults.length} consultas a herramientas.
          </p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onViewHistory}>
          <Icon name="history" size={16} /> Ver historial
        </button>
      </header>

      <div className="agent-usage-grid">
        <div>
          <span>Tokens de entrada</span>
          <strong>{formatNumber(usage.promptTokens)}</strong>
        </div>
        <div>
          <span>Tokens de salida</span>
          <strong>{formatNumber(usage.completionTokens)}</strong>
        </div>
        <div>
          <span>Latencia total</span>
          <strong>{formatNumber(usage.latencyMs)} ms</strong>
        </div>
        <div>
          <span>Ejecución</span>
          <strong>#{result.run?.id ?? '—'}</strong>
        </div>
      </div>

      <div className="agent-answer">
        <RichText text={result.answer} />
      </div>

      <SourceList sources={result.sources} />

      {steps.length > 0 ? (
        <details className="agent-steps-block">
          <summary>
            <span>
              <Icon name="history" size={16} /> Cómo razonó el agente ({steps.length}{' '}
              pasos)
            </span>
            <Icon name="chevronDown" size={17} />
          </summary>
          <ol className="agent-steps">
            {steps.map((step) => (
              <li key={`step-${step.step}`} className="agent-step">
                <span className={`step-number step-${step.type}`}>
                  {step.type === 'final' ? '✓' : step.step}
                </span>
                <div className="step-content">
                  <div className="step-head">
                    <strong>
                      {step.type === 'final'
                        ? 'Respuesta final'
                        : `Paso ${step.step}: consultas`}
                    </strong>
                    {step.type === 'limit' ? (
                      <span className="badge badge-error">Límite alcanzado</span>
                    ) : null}
                  </div>
                  {step.content ? <p>{step.content}</p> : null}
                  {step.results?.length ? (
                    <ul className="step-tools">
                      {step.results.map((toolResult, index) => (
                        <StepTool
                          key={`${step.step}-${toolResult.tool}-${index}`}
                          result={toolResult}
                        />
                      ))}
                    </ul>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </details>
      ) : null}

      {finalStep?.content ? (
        <p className="agent-result-foot">
          <Icon name="clock" size={14} />{' '}
          {formatDateTime(result.run?.createdAt ?? new Date().toISOString())}
        </p>
      ) : null}
    </section>
  );
}
