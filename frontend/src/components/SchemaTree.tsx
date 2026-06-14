import { useState, useMemo } from 'react';
import { MdSearch, MdTableChart, MdVpnKey, MdLink, MdNumbers, MdTitle, MdDateRange, MdToggleOn, MdChevronRight, MdVisibility } from 'react-icons/md';
import type { TableSchema, ColumnSchema } from '../api/client';

interface SchemaTreeProps {
  tables: TableSchema[];
  dialect: string;
  isLoading: boolean;
  onTableClick?: (tableName: string) => void;
  onInspect?: (tableName: string) => void;
}

function getTypeIcon(type: string) {
  const t = type.toLowerCase();
  if (t.includes('int') || t.includes('real') || t.includes('float') || t.includes('numeric') || t.includes('decimal')) {
    return <MdNumbers size={14} className="text-syntax-number" />;
  }
  if (t.includes('date') || t.includes('time') || t.includes('timestamp')) {
    return <MdDateRange size={14} className="text-syntax-string" />;
  }
  if (t.includes('bool')) {
    return <MdToggleOn size={14} className="text-text-muted" />;
  }
  return <MdTitle size={14} className="text-syntax-string" />;
}

function ColumnRow({ col }: { col: ColumnSchema }) {
  return (
    <div className="flex items-center justify-between py-1 group/col">
      <div className="flex items-center gap-2">
        {col.primary_key ? (
          <MdVpnKey size={14} className="text-[#FCD34D]" />
        ) : col.foreign_key ? (
          <MdLink size={14} className="text-[#61afef]" />
        ) : (
          getTypeIcon(col.type)
        )}
        <span className="text-xs text-on-surface-variant group-hover/col:text-on-surface transition-colors font-mono">
          {col.name}
        </span>
      </div>
      <span className="text-[10px] text-text-muted font-mono">
        {col.type.split('(')[0].toLowerCase()}
      </span>
    </div>
  );
}

function TableNode({ table, onTableClick, onInspect }: { table: TableSchema; onTableClick?: (name: string) => void; onInspect?: (name: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <details className="group" open={expanded} onToggle={(e) => setExpanded(e.currentTarget.open)}>
      <summary className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-surface-variant cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <div className="flex items-center gap-2">
          <MdChevronRight size={16} className={`text-text-muted transition-transform ${expanded ? 'rotate-90' : ''}`} />
          <MdTableChart size={16} className="text-on-surface-variant" />
          <span className="font-medium text-sm text-on-surface">{table.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onInspect?.(table.name); }}
            className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded flex items-center justify-center text-text-muted hover:text-on-surface hover:bg-surface-variant transition-all"
            title="Inspect table"
          >
            <MdVisibility size={14} />
          </button>
          <span className="text-[10px] text-text-muted font-mono">
            {table.row_count}
          </span>
        </div>
      </summary>
      
      {expanded && (
        <div className="pl-8 pr-2 py-1 flex flex-col gap-1 mt-1 animate-fade-in">
          <button
            onClick={() => onTableClick?.(table.name)}
            className="text-[10px] text-syntax-function hover:underline text-left mb-1 py-1 w-full"
          >
            + Add to query context
          </button>
          {table.columns.map((col) => (
            <ColumnRow key={col.name} col={col} />
          ))}
        </div>
      )}
    </details>
  );
}

export default function SchemaTree({ tables, dialect, isLoading, onTableClick, onInspect }: SchemaTreeProps) {
  const [filter, setFilter] = useState('');

  const filtered = useMemo(() => {
    if (!filter) return tables;
    const q = filter.toLowerCase();
    return tables.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.columns.some((c) => c.name.toLowerCase().includes(q)),
    );
  }, [tables, filter]);

  return (
    <div className="flex flex-col h-full bg-surface">
      <div className="px-4 py-3 border-b border-surface-variant flex items-center justify-between">
        <span className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">Schema & Tables</span>
        <span className="bg-secondary-container/20 text-on-secondary-container px-2 py-0.5 rounded font-mono text-[10px] border border-outline-variant">
          {dialect || 'SQL'}
        </span>
      </div>

      <div className="p-3">
        <div className="relative">
          <MdSearch size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search tables..."
            className="w-full bg-surface border border-outline-variant rounded-lg pl-8 pr-3 py-1.5 text-sm outline-none focus:border-on-surface-variant transition-colors placeholder:text-text-muted text-on-surface"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1 min-h-0">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-surface-variant/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-text-muted text-sm">
            {filter ? 'No tables match search' : 'No tables available'}
          </div>
        ) : (
          filtered.map((table) => (
            <TableNode key={table.name} table={table} onTableClick={onTableClick} onInspect={onInspect} />
          ))
        )}
      </div>

      <div className="px-4 py-3 border-t border-surface-variant text-[11px] text-text-muted text-center flex-shrink-0">
        {tables.length} table{tables.length !== 1 ? 's' : ''} · {tables.reduce((sum, t) => sum + t.columns.length, 0)} columns
      </div>
    </div>
  );
}
