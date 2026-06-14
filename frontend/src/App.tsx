import { useState, useCallback } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import {
  MdOutlineStorage, MdHistory, MdSettings, MdMenu, MdClose, MdChatBubbleOutline,
  MdAutoAwesome, MdLightMode, MdDarkMode
} from 'react-icons/md';
import { useTheme } from './context/ThemeContext';

import QueryInput from './components/QueryInput';
import SQLOutput from './components/SQLOutput';
import ResultsPanel from './components/ResultsPanel';
import SchemaTree from './components/SchemaTree';
import QueryHistory from './components/QueryHistory';
import ConnectionModal from './components/ConnectionModal';
import ModelSelector from './components/ModelSelector';
import TableInspector from './components/TableInspector';
import LandingPage from './components/LandingPage';

import { useQueryMind } from './hooks/useQueryMind';
import { useSchema } from './hooks/useSchema';
import { useConnection } from './hooks/useConnection';
import { useHistory } from './hooks/useHistory';

function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [connectionOpen, setConnectionOpen] = useState(false);
  const [queryInput, setQueryInput] = useState('');
  const [modelId, setModelId] = useState('anthropic/claude-sonnet-4');
  const [activeTab, setActiveTab] = useState<'chat' | 'schema' | 'history' | 'settings'>('chat');
  const [inspectTable, setInspectTable] = useState<string | null>(null);
  const { theme, toggleTheme } = useTheme();

  const connection = useConnection();
  const schema = useSchema(connection.dbId);
  const query = useQueryMind();
  const history = useHistory();
  const qc = useQueryClient();

  const handleQuery = useCallback(
    async (nl: string, writeMode: boolean) => {
      try {
        const result = await query.runQueryAsync({
          natural_language: nl,
          db_id: connection.dbId,
          write_mode: writeMode,
          model_id: modelId,
        });

        history.addEntry({
          natural_language: nl,
          sql: result.sql,
          row_count: result.row_count,
          error: result.error,
        });

        if (result.error) {
          toast.error('Query returned an error');
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Query failed');
      }
    },
    [connection.dbId, query, history, modelId],
  );

  const handleRerun = (nl: string) => {
    setQueryInput(nl);
    setHistoryOpen(false);
    setActiveTab('chat');
    handleQuery(nl, false);
  };

  const handleTableClick = (tableName: string) => {
    setQueryInput((prev) =>
      prev ? `${prev} (from ${tableName} table)` : `Show me data from the ${tableName} table`,
    );
    setActiveTab('chat');
    toast(`Added "${tableName}" to query context`, { icon: '📋', duration: 1500 });
  };

  const handleUseSample = () => {
    // The modal's state machine handles the flow now
    // This is kept as a no-op callback for the modal
  };

  const handleModalClose = () => {
    setConnectionOpen(false);
    setActiveTab('chat');
    // Trigger schema refetch when modal closes after any connection
    qc.invalidateQueries({ queryKey: ['schema'] });
  };

  if (showLanding) {
    return <LandingPage onGetStarted={() => setShowLanding(false)} />;
  }

  return (
    <div className="bg-surface text-on-surface h-screen overflow-hidden flex flex-col font-sans">
      {/* ─── Top Header Bar (Desktop & Tablet) ──────────────────────────────── */}
      <header className="h-14 border-b border-surface-variant flex items-center justify-between px-4 flex-shrink-0 bg-surface z-30">
        <div className="flex items-center gap-3">
          <button
            className="md:hidden w-8 h-8 rounded flex items-center justify-center text-text-muted hover:bg-surface-variant hover:text-on-surface"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <MdClose size={20} /> : <MdMenu size={20} />}
          </button>
          <div className="w-8 h-8 rounded-lg bg-surface-variant flex items-center justify-center text-text-high-contrast border border-outline-variant">
            <MdAutoAwesome size={18} />
          </div>
          <span className="font-semibold text-text-high-contrast tracking-tight">QueryMind</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 mr-4">
            <span className={`w-2 h-2 rounded-full ${connection.status === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-text-muted hidden md:inline">{connection.dbName || 'Not Connected'}</span>
          </div>
          <button
            className="hidden md:flex w-8 h-8 rounded items-center justify-center text-text-muted hover:bg-surface-variant hover:text-on-surface transition-colors"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <MdLightMode size={20} /> : <MdDarkMode size={20} />}
          </button>
          <button
            className="hidden md:flex w-8 h-8 rounded items-center justify-center text-text-muted hover:bg-surface-variant hover:text-on-surface transition-colors"
            onClick={() => setHistoryOpen(true)}
            title="History"
          >
            <MdHistory size={20} />
          </button>
          <button
            className="hidden md:flex w-8 h-8 rounded items-center justify-center text-text-muted hover:bg-surface-variant hover:text-on-surface transition-colors"
            onClick={() => setConnectionOpen(true)}
            title="Database Settings"
          >
            <MdSettings size={20} />
          </button>
        </div>
      </header>

      {/* ─── Main Content Area ───────────────────────────── */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar: Schema Tree & Models */}
        <aside className={`${sidebarOpen ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-[320px] bg-surface border-r border-surface-variant flex-shrink-0 absolute md:relative z-20 h-full`}>
          <div className="p-4 border-b border-surface-variant">
            <ModelSelector selectedModel={modelId} onChange={setModelId} />
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
             <SchemaTree
               tables={schema.tables}
               dialect={schema.dialect}
               isLoading={schema.isLoading}
               onTableClick={handleTableClick}
               onInspect={setInspectTable}
             />
          </div>
        </aside>

        {/* Main Panel: Chat & Results */}
        <main className="flex-1 flex flex-col min-w-0 bg-surface relative z-10 h-full max-h-full">
          <div className="flex-1 overflow-y-auto w-full">
            <div className="px-4 md:px-8 py-6 pb-20 md:pb-6 flex flex-col max-w-5xl mx-auto w-full">
            
            {/* Welcome message */}
            {!query.data && !query.isLoading && (
              <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto fade-in">
                <div className="w-16 h-16 rounded-2xl bg-surface-variant border border-outline-variant flex items-center justify-center mb-6">
                  <MdOutlineStorage size={32} className="text-text-muted" />
                </div>
                <h1 className="text-xl font-semibold text-text-high-contrast mb-2">Connect to your data</h1>
                <p className="text-sm text-text-muted mb-8 leading-relaxed">
                  QueryMind translates your natural language questions into executable SQL queries.
                </p>
                <div className="flex flex-col gap-2 w-full">
                  {['Show me all users', 'Revenue by product category', 'Top 5 most expensive products'].map((example) => (
                    <button
                      key={example}
                      onClick={() => {
                        setQueryInput(example);
                        handleQuery(example, false);
                      }}
                      className="text-left px-4 py-3 rounded-xl bg-surface-variant/50 hover:bg-surface-variant border border-outline-variant text-sm text-on-surface transition-colors"
                    >
                      "{example}"
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* SQL & Results Output */}
            {query.isLoading && (
              <div className="space-y-4 max-w-4xl w-full mx-auto">
                <div className="h-24 bg-surface-variant/50 rounded-xl animate-pulse" />
                <div className="h-64 bg-surface-variant/50 rounded-xl animate-pulse" />
              </div>
            )}

            {query.data && !query.isLoading && (
              <div className="space-y-6 max-w-4xl w-full mx-auto">
                <SQLOutput
                  sqlQuery={query.data.sql}
                  explanation={query.data.explanation}
                  error={query.data.error}
                  executionTime={query.data.execution_time_ms}
                />

                {!query.data.error && query.data.results.length > 0 && (
                  <ResultsPanel
                    results={query.data.results}
                    columns={query.data.columns}
                    rowCount={query.data.row_count}
                  />
                )}
              </div>
            )}

            {/* API Error */}
            {query.error && !query.isLoading && (
              <div className="p-4 bg-[#690005]/20 border border-[#690005] rounded-xl max-w-4xl w-full mx-auto mt-4">
                <p className="text-qm-error text-sm">
                  {query.error.message}
                </p>
              </div>
            )}
            </div>
          </div>

          {/* Bottom Chat Input Fixed Area */}
          <div className="w-full flex-shrink-0 p-4 bg-gradient-to-t from-surface via-surface to-transparent md:bg-surface md:border-t md:border-surface-variant relative z-20">
            <div className="max-w-4xl mx-auto w-full pb-16 md:pb-0">
               <QueryInput
                 onSubmit={handleQuery}
                 isLoading={query.isLoading}
                 initialValue={queryInput}
               />
            </div>
          </div>
        </main>
      </div>

      {/* ─── Overlays ──────────────────────────────────── */}
      <QueryHistory
        isOpen={historyOpen}
        onClose={() => { setHistoryOpen(false); setActiveTab('chat'); }}
        entries={history.entries}
        onRerun={handleRerun}
        onClear={history.clearAll}
      />

      <ConnectionModal
        isOpen={connectionOpen}
        onClose={handleModalClose}
        onConnect={connection.connect}
        onUpload={connection.uploadDb}
        onUseSample={handleUseSample}
        isConnecting={connection.isConnecting}
        error={connection.connectionError}
      />

      {inspectTable && (
        <TableInspector
          tableName={inspectTable}
          dbId={connection.dbId}
          onClose={() => setInspectTable(null)}
        />
      )}

      {/* ─── Mobile Bottom Navigation ────────────────────── */}
      <nav className="md:hidden fixed bottom-0 w-full h-16 bg-surface-variant border-t border-outline-variant flex items-center justify-around z-50">
        <button 
          onClick={() => { setActiveTab('chat'); setSidebarOpen(false); setHistoryOpen(false); setConnectionOpen(false); }}
          className={`flex flex-col items-center gap-1 ${activeTab === 'chat' ? 'text-on-surface' : 'text-text-muted'}`}
        >
          <MdChatBubbleOutline size={22} />
          <span className="text-[10px] font-medium">Chat</span>
        </button>
        <button 
          onClick={() => { setActiveTab('schema'); setSidebarOpen(true); setHistoryOpen(false); setConnectionOpen(false); }}
          className={`flex flex-col items-center gap-1 ${activeTab === 'schema' ? 'text-on-surface' : 'text-text-muted'}`}
        >
          <MdOutlineStorage size={22} />
          <span className="text-[10px] font-medium">Schema</span>
        </button>
        <button 
          onClick={() => { setActiveTab('history'); setHistoryOpen(true); setSidebarOpen(false); setConnectionOpen(false); }}
          className={`flex flex-col items-center gap-1 ${activeTab === 'history' ? 'text-on-surface' : 'text-text-muted'}`}
        >
          <MdHistory size={22} />
          <span className="text-[10px] font-medium">History</span>
        </button>
        <button 
          onClick={() => { setActiveTab('settings'); setConnectionOpen(true); setSidebarOpen(false); setHistoryOpen(false); }}
          className={`flex flex-col items-center gap-1 ${activeTab === 'settings' ? 'text-on-surface' : 'text-text-muted'}`}
        >
          <MdSettings size={22} />
          <span className="text-[10px] font-medium">Settings</span>
        </button>
      </nav>

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--color-surface-variant)',
            color: 'var(--color-text-high-contrast)',
            border: '1px solid var(--color-outline-variant)',
            fontSize: '14px',
          },
        }}
      />
    </div>
  );
}

export default App;
