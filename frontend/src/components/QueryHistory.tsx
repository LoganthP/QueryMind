import { useState, useMemo } from 'react';
import { MdClose, MdHistory, MdSearch, MdContentCopy, MdDelete, MdPlayArrow, MdErrorOutline } from 'react-icons/md';
import type { LocalHistoryEntry } from '../hooks/useHistory';

interface QueryHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  entries: LocalHistoryEntry[];
  onRerun: (nl: string) => void;
  onClear: () => void;
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

export default function QueryHistory({ isOpen, onClose, entries, onRerun, onClear }: QueryHistoryProps) {
  const [search, setSearch] = useState('');

  const filteredEntries = useMemo(() => {
    if (!search) return entries;
    const lower = search.toLowerCase();
    return entries.filter(e => 
      e.natural_language.toLowerCase().includes(lower) || 
      e.sql.toLowerCase().includes(lower)
    );
  }, [entries, search]);

  const copySQL = (sql: string) => {
    navigator.clipboard.writeText(sql);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-qm-backdrop backdrop-blur-sm flex items-center justify-center font-sans p-4 z-50 animate-fade-in" onClick={onClose}>
      
      <div 
        className="w-full max-w-2xl bg-surface border border-outline-variant rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-surface-variant flex items-center justify-between bg-surface z-10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-surface-variant flex items-center justify-center text-text-high-contrast border border-outline-variant">
              <MdHistory size={18} />
            </div>
            <h2 className="text-lg font-semibold text-text-high-contrast tracking-tight">Query History</h2>
          </div>
          <button 
            className="w-8 h-8 rounded flex items-center justify-center text-text-muted hover:bg-surface-variant hover:text-on-surface transition-colors"
            onClick={onClose}
          >
            <MdClose size={20} />
          </button>
        </div>

        {/* Controls */}
        <div className="px-6 py-3 border-b border-surface-variant flex flex-col sm:flex-row items-center justify-between bg-surface-variant/30 gap-3 sm:gap-0 flex-shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button className="text-xs font-medium px-3 py-1.5 rounded-full bg-secondary-container text-on-secondary-container">All Queries</button>
            <span className="text-xs text-text-muted ml-2">{filteredEntries.length} items</span>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <MdSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
              <input 
                type="text" 
                placeholder="Search history..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-surface border border-outline-variant rounded-full pl-8 pr-3 py-1.5 text-xs outline-none focus:border-on-surface-variant transition-colors placeholder:text-text-muted w-full sm:w-48 text-on-surface"
              />
            </div>
            {entries.length > 0 && (
              <button 
                onClick={onClear}
                className="text-xs font-medium px-3 py-1.5 rounded-full bg-[#690005]/20 text-qm-error hover:bg-[#690005]/40 transition-colors flex items-center gap-1"
              >
                <MdDelete size={14} /> Clear All
              </button>
            )}
          </div>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {filteredEntries.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-12 text-text-muted">
               <MdHistory size={48} className="opacity-20 mb-4" />
               <p className="text-sm">No queries found.</p>
             </div>
          ) : (
            filteredEntries.map(entry => (
              <div key={entry.id} className="p-4 rounded-xl border border-outline-variant bg-surface hover:bg-surface-variant/50 transition-colors group">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h3 className="text-sm font-medium text-on-surface leading-snug">{entry.natural_language}</h3>
                  <span className="text-[10px] text-text-muted whitespace-nowrap font-mono mt-0.5">{formatTime(entry.timestamp)}</span>
                </div>
                
                <div className="p-3 rounded-lg bg-surface-variant/50 border border-outline-variant/50 mb-3 overflow-x-auto">
                  <code className="text-xs font-mono text-text-muted whitespace-pre block">{entry.sql}</code>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                  <div className="flex items-center gap-2">
                    {entry.error ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#690005]/20 text-qm-error border border-outline-variant/50 flex items-center gap-1">
                        <MdErrorOutline size={12} /> Error
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-secondary-container/20 text-on-secondary-container border border-outline-variant/50">
                        {entry.row_count} row{entry.row_count !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button 
                      className="p-1.5 rounded text-text-muted hover:bg-surface-variant hover:text-on-surface transition-colors" 
                      title="Copy SQL"
                      onClick={() => copySQL(entry.sql)}
                    >
                      <MdContentCopy size={16} />
                    </button>
                    <button 
                      className="px-3 py-1.5 rounded-lg bg-on-surface text-surface text-xs font-medium flex items-center gap-1.5 hover:opacity-90 transition-opacity ml-1"
                      onClick={() => onRerun(entry.natural_language)}
                    >
                      <MdPlayArrow size={16} /> Run Again
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
