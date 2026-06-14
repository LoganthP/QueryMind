import { useState, useEffect, useRef, useMemo } from 'react';
import { api } from '../api/client';
import type { ModelInfo } from '../api/client';
import { HiCpuChip } from 'react-icons/hi2';
import { HiChevronDown, HiCheck } from 'react-icons/hi';

interface ModelSelectorProps {
  selectedModel: string;
  onChange: (modelId: string) => void;
}

/** Group models by provider prefix (e.g. "anthropic", "openai") */
function groupModels(models: ModelInfo[]): Map<string, ModelInfo[]> {
  const groups = new Map<string, ModelInfo[]>();
  for (const m of models) {
    const slash = m.id.indexOf('/');
    const provider = slash > 0 ? m.id.substring(0, slash) : 'other';
    const label = provider.charAt(0).toUpperCase() + provider.slice(1);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(m);
  }
  return groups;
}

export default function ModelSelector({ selectedModel, onChange }: ModelSelectorProps) {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [focusIdx, setFocusIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchModels() {
      try {
        const response = await api.getModels();
        setModels(response.models);
      } catch (error) {
        console.error('Failed to fetch models:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchModels();
  }, []);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Flat list of selectable model IDs for keyboard navigation
  const flatIds = useMemo(() => models.map((m) => m.id), [models]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusIdx((i) => Math.min(i + 1, flatIds.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusIdx((i) => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter' && focusIdx >= 0 && focusIdx < flatIds.length) {
        onChange(flatIds[focusIdx]);
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, focusIdx, flatIds, onChange]);

  // Scroll focused item into view
  useEffect(() => {
    if (!open || focusIdx < 0) return;
    const el = listRef.current?.querySelector(`[data-idx="${focusIdx}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [open, focusIdx]);

  const selectedName = models.find((m) => m.id === selectedModel)?.name ?? selectedModel.split('/').pop() ?? 'Select model';

  const grouped = useMemo(() => groupModels(models), [models]);

  return (
    <div className="flex flex-col gap-1" ref={containerRef}>
      <label className="text-xs font-medium text-text-muted">AI Model</label>
      <div className="relative">
        {/* Trigger button */}
        <button
          type="button"
          onClick={() => { setOpen(!open); setFocusIdx(flatIds.indexOf(selectedModel)); }}
          disabled={isLoading || models.length === 0}
          className="w-full flex items-center gap-2 bg-surface-variant border border-outline-variant text-on-surface text-sm rounded-lg px-3 py-2 text-left transition-colors hover:border-on-surface-variant disabled:opacity-50 cursor-pointer"
        >
          <HiCpuChip size={16} className="text-text-muted shrink-0" />
          <span className="truncate flex-1 font-medium">
            {isLoading ? 'Loading models...' : selectedName}
          </span>
          <HiChevronDown size={16} className={`text-text-muted shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown popover */}
        {open && (
          <div
            ref={listRef}
            className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-outline-variant shadow-2xl overflow-hidden z-50 animate-fade-in"
            style={{ background: 'var(--qm-bg-elevated)', maxHeight: '320px', overflowY: 'auto' }}
          >
            {Array.from(grouped.entries()).map(([provider, items]) => {
              // Calculate the starting index for this group
              let groupStartIdx = 0;
              for (const [p, g] of grouped.entries()) {
                if (p === provider) break;
                groupStartIdx += g.length;
              }

              return (
                <div key={provider}>
                  {/* Group header */}
                  <div
                    className="px-3 pt-2.5 pb-1 text-[11px] font-semibold uppercase tracking-widest select-none"
                    style={{ color: 'var(--qm-text-muted)' }}
                  >
                    {provider}
                  </div>

                  {/* Items */}
                  {items.map((model, i) => {
                    const globalIdx = groupStartIdx + i;
                    const isSelected = model.id === selectedModel;
                    const isFocused = globalIdx === focusIdx;

                    return (
                      <button
                        key={model.id}
                        data-idx={globalIdx}
                        onClick={() => { onChange(model.id); setOpen(false); }}
                        className="w-full text-left px-3 py-2 text-[13px] flex items-center gap-2 transition-colors cursor-pointer"
                        style={{
                          color: isSelected ? '#A5A2FF' : 'var(--qm-on-surface)',
                          fontWeight: isSelected ? 500 : 400,
                          background: isFocused
                            ? 'var(--qm-bg-surface-variant)'
                            : isSelected
                              ? 'rgba(107, 102, 255, 0.12)'
                              : 'transparent',
                        }}
                        onMouseEnter={() => setFocusIdx(globalIdx)}
                      >
                        <span className="truncate flex-1">{model.name}</span>
                        {isSelected && <HiCheck size={16} className="shrink-0 text-[#A5A2FF]" />}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <p className="text-[10px] text-text-muted mt-1 ml-1">Powered by OpenRouter</p>
    </div>
  );
}
