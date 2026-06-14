/**
 * QueryMind — ConnectionModal Component
 * Modal dialog for connecting to databases (SQLite, PostgreSQL, MySQL).
 * Implements a state machine for upload flow: idle → uploading → success → auto-close.
 */

import { useState, useRef, useEffect } from 'react';
import { HiX, HiUpload, HiDatabase, HiLightningBolt } from 'react-icons/hi';
import { MdCheck, MdErrorOutline, MdInsertDriveFile } from 'react-icons/md';
import type { ConnectionResponse } from '../api/client';

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (config: { db_type: string; connection_string: string; name: string }) => Promise<ConnectionResponse>;
  onUpload: (file: File) => Promise<ConnectionResponse>;
  onUseSample: () => void;
  isConnecting: boolean;
  error: Error | null;
}

type DbTab = 'sqlite' | 'postgresql' | 'mysql';
type UploadState = 'idle' | 'uploading' | 'success' | 'error';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const VALID_EXTENSIONS = ['.db', '.sqlite', '.sqlite3'];

export default function ConnectionModal({
  isOpen,
  onClose,
  onConnect,
  onUpload,
  onUseSample,
  isConnecting,
  error,
}: ConnectionModalProps) {
  const [activeTab, setActiveTab] = useState<DbTab>('sqlite');
  const [pgHost, setPgHost] = useState('localhost');
  const [pgPort, setPgPort] = useState('5432');
  const [pgDb, setPgDb] = useState('');
  const [pgUser, setPgUser] = useState('');
  const [pgPass, setPgPass] = useState('');
  const [myHost, setMyHost] = useState('localhost');
  const [myPort, setMyPort] = useState('3306');
  const [myDb, setMyDb] = useState('');
  const [myUser, setMyUser] = useState('');
  const [myPass, setMyPass] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Upload state machine
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [successData, setSuccessData] = useState<{ table_count: number; column_count: number } | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setUploadState('idle');
      setUploadFileName('');
      setUploadError('');
      setSuccessData(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const validateFile = (file: File): string | null => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!VALID_EXTENSIONS.includes(ext)) {
      return 'Only .db, .sqlite, .sqlite3 files are supported';
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 100MB.`;
    }
    return null;
  };

  const handleFile = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setUploadState('error');
      setUploadError(validationError);
      return;
    }

    setUploadFileName(file.name);
    setUploadState('uploading');
    setUploadError('');

    try {
      const data = await onUpload(file);
      setSuccessData({ table_count: data.table_count, column_count: data.column_count });
      setUploadState('success');
      // Auto-close after 1200ms
      setTimeout(() => onClose(), 1200);
    } catch (err) {
      setUploadState('error');
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  const handleUseSampleClick = async () => {
    setUploadFileName('sample.db');
    setUploadState('uploading');
    setUploadError('');

    try {
      // The onUseSample function handles the connection; we also need the response data
      // We call onConnect directly with sample params
      const data = await onConnect({ db_type: 'sqlite', connection_string: 'sample.db', name: 'Sample Database' });
      setSuccessData({ table_count: data.table_count, column_count: data.column_count });
      setUploadState('success');
      setTimeout(() => onClose(), 1200);
    } catch (err) {
      setUploadState('error');
      setUploadError(err instanceof Error ? err.message : 'Failed to connect to sample database');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handlePgConnect = () => {
    const connStr = `postgresql://${pgUser}:${pgPass}@${pgHost}:${pgPort}/${pgDb}`;
    onConnect({ db_type: 'postgresql', connection_string: connStr, name: pgDb || 'PostgreSQL' });
  };

  const handleMyConnect = () => {
    const connStr = `${myUser}:${myPass}@${myHost}:${myPort}/${myDb}`;
    onConnect({ db_type: 'mysql', connection_string: connStr, name: myDb || 'MySQL' });
  };

  const resetUpload = () => {
    setUploadState('idle');
    setUploadFileName('');
    setUploadError('');
    setSuccessData(null);
  };

  const tabs: { key: DbTab; label: string; icon: string }[] = [
    { key: 'sqlite', label: 'SQLite', icon: '📁' },
    { key: 'postgresql', label: 'PostgreSQL', icon: '🐘' },
    { key: 'mysql', label: 'MySQL', icon: '🐬' },
  ];

  const inputClass = 'w-full bg-surface-variant border border-outline-variant rounded-md px-3 py-2 text-on-surface text-sm focus:outline-none focus:border-blue-500 transition-colors';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-60 bg-qm-backdrop backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] max-w-[92vw] max-h-[85vh] overflow-y-auto z-70 bg-surface border border-outline-variant rounded-xl shadow-2xl flex flex-col font-sans animate-slide-up"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-variant shrink-0">
          <div className="flex items-center gap-2 text-text-high-contrast">
            <HiDatabase size={20} className="text-blue-500" />
            <h2 className="text-lg font-semibold tracking-tight">Connect Database</h2>
          </div>
          <button className="text-text-muted hover:text-on-surface transition-colors p-1 rounded-md hover:bg-surface-variant" onClick={onClose}>
            <HiX size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-surface-variant shrink-0 bg-surface-variant/30">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); resetUpload(); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 text-sm transition-colors border-b-2 ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-400 font-semibold bg-surface-variant/50'
                  : 'border-transparent text-text-muted hover:text-on-surface hover:bg-surface-variant/30'
              }`}
            >
              <span className="text-base">{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto bg-surface">
          {/* Global error from parent (connection hook) */}
          {error && uploadState === 'idle' && (
            <div className="p-3 mb-4 rounded-md text-sm bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-2">
              <MdErrorOutline size={16} className="shrink-0" />
              {error.message}
            </div>
          )}

          {/* SQLite tab */}
          {activeTab === 'sqlite' && (
            <div className="flex flex-col gap-4">
              {/* STATE: Uploading */}
              {uploadState === 'uploading' && (
                <div className="flex flex-col gap-3 animate-fade-in">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-variant border border-outline-variant">
                    <MdInsertDriveFile size={18} className="text-blue-400 shrink-0" />
                    <span className="text-sm text-on-surface truncate">{uploadFileName}</span>
                  </div>
                  <div className="relative h-2 rounded-full bg-surface-variant overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-400 rounded-full animate-pulse" style={{ width: '70%' }}>
                      <div className="absolute inset-0 bg-white/20 animate-[shimmer_1.5s_infinite]" style={{
                        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                        animation: 'shimmer 1.5s infinite',
                      }} />
                    </div>
                  </div>
                  <p className="text-xs text-text-muted text-center">Connecting...</p>
                </div>
              )}

              {/* STATE: Success */}
              {uploadState === 'success' && (
                <div className="flex flex-col items-center gap-3 py-4 animate-fade-in">
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center border-2 border-green-500">
                    <MdCheck size={28} className="text-green-400" />
                  </div>
                  <p className="text-sm font-medium text-on-surface">
                    Connected to {uploadFileName}
                  </p>
                  {successData && (
                    <p className="text-xs text-text-muted">
                      {successData.table_count} table{successData.table_count !== 1 ? 's' : ''} · {successData.column_count} column{successData.column_count !== 1 ? 's' : ''} detected
                    </p>
                  )}
                </div>
              )}

              {/* STATE: Error */}
              {uploadState === 'error' && (
                <div className="flex flex-col gap-4 animate-fade-in">
                  <div className="p-3 rounded-md text-sm bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-2">
                    <MdErrorOutline size={16} className="shrink-0" />
                    {uploadError}
                  </div>
                  <button
                    onClick={resetUpload}
                    className="text-xs text-blue-400 hover:text-blue-300 underline self-center"
                  >
                    Try again
                  </button>
                </div>
              )}

              {/* STATE: Idle */}
              {uploadState === 'idle' && (
                <>
                  {/* Use sample button */}
                  <button
                    onClick={handleUseSampleClick}
                    disabled={isConnecting}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-surface-variant border border-outline-variant hover:bg-surface-variant/80 text-on-surface font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <HiLightningBolt size={18} className="text-yellow-400" />
                    Use Sample Database
                  </button>

                  <div className="text-center text-text-muted text-xs uppercase tracking-widest my-2">
                    — or upload your own —
                  </div>

                  {/* Drag & drop zone */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileRef.current?.click()}
                    className={`flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
                      dragOver
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-outline-variant hover:border-blue-500/50 hover:bg-surface-variant/50'
                    }`}
                  >
                    <HiUpload size={32} className={`mb-3 ${dragOver ? 'text-blue-500' : 'text-text-muted'}`} />
                    <p className="text-sm text-on-surface mb-1">
                      Drop a .db file here, or click to browse
                    </p>
                    <p className="text-xs text-text-muted">
                      Supports .db, .sqlite, .sqlite3 · Max 100MB
                    </p>
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".db,.sqlite,.sqlite3"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFile(file);
                    }}
                  />
                </>
              )}
            </div>
          )}

          {/* PostgreSQL tab */}
          {activeTab === 'postgresql' && (
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <div className="flex-[3]">
                  <label className="block text-xs text-text-muted mb-1">Host</label>
                  <input className={inputClass} value={pgHost} onChange={(e) => setPgHost(e.target.value)} placeholder="localhost" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-text-muted mb-1">Port</label>
                  <input className={inputClass} value={pgPort} onChange={(e) => setPgPort(e.target.value)} placeholder="5432" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Database</label>
                <input className={inputClass} value={pgDb} onChange={(e) => setPgDb(e.target.value)} placeholder="mydb" />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Username</label>
                <input className={inputClass} value={pgUser} onChange={(e) => setPgUser(e.target.value)} placeholder="postgres" />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Password</label>
                <input className={inputClass} type="password" value={pgPass} onChange={(e) => setPgPass(e.target.value)} />
              </div>
              <button
                onClick={handlePgConnect}
                disabled={isConnecting || !pgDb}
                className="w-full mt-2 py-2 px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isConnecting ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          )}

          {/* MySQL tab */}
          {activeTab === 'mysql' && (
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <div className="flex-[3]">
                  <label className="block text-xs text-text-muted mb-1">Host</label>
                  <input className={inputClass} value={myHost} onChange={(e) => setMyHost(e.target.value)} placeholder="localhost" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-text-muted mb-1">Port</label>
                  <input className={inputClass} value={myPort} onChange={(e) => setMyPort(e.target.value)} placeholder="3306" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Database</label>
                <input className={inputClass} value={myDb} onChange={(e) => setMyDb(e.target.value)} placeholder="mydb" />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Username</label>
                <input className={inputClass} value={myUser} onChange={(e) => setMyUser(e.target.value)} placeholder="root" />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Password</label>
                <input className={inputClass} type="password" value={myPass} onChange={(e) => setMyPass(e.target.value)} />
              </div>
              <button
                onClick={handleMyConnect}
                disabled={isConnecting || !myDb}
                className="w-full mt-2 py-2 px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isConnecting ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
