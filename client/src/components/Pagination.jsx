import Icon from './Icon.jsx';
import { formatNumber } from '../utils/format.js';

export default function Pagination({ pagination, onChange }) {
  if (!pagination || pagination.total === 0) {
    return null;
  }

  const { page, totalPages, total, limit, hasPrev, hasNext } = pagination;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="pagination">
      <span className="pagination-info">
        {formatNumber(from)}–{formatNumber(to)} de {formatNumber(total)}
      </span>
      <div className="pagination-actions">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => onChange(page - 1)}
          disabled={!hasPrev}
        >
          <Icon name="chevronLeft" size={16} />
          Anterior
        </button>
        <span className="pagination-page">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => onChange(page + 1)}
          disabled={!hasNext}
        >
          Siguiente
          <Icon name="chevronRight" size={16} />
        </button>
      </div>
    </div>
  );
}
