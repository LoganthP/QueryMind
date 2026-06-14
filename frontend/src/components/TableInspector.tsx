/**
 * QueryMind — TableInspector Component
 * Slide-in panel for inspecting table columns, data preview, and statistics.
 */

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import {
  MdClose, MdTableChart, MdVpnKey, MdLink, MdDownload,
  MdChevronLeft, MdChevronRight
} from 'react-icons/md';

interface TableInspectorProps {
  tableName: string;
  dbId: string;
  onClose: () => void;
}

type Tab = 'columns' | 'preview' | 'description';

const PREVIEW_PAGE_SIZE = 50;

export default function TableInspector({ tableName, dbId, onClose }: TableInspectorProps) {
  const [activeTab, setActiveTab] = useState<Tab>('columns');
  const [previewPage, setPreviewPage] = useState(0);

  // Escape key closes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Fetch column info
  const infoQuery = useQuery({
    queryKey: ['table-info', dbId, tableName],
    queryFn: () => api.getTableInfo(dbId, tableName),
    staleTime: 60_000,
    enabled: activeTab === 'columns',
  });

  // Fetch preview data
  const previewQuery = useQuery({
    queryKey: ['table-preview', dbId, tableName, previewPage],
    queryFn: () => api.getTablePreview(dbId, tableName, PREVIEW_PAGE_SIZE, previewPage * PREVIEW_PAGE_SIZE),
    staleTime: 60_000,
    enabled: activeTab === 'preview',
  });

  // Fetch stats
  const statsQuery = useQuery({
    queryKey: ['table-stats', dbId, tableName],
    queryFn: () => api.getTableStats(dbId, tableName),
    staleTime: 60_000,
    enabled: activeTab === 'description',
  });

  const totalPreviewPages = previewQuery.data
    ? Math.ceil(previewQuery.data.total_count / PREVIEW_PAGE_SIZE)
    : 0;

  const exportCSV = () => {
    if (!previewQuery.data) return;
    const { columns, rows } = previewQuery.data;
    const header = columns.join(',');
    const csvRows = rows.map(row =>
      columns.map(col => {
        const val = row[col];
        const str = val == null ? '' : String(val);
        return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(','),
    );
    const csv = [header, ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tableName}-preview.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'columns', label: 'Columns' },
    { key: 'preview', label: 'Data Preview' },
    { key: 'description', label: 'Description' },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-qm-backdrop backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full sm:w-[560px] bg-surface border-l border-outline-variant z-50 flex flex-col shadow-2xl animate-slide-in-right font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-variant shrink-0">
          <div className="flex items-center gap-3">
            <MdTableChart size={20} className="text-text-muted" />
            <div>
              <h2 className="text-base font-semibold text-text-high-contrast">{tableName}</h2>
              <p className="text-[11px] text-text-muted">Table Inspector</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded flex items-center justify-center text-text-muted hover:bg-surface-variant hover:text-on-surface transition-colors"
          >
            <MdClose size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-surface-variant shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 text-sm transition-colors border-b-2 ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-400 font-semibold'
                  : 'border-transparent text-text-muted hover:text-on-surface'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* ═══ Columns Tab ═══ */}
          {activeTab === 'columns' && (
            <div className="p-4">
              {infoQuery.isLoading ? (
                <div className="space-y-2">
                  {[1,2,3,4].map(i => <div key={i} className="h-8 bg-surface-variant/50 rounded animate-pulse" />)}
                </div>
              ) : infoQuery.error ? (
                <p className="text-sm text-red-400">Failed to load column info</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px]">
                    <thead>
                      <tr className="border-b border-outline-variant text-text-muted text-[11px] uppercase tracking-wider">
                        <th className="px-3 py-2 font-medium">Column</th>
                        <th className="px-3 py-2 font-medium">Type</th>
                        <th className="px-3 py-2 font-medium text-center">Nullable</th>
                        <th className="px-3 py-2 font-medium text-center">PK</th>
                        <th className="px-3 py-2 font-medium">Default</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono text-[12px]">
                      {infoQuery.data?.columns.map((col) => (
                        <tr key={col.name} className="border-b border-outline-variant/50 hover:bg-surface-variant/30 transition-colors">
                          <td className="px-3 py-2 text-on-surface font-medium flex items-center gap-1.5">
                            {col.primary_key ? <MdVpnKey size={12} className="text-[#FCD34D] shrink-0" /> :
                             col.foreign_key ? <MdLink size={12} className="text-[#61afef] shrink-0" /> : null}
                            {col.name}
                          </td>
                          <td className="px-3 py-2 text-text-muted">{col.type}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${col.nullable ? 'text-yellow-400 bg-yellow-400/10' : 'text-green-400 bg-green-400/10'}`}>
                              {col.nullable ? 'YES' : 'NO'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            {col.primary_key && <span className="text-[10px] px-1.5 py-0.5 rounded text-[#FCD34D] bg-[#FCD34D]/10">PK</span>}
                          </td>
                          <td className="px-3 py-2 text-text-muted text-[11px]">{col.default ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ═══ Data Preview Tab ═══ */}
          {activeTab === 'preview' && (
            <div className="flex flex-col h-full">
              {previewQuery.isLoading ? (
                <div className="p-4 space-y-2">
                  {[1,2,3,4,5].map(i => <div key={i} className="h-6 bg-surface-variant/50 rounded animate-pulse" />)}
                </div>
              ) : previewQuery.error ? (
                <p className="p-4 text-sm text-red-400">Failed to load preview</p>
              ) : (
                <>
                  {/* Info bar */}
                  <div className="px-4 py-2 border-b border-outline-variant flex items-center justify-between shrink-0 bg-surface-variant/30">
                    <span className="text-xs text-text-muted">
                      Showing {Math.min(PREVIEW_PAGE_SIZE, previewQuery.data?.rows.length ?? 0)} of {previewQuery.data?.total_count.toLocaleString()} rows
                    </span>
                    <button
                      onClick={exportCSV}
                      className="px-2 py-1 text-[11px] font-medium text-text-muted hover:text-on-surface hover:bg-surface-variant rounded transition-colors flex items-center gap-1"
                    >
                      <MdDownload size={14} /> Export CSV
                    </button>
                  </div>

                  {/* Table */}
                  <div className="flex-1 overflow-auto min-h-0">
                    <table className="w-full text-left border-collapse whitespace-nowrap text-[12px]">
                      <thead className="sticky top-0 z-10">
                        <tr className="border-b border-outline-variant bg-surface text-text-muted text-[11px] uppercase tracking-wider">
                          {previewQuery.data?.columns.map((col) => (
                            <th key={col} className="px-4 py-2 font-medium">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="font-mono">
                        {previewQuery.data?.rows.map((row, i) => (
                          <tr
                            key={i}
                            className={`border-b border-outline-variant/50 hover:bg-surface-variant/30 transition-colors ${
                              i % 2 === 1 ? 'bg-surface-variant/10' : ''
                            }`}
                          >
                            {previewQuery.data?.columns.map((col) => {
                              const val = row[col];
                              const isNull = val == null;
                              const isNumber = typeof val === 'number';
                              return (
                                <td
                                  key={col}
                                  className={`px-4 py-1.5 ${isNull ? 'text-text-muted italic' : isNumber ? 'text-syntax-number' : 'text-on-surface'}`}
                                  style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}
                                >
                                  {isNull ? 'NULL' : String(val)}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPreviewPages > 1 && (
                    <div className="px-4 py-2 flex items-center justify-center gap-4 text-text-muted border-t border-outline-variant shrink-0">
                      <button
                        onClick={() => setPreviewPage(Math.max(0, previewPage - 1))}
                        disabled={previewPage === 0}
                        className={`${previewPage === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:text-on-surface'}`}
                      >
                        <MdChevronLeft size={20} />
                      </button>
                      <span className="text-[11px] font-mono text-on-surface">
                        {previewPage + 1} / {totalPreviewPages}
                      </span>
                      <button
                        onClick={() => setPreviewPage(Math.min(totalPreviewPages - 1, previewPage + 1))}
                        disabled={previewPage >= totalPreviewPages - 1}
                        className={`${previewPage >= totalPreviewPages - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:text-on-surface'}`}
                      >
                        <MdChevronRight size={20} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ═══ Description Tab ═══ */}
          {activeTab === 'description' && (
            <div className="p-4 space-y-4">
              {statsQuery.isLoading ? (
                <div className="space-y-3">
                  <div className="h-20 bg-surface-variant/50 rounded-xl animate-pulse" />
                  {[1,2,3].map(i => <div key={i} className="h-16 bg-surface-variant/50 rounded-lg animate-pulse" />)}
                </div>
              ) : statsQuery.error ? (
                <p className="text-sm text-red-400">Failed to load statistics</p>
              ) : (
                <>
                  {/* Summary card */}
                  <div className="p-4 rounded-xl bg-surface-variant border border-outline-variant">
                    <h3 className="text-base font-bold text-text-high-contrast mb-2">{tableName}</h3>
                    <div className="flex gap-6 text-sm">
                      <div>
                        <span className="text-text-muted">Rows</span>
                        <p className="font-mono font-semibold text-on-surface">{statsQuery.data?.row_count.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-text-muted">Columns</span>
                        <p className="font-mono font-semibold text-on-surface">{statsQuery.data?.col_count}</p>
                      </div>
                    </div>
                  </div>

                  {/* Column cards */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-text-muted uppercase tracking-widest">Column Details</h4>
                    {Object.entries(statsQuery.data?.sample_values ?? {}).map(([colName, samples]) => {
                      const nullRatio = statsQuery.data?.null_ratios[colName] ?? 0;
                      const nullPct = (nullRatio * 100).toFixed(1);

                      return (
                        <div key={colName} className="p-3 rounded-lg bg-surface-variant/50 border border-outline-variant/50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-mono font-medium text-on-surface">{colName}</span>
                            <span className="text-[10px] text-text-muted">{nullPct}% null</span>
                          </div>

                          {/* Null ratio bar */}
                          <div className="h-1.5 rounded-full bg-green-500/20 mb-2 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.max(nullRatio * 100, nullRatio > 0 ? 2 : 0)}%`,
                                background: nullRatio > 0.5 ? '#ef4444' : nullRatio > 0.1 ? '#f59e0b' : '#22c55e',
                              }}
                            />
                          </div>

                          {/* Sample values */}
                          {(samples as unknown[]).length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {(samples as unknown[]).map((val, i) => (
                                <span key={i} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-surface text-text-muted border border-outline-variant/50 max-w-[120px] truncate">
                                  {val == null ? 'NULL' : String(val)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
