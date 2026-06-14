import { useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql, SQLite } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';
import { MdContentCopy, MdCheck, MdLightbulbOutline } from 'react-icons/md';

interface SQLOutputProps {
  sqlQuery: string;
  explanation: string;
  error: string | null;
  executionTime?: number;
}

export default function SQLOutput({ sqlQuery, explanation, error, executionTime }: SQLOutputProps) {
  const [copied, setCopied] = useState(false);

  if (!sqlQuery && !error) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(sqlQuery);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4 animate-fade-in w-full">
      <h3 className="text-xs text-text-high-contrast uppercase tracking-widest font-semibold mt-2">Query Results</h3>
      
      {/* SQL Output Card */}
      <div className="rounded-xl border border-outline-variant bg-surface-variant overflow-hidden shadow-sm">
        <div className="bg-secondary-container/30 px-4 py-2 border-b border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-text-muted uppercase tracking-wide">Generated SQL</span>
            {executionTime !== undefined && (
              <span className="bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded text-[10px] font-mono">
                {executionTime.toFixed(0)}ms
              </span>
            )}
          </div>
          <button
            onClick={handleCopy}
            className={`transition-colors ${copied ? 'text-green-500' : 'text-text-muted hover:text-on-surface'}`}
            title="Copy SQL"
          >
            {copied ? <MdCheck size={16} /> : <MdContentCopy size={16} />}
          </button>
        </div>

        <div className="text-sm font-mono text-on-surface leading-relaxed">
          <CodeMirror
            value={sqlQuery}
            extensions={[sql({ dialect: SQLite })]}
            theme={oneDark}
            readOnly
            basicSetup={{
              lineNumbers: true,
              foldGutter: false,
              highlightActiveLine: false,
            }}
            className="text-sm [&_.cm-editor]:bg-transparent [&_.cm-gutters]:bg-transparent [&_.cm-gutters]:border-r [&_.cm-gutters]:border-outline-variant"
          />
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-4 bg-[#690005]/20 rounded-xl border border-[#690005]/50 shadow-sm">
          <p className="text-qm-error text-sm font-mono whitespace-pre-wrap leading-relaxed">
            {error}
          </p>
        </div>
      )}

      {/* Explanation card */}
      {explanation && !error && (
        <div className="p-4 bg-secondary-container/20 rounded-xl border border-outline-variant flex gap-3 items-start shadow-sm">
          <div className="w-7 h-7 rounded-lg bg-surface flex items-center justify-center flex-shrink-0 border border-outline-variant">
            <MdLightbulbOutline size={16} className="text-text-high-contrast" />
          </div>
          <p className="text-text-muted text-sm leading-relaxed pt-0.5">
            {explanation}
          </p>
        </div>
      )}
    </div>
  );
}
