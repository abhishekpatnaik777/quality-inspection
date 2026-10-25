import { pageCount } from '../api/pagination.js';

export default function PaginationBar({ page, limit, total, onPageChange, disabled = false }) {
  const pages = pageCount(total, limit);
  if (total <= 0 || pages <= 1) return null;

  return (
    <div className="pagination-bar">
      <button
        type="button"
        className="ghost-btn"
        disabled={disabled || page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </button>
      <span className="pagination-label">
        Page {page} of {pages}
      </span>
      <button
        type="button"
        className="ghost-btn"
        disabled={disabled || page >= pages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </button>
    </div>
  );
}
