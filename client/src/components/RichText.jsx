import { Fragment } from 'react';

const INLINE_PATTERN =
  /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;

function renderInline(text, keyPrefix = 'inline') {
  const parts = [];
  let lastIndex = 0;
  let match;
  let index = 0;

  while ((match = INLINE_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <Fragment key={`${keyPrefix}-text-${index}`}>
          {text.slice(lastIndex, match.index)}
        </Fragment>,
      );
    }

    const token = match[0];
    const key = `${keyPrefix}-token-${index}`;

    if (token.startsWith('**')) {
      parts.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('`')) {
      parts.push(<code key={key}>{token.slice(1, -1)}</code>);
    } else {
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      const label = linkMatch?.[1] ?? token;
      const url = linkMatch?.[2] ?? '#';
      const href = /^https?:\/\//i.test(url) ? url : '#';

      parts.push(
        <a key={key} href={href} target="_blank" rel="noreferrer">
          {label}
        </a>,
      );
    }

    lastIndex = match.index + token.length;
    index += 1;
  }

  if (lastIndex < text.length) {
    parts.push(
      <Fragment key={`${keyPrefix}-tail`}>
        {text.slice(lastIndex)}
      </Fragment>,
    );
  }

  return parts;
}

function isBlockStart(line, nextLine) {
  const value = line.trim();

  if (!value) {
    return true;
  }

  if (
    value.startsWith('#') ||
    value.startsWith('```') ||
    value.startsWith('>') ||
    /^[-*]\s+/.test(value) ||
    /^\d+\.\s+/.test(value)
  ) {
    return true;
  }

  return (
    value.startsWith('|') &&
    nextLine !== undefined &&
    /^\s*\|?[\s:|-]+\|?\s*$/.test(nextLine)
  );
}

function splitTableRow(row) {
  return row
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function renderTable(rows, key) {
  const cleanRows = rows.filter(
    (row, index) => index !== 1 || !/^\s*\|?[\s:|-]+\|?\s*$/.test(row),
  );

  if (cleanRows.length === 0) {
    return null;
  }

  const [header, ...body] = cleanRows.map(splitTableRow);

  return (
    <div className="rich-table-wrap" key={key}>
      <table>
        <thead>
          <tr>
            {header.map((cell, index) => (
              <th key={`head-${index}`}>{renderInline(cell, `th-${index}`)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`}>
              {row.map((cell, cellIndex) => (
                <td key={`cell-${rowIndex}-${cellIndex}`}>
                  {renderInline(cell, `td-${rowIndex}-${cellIndex}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function RichText({ text, className = '' }) {
  const source = String(text ?? '').replace(/\r\n/g, '\n');
  const lines = source.split('\n');
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed.startsWith('```')) {
      const codeLines = [];
      index += 1;

      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        codeLines.push(lines[index]);
        index += 1;
      }

      if (index < lines.length) {
        index += 1;
      }

      blocks.push(
        <pre key={`code-${index}`}>
          <code>{codeLines.join('\n')}</code>
        </pre>,
      );
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(trimmed);

    if (heading) {
      const level = Math.min(heading[1].length + 1, 5);
      const Tag = `h${level}`;
      blocks.push(
        <Tag key={`heading-${index}`}>
          {renderInline(heading[2], `heading-${index}`)}
        </Tag>,
      );
      index += 1;
      continue;
    }

    if (
      trimmed.startsWith('|') &&
      index + 1 < lines.length &&
      /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[index + 1])
    ) {
      const tableRows = [];

      while (index < lines.length && lines[index].trim().startsWith('|')) {
        tableRows.push(lines[index]);
        index += 1;
      }

      const table = renderTable(tableRows, `table-${index}`);
      if (table) {
        blocks.push(table);
      }
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items = [];

      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*]\s+/, ''));
        index += 1;
      }

      blocks.push(
        <ul key={`ul-${index}`}>
          {items.map((item, itemIndex) => (
            <li key={`li-${itemIndex}`}>
              {renderInline(item, `ul-${index}-${itemIndex}`)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items = [];

      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s+/, ''));
        index += 1;
      }

      blocks.push(
        <ol key={`ol-${index}`}>
          {items.map((item, itemIndex) => (
            <li key={`oli-${itemIndex}`}>
              {renderInline(item, `ol-${index}-${itemIndex}`)}
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    if (trimmed.startsWith('>')) {
      const quoteLines = [];

      while (index < lines.length && lines[index].trim().startsWith('>')) {
        quoteLines.push(lines[index].trim().replace(/^>\s?/, ''));
        index += 1;
      }

      blocks.push(
        <blockquote key={`quote-${index}`}>
          {renderInline(quoteLines.join(' '), `quote-${index}`)}
        </blockquote>,
      );
      continue;
    }

    const paragraph = [];

    while (
      index < lines.length &&
      lines[index].trim() &&
      !isBlockStart(lines[index], lines[index + 1])
    ) {
      paragraph.push(lines[index].trim());
      index += 1;
    }

    if (paragraph.length === 0) {
      paragraph.push(trimmed);
      index += 1;
    }

    blocks.push(
      <p key={`paragraph-${index}`}>
        {renderInline(paragraph.join(' '), `paragraph-${index}`)}
      </p>,
    );
  }

  return <div className={`rich-text ${className}`.trim()}>{blocks}</div>;
}
