import Icon from './Icon.jsx';

const TYPE_LABELS = {
  destination: 'Destino',
  activity: 'Actividad',
  external: 'Fuente externa',
  document: 'Documento',
};

export default function SourceList({ sources = [], title = 'Fuentes consultadas' }) {
  if (!sources.length) {
    return null;
  }

  return (
    <div className="source-list">
      <span className="source-title">
        <Icon name="globe" size={15} />
        {title}
      </span>
      <div className="source-chips">
        {sources.map((source, index) => {
          const label =
            source.title || source.name || `Fuente ${index + 1}`;
          const type = TYPE_LABELS[source.sourceType] ?? source.sourceType;
          const key = `${source.sourceType ?? 'source'}-${source.sourceId ?? source.documentId ?? index}`;

          if (source.url) {
            return (
              <a
                key={key}
                className="source-chip"
                href={source.url}
                target="_blank"
                rel="noreferrer"
                title={type ? `${type}: ${label}` : label}
              >
                {label}
                <Icon name="external" size={12} />
              </a>
            );
          }

          return (
            <span
              key={key}
              className="source-chip"
              title={type ? `${type}: ${label}` : label}
            >
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
