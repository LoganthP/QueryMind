import { useState, useRef, useEffect } from 'react';
import { MdSend, MdEditNote, MdWarning } from 'react-icons/md';

interface QueryInputProps {
  onSubmit: (query: string, writeMode: boolean) => void;
  isLoading: boolean;
  initialValue?: string;
}

export default function QueryInput({ onSubmit, isLoading, initialValue = '' }: QueryInputProps) {
  const [value, setValue] = useState(initialValue);
  const [writeMode, setWriteMode] = useState(false);
  const [showWriteConfirm, setShowWriteConfirm] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (initialValue) setValue(initialValue);
  }, [initialValue]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!value.trim() || isLoading) return;
    onSubmit(value.trim(), writeMode);
  };

  const handleWriteToggle = () => {
    if (!writeMode) {
      setShowWriteConfirm(true);
    } else {
      setWriteMode(false);
    }
  };

  const confirmWriteMode = () => {
    setWriteMode(true);
    setShowWriteConfirm(false);
  };

  return (
    <div className="relative animate-fade-in w-full">
      <div className="bg-surface-variant border border-outline-variant rounded-2xl p-2 flex flex-col gap-2 shadow-lg">
        <textarea
          ref={textareaRef}
          id="query-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about your data... (e.g., Show me all users)"
          rows={2}
          className="w-full bg-transparent border-none outline-none text-on-surface placeholder:text-text-muted resize-y px-2 py-1 min-h-[60px] max-h-[300px] text-sm"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleWriteToggle}
              className={`px-3 py-1.5 rounded-full text-[11px] font-medium flex items-center gap-1.5 transition-colors ${
                writeMode 
                  ? 'bg-[#690005]/20 text-qm-error border border-[#690005]/50' 
                  : 'bg-secondary-container text-on-secondary-container hover:bg-surface'
              }`}
              title={writeMode ? 'Write mode ON — destructive queries allowed' : 'Read-only mode — only SELECT queries'}
            >
              {writeMode ? <MdWarning size={14} /> : <MdEditNote size={14} />}
              {writeMode ? 'Write Mode' : 'Read Only'}
            </button>
            <span className="text-[10px] text-text-muted hidden sm:inline-block font-mono">
              {value.length} / 2000
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] text-text-muted hidden sm:inline-block">
              Enter to run, Shift+Enter for new line
            </span>
            <button
              className="h-9 w-9 rounded-xl bg-on-surface text-surface flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50"
              onClick={handleSubmit}
              disabled={!value.trim() || isLoading}
              id="run-query-btn"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-surface border-t-transparent rounded-full animate-spin" />
              ) : (
                <MdSend size={18} />
              )}
            </button>
          </div>
        </div>
      </div>

      {showWriteConfirm && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] backdrop-blur-sm p-4"
          onClick={() => setShowWriteConfirm(false)}
        >
          <div
            className="bg-surface-variant border border-outline-variant rounded-2xl p-6 max-w-[420px] w-full animate-slide-up shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[#690005]/20 flex items-center justify-center">
                <MdWarning size={20} className="text-qm-error" />
              </div>
              <h3 className="text-lg font-semibold text-text-high-contrast">Enable Write Mode?</h3>
            </div>
            <p className="text-sm text-text-muted mb-6 leading-relaxed">
              Write mode allows INSERT, UPDATE, and DELETE queries. This can permanently modify your database.
              Only enable this if you understand the risks.
            </p>
            <div className="flex gap-3 justify-end">
              <button 
                className="px-4 py-2 rounded-lg text-sm font-medium text-text-muted hover:text-on-surface hover:bg-surface transition-colors"
                onClick={() => setShowWriteConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg text-sm font-medium bg-qm-error text-qm-on-error-container hover:opacity-90 transition-opacity"
                onClick={confirmWriteMode}
              >
                Enable Write Mode
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
