import { useState } from 'react';
import ResultsTable from './ResultsTable';
import AnalyticsTab from './analytics/AnalyticsTab';

interface ResultsPanelProps {
  results: Record<string, unknown>[];
  columns: string[];
  rowCount: number;
}

export default function ResultsPanel({ results, columns, rowCount }: ResultsPanelProps) {
  const [activeTab, setActiveTab] = useState<'results' | 'analytics'>('results');

  const tabStyle = (tab: 'results' | 'analytics'): React.CSSProperties => ({
    padding: '6px 14px',
    fontSize: 13,
    fontWeight: 500,
    border: 'none',
    borderBottom: activeTab === tab
      ? '2px solid #6B66FF'
      : '2px solid transparent',
    background: 'none',
    color: activeTab === tab ? '#6B66FF' : 'var(--qm-text-muted)',
    cursor: 'pointer',
    transition: 'color 0.15s, border-color 0.15s',
    whiteSpace: 'nowrap' as const,
  });

  return (
    <div>
      {/* Tab Bar */}
      <div
        style={{
          display: 'flex',
          gap: 0,
          borderBottom: '1px solid var(--qm-outline-variant)',
          marginBottom: 8,
        }}
      >
        <button style={tabStyle('results')} onClick={() => setActiveTab('results')}>
          Results
        </button>
        <button style={tabStyle('analytics')} onClick={() => setActiveTab('analytics')}>
          Analytics
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'results' && (
        <ResultsTable results={results} columns={columns} rowCount={rowCount} />
      )}
      {activeTab === 'analytics' && (
        <AnalyticsTab rows={results} columns={columns} />
      )}
    </div>
  );
}
