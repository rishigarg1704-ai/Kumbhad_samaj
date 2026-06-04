import type { ReactNode } from 'react';

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
}

interface PaginationInfo {
  page: number;
  totalPages: number;
  totalItems?: number;
  onPageChange: (page: number) => void;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  pagination?: PaginationInfo;
  isLoading?: boolean;
  emptyMessage?: string;
  emptyIcon?: string;
}

export function DataTable<T extends { id?: string | number }>({
  columns,
  data,
  pagination,
  isLoading,
  emptyMessage = 'No data records found.',
  emptyIcon = '📭'
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="skeleton-container" style={{ padding: '20px 0' }}>
        <div className="skeleton" style={{ height: '300px', borderRadius: 'var(--radius)' }} />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="empty-state" style={{ margin: '20px 0' }}>
        <span className="empty-state-icon">{emptyIcon}</span>
        <h3 className="empty-state-title">No Records</h3>
        <p className="empty-state-desc">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th key={col.key || idx}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => (
            <tr key={row.id || rowIdx}>
              {columns.map((col, colIdx) => (
                <td key={`${row.id || rowIdx}-${col.key || colIdx}`}>
                  {col.render ? col.render(row) : (row as any)[col.key] ?? '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {pagination && pagination.totalPages > 1 && (
        <div className="pagination">
          <span className="pagination-info">
            Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong>
            {pagination.totalItems !== undefined && ` (Total ${pagination.totalItems} items)`}
          </span>
          <div className="pagination-buttons">
            <button
              className="pagination-btn"
              onClick={() => pagination.onPageChange(Math.max(pagination.page - 1, 1))}
              disabled={pagination.page === 1}
            >
              Previous
            </button>
            <button
              className="pagination-btn"
              onClick={() => pagination.onPageChange(Math.min(pagination.page + 1, pagination.totalPages))}
              disabled={pagination.page === pagination.totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
