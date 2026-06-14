import { useState, useMemo } from 'react';
import { MdDownload, MdChevronLeft, MdChevronRight, MdArrowUpward, MdArrowDownward } from 'react-icons/md';

interface ResultsTableProps {
  results: Record<string, unknown>[];
  columns: string[];
  rowCount: number;
}

const PAGE_SIZE = 50;

export default function ResultsTable({ results, columns, rowCount }: ResultsTableProps) {
  const [page, setPage] = useState(0);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sorted = useMemo(() => {
    if (!sortCol) return results;
    return [...results].sort((a, b) => {
      const aVal = a[sortCol];
      const bVal = b[sortCol];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortDir === 'asc' ? -1 : 1;
      if (bVal == null) return sortDir === 'asc' ? 1 : -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal);
      const bStr = String(bVal);
      return sortDir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }, [results, sortCol, sortDir]);

  const paged = useMemo(() => {
    const start = page * PAGE_SIZE;
    return sorted.slice(start, start + PAGE_SIZE);
  }, [sorted, page]);

  const totalPages = Math.ceil(results.length / PAGE_SIZE);

  if (!results.length) {
    return (
      <div className="p-10 text-center text-text-muted animate-fade-in border border-outline-variant rounded-xl bg-surface-variant">
        <p className="text-sm font-medium">No results to display</p>
      </div>
    );
  }

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const exportCSV = () => {
    const header = columns.join(',');
    const rows = results.map(row =>
      columns.map(col => {
        const val = row[col];
        const str = val == null ? '' : String(val);
        return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(','),
    );
    const csv = [header, ...rows].join('\n');
    downloadFile(csv, 'querymind-results.csv', 'text/csv');
  };

  const exportJSON = () => {
    const json = JSON.stringify(results, null, 2);
    downloadFile(json, 'querymind-results.json', 'application/json');
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-xl border border-outline-variant bg-surface overflow-hidden mt-2 animate-fade-in shadow-sm">
      {/* Header bar */}
      <div className="px-4 py-2 border-b border-outline-variant bg-surface flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-secondary-container/20 text-on-secondary-container px-2 py-0.5 rounded text-[11px] font-mono">
            {rowCount} row{rowCount !== 1 ? 's' : ''}
          </div>
          {rowCount > results.length && (
            <span className="text-[10px] text-text-muted">
              (showing {results.length})
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={exportCSV}
            className="px-2 py-1 text-[11px] font-medium text-text-muted hover:text-on-surface hover:bg-surface-variant rounded transition-colors flex items-center gap-1"
          >
            <MdDownload size={14} /> CSV
          </button>
          <button 
            onClick={exportJSON}
            className="px-2 py-1 text-[11px] font-medium text-text-muted hover:text-on-surface hover:bg-surface-variant rounded transition-colors flex items-center gap-1"
          >
            <MdDownload size={14} /> JSON
          </button>
        </div>
      </div>

      {/* Scrollable table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-nowrap text-[13px]">
          <thead>
            <tr className="border-b border-outline-variant bg-surface-variant/30 text-text-muted font-medium text-[11px] uppercase tracking-wider">
              {columns.map((col) => (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  className="px-6 py-3 font-medium cursor-pointer hover:text-on-surface transition-colors select-none"
                >
                  <div className="flex items-center gap-1">
                    {col}
                    {sortCol === col && (
                      sortDir === 'asc'
                        ? <MdArrowUpward size={12} className="text-on-surface" />
                        : <MdArrowDownward size={12} className="text-on-surface" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="font-mono text-[12px]">
            {paged.map((row, i) => (
              <tr
                key={i}
                className="border-b border-outline-variant/50 hover:bg-surface-variant/30 transition-colors"
              >
                {columns.map((col) => {
                  const val = row[col];
                  const isNull = val == null;
                  const isNumber = typeof val === 'number';
                  return (
                    <td 
                      key={col} 
                      className={`px-6 py-2 ${isNull ? 'text-text-muted italic' : isNumber ? 'text-syntax-number font-medium' : 'text-on-surface'}`}
                      style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    >
                      {isNull ? 'NULL' : String(val)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-2 flex items-center justify-center gap-4 text-text-muted bg-surface">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className={`flex items-center justify-center ${page === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:text-on-surface'}`}
          >
            <MdChevronLeft size={20} />
          </button>
          <span className="text-[11px] font-mono text-on-surface">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className={`flex items-center justify-center ${page >= totalPages - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:text-on-surface'}`}
          >
            <MdChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
