import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  detectColumnTypes,
  autoSuggestChart,
  autoSuggestMessage,
  type ChartType,
  type ColumnTypeMeta,
} from '../../utils/chartDataProcessor';
import { PALETTE_NAMES, type PaletteName } from '../../utils/chartPalettes';
import ChartTypeSelector from './ChartTypeSelector';
import AxisSelector, { type AxisSelectorState } from './AxisSelector';
import ChartRenderer from './ChartRenderer';
import type { ChartOptions } from './charts/types';

interface AnalyticsTabProps {
  rows: Record<string, unknown>[];
  columns: string[];
}

// ─── Chart Empty State ─────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        color: 'var(--qm-text-muted)',
      }}
    >
      <svg
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.5}
      >
        <line x1="2" y1="2" x2="22" y2="22" />
        <path d="M7 20V12M11 20V8M15 20v-6M19 20v-4" />
      </svg>
      <p style={{ fontSize: 13, textAlign: 'center', maxWidth: 260, lineHeight: 1.5 }}>
        Run a query with numeric data to visualize it
      </p>
    </div>
  );
}

// ─── Option Toggle ─────────────────────────────────────────────────────────

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 12,
        color: 'var(--qm-on-surface)',
        cursor: 'pointer',
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: '#6B66FF', cursor: 'pointer' }}
      />
      {label}
    </label>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AnalyticsTab({ rows, columns }: AnalyticsTabProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  // ── Column meta detection ────────────────────────────────────────────────
  const colMeta: ColumnTypeMeta[] = useMemo(
    () => detectColumnTypes(rows),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows.length, columns.join(',')],
  );

  const hasNumeric = colMeta.some((c) => c.type === 'numeric');
  const isEmpty = !rows.length || !hasNumeric;

  // ── Auto-suggest ────────────────────────────────────────────────────────
  const suggestedType = useMemo(() => autoSuggestChart(rows, colMeta), [rows, colMeta]);
  const [chartType, setChartType] = useState<ChartType>(suggestedType);
  const [showSuggestBanner, setShowSuggestBanner] = useState(true);
  const [optionsOpen, setOptionsOpen] = useState(false);

  // Reset chart type and banner when result set changes
  useEffect(() => {
    setChartType(suggestedType);
    setShowSuggestBanner(true);
  }, [suggestedType]);

  // ── Default axis values ─────────────────────────────────────────────────
  const defaultAxes = useMemo((): AxisSelectorState => {
    const strings = colMeta.filter((c) => c.type === 'string').map((c) => c.name);
    const dates = colMeta.filter((c) => c.type === 'date').map((c) => c.name);
    const numerics = colMeta.filter((c) => c.type === 'numeric').map((c) => c.name);
    const strDate = [...dates, ...strings];

    return {
      xCol: strDate[0] ?? numerics[0] ?? '',
      yCol: numerics[0] ?? '',
      yCols: numerics.slice(0, 3),
      groupCol: '',
      sizeCol: numerics[1] ?? '',
      valueCol: numerics[0] ?? '',
      colCol: strings[1] ?? strings[0] ?? '',
    };
  }, [colMeta]);

  const [axes, setAxes] = useState<AxisSelectorState>(defaultAxes);

  useEffect(() => {
    setAxes(defaultAxes);
  }, [defaultAxes]);

  const handleAxesChange = useCallback((updates: Partial<AxisSelectorState>) => {
    setAxes((prev) => ({ ...prev, ...updates }));
  }, []);

  // ── Chart options ────────────────────────────────────────────────────────
  const [palette, setPalette] = useState<PaletteName>('Accent');
  const [options, setOptions] = useState<ChartOptions>({
    showGrid: true,
    showLegend: true,
    showLabels: false,
    smooth: false,
    dots: false,
    donut: false,
    horizontal: false,
    stacked: false,
    trendLine: false,
    fillOpacity: 0.4,
    binCount: undefined,
    heatmapAgg: 'count',
  });

  const updateOption = <K extends keyof ChartOptions>(key: K, value: ChartOptions[K]) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  };

  // ── Export ───────────────────────────────────────────────────────────────
  const handleDownloadPNG = async () => {
    const { default: html2canvas } = await import('html2canvas');
    if (!chartRef.current) return;
    const canvas = await html2canvas(chartRef.current, { backgroundColor: null });
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chart.png';
    a.click();
  };

  const handleCopyJSON = () => {
    const json = JSON.stringify(rows, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      alert('Chart data copied to clipboard as JSON.');
    });
  };

  // ─────────────────────────────────────────────────────────────────────────

  if (isEmpty) {
    return (
      <div style={{ height: 340, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <EmptyState />
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: '16px 0 8px',
        animation: 'fadeIn 200ms ease-out',
      }}
    >
      {/* ROW 1 — Chart Type Picker */}
      <ChartTypeSelector
        selected={chartType}
        onChange={(t) => {
          setChartType(t);
          setShowSuggestBanner(false);
        }}
      />

      {/* Auto-suggest banner */}
      {showSuggestBanner && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '7px 12px',
            background: 'rgba(107,102,255,0.07)',
            border: '0.5px solid rgba(107,102,255,0.3)',
            borderRadius: 8,
            fontSize: 12,
            color: 'var(--qm-on-surface)',
          }}
        >
          <span>
            <span style={{ color: '#6B66FF', fontWeight: 600 }}>✦</span>{' '}
            {autoSuggestMessage(chartType)}
          </span>
          <button
            onClick={() => setShowSuggestBanner(false)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--qm-text-muted)',
              cursor: 'pointer',
              fontSize: 16,
              lineHeight: 1,
              padding: '0 4px',
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* ROW 2 — Axis Configuration */}
      <AxisSelector
        chartType={chartType}
        colMeta={colMeta}
        xCol={axes.xCol}
        yCol={axes.yCol}
        yCols={axes.yCols}
        groupCol={axes.groupCol}
        sizeCol={axes.sizeCol}
        valueCol={axes.valueCol}
        colCol={axes.colCol}
        onChange={handleAxesChange}
      />

      {/* ROW 3 — Chart Canvas */}
      <div
        ref={chartRef}
        style={{
          width: '100%',
          height: 340,
          borderRadius: 12,
          border: '0.5px solid var(--qm-outline-variant)',
          background: 'var(--qm-bg-surface)',
          overflow: 'hidden',
          padding: '12px 8px 8px',
          boxSizing: 'border-box',
        }}
      >
        <ChartRenderer
          chartType={chartType}
          rows={rows}
          xCol={axes.xCol}
          yCol={axes.yCol}
          yCols={axes.yCols}
          groupCol={axes.groupCol}
          sizeCol={axes.sizeCol}
          valueCol={axes.valueCol}
          colCol={axes.colCol}
          options={options}
          palette={palette}
        />
      </div>

      {/* ROW 4 — Options Panel */}
      <div
        style={{
          borderRadius: 10,
          border: '0.5px solid var(--qm-outline-variant)',
          overflow: 'hidden',
        }}
      >
        <button
          onClick={() => setOptionsOpen(!optionsOpen)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 14px',
            background: 'var(--qm-bg-surface-variant)',
            border: 'none',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--qm-on-surface)',
          }}
        >
          <span>Chart Options</span>
          <span style={{ fontSize: 16, transition: 'transform 0.2s', transform: optionsOpen ? 'rotate(180deg)' : 'none' }}>
            ›
          </span>
        </button>

        {optionsOpen && (
          <div
            style={{
              padding: '14px 16px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 16,
              background: 'var(--qm-bg-surface)',
              borderTop: '0.5px solid var(--qm-outline-variant)',
            }}
          >
            {/* Color Scheme */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--qm-text-muted)' }}>
                Color Scheme
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                {PALETTE_NAMES.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPalette(p)}
                    title={p}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      border: palette === p ? '2px solid #6B66FF' : '1px solid var(--qm-outline-variant)',
                      background: {
                        Accent: '#6B66FF',
                        Blue: '#378ADD',
                        Green: '#639922',
                        Coral: '#D85A30',
                        Gray: '#888780',
                      }[p],
                      cursor: 'pointer',
                      boxShadow: palette === p ? '0 0 0 2px rgba(107,102,255,0.25)' : 'none',
                      transition: 'all 0.15s',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Common toggles */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'flex-end' }}>
              <Toggle label="Show Legend" checked={options.showLegend ?? true} onChange={(v) => updateOption('showLegend', v)} />
              <Toggle label="Show Grid Lines" checked={options.showGrid ?? true} onChange={(v) => updateOption('showGrid', v)} />
              <Toggle label="Show Data Labels" checked={options.showLabels ?? false} onChange={(v) => updateOption('showLabels', v)} />
            </div>

            {/* Chart-specific options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'flex-end' }}>
              {(chartType === 'bar') && (
                <>
                  <Toggle label="Horizontal" checked={options.horizontal ?? false} onChange={(v) => updateOption('horizontal', v)} />
                  <Toggle label="Stacked" checked={options.stacked ?? false} onChange={(v) => updateOption('stacked', v)} />
                </>
              )}
              {(chartType === 'line' || chartType === 'area') && (
                <>
                  <Toggle label="Smooth Curves" checked={options.smooth ?? false} onChange={(v) => updateOption('smooth', v)} />
                  {chartType === 'line' && (
                    <Toggle label="Show Dots" checked={options.dots ?? false} onChange={(v) => updateOption('dots', v)} />
                  )}
                  {chartType === 'area' && (
                    <Toggle label="Stacked" checked={options.stacked ?? false} onChange={(v) => updateOption('stacked', v)} />
                  )}
                </>
              )}
              {chartType === 'pie' && (
                <Toggle label="Donut Mode" checked={options.donut ?? false} onChange={(v) => updateOption('donut', v)} />
              )}
              {chartType === 'scatter' && (
                <Toggle label="Trend Line" checked={options.trendLine ?? false} onChange={(v) => updateOption('trendLine', v)} />
              )}
              {chartType === 'histogram' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--qm-text-muted)' }}>
                    Bin Count: {options.binCount ?? 'Auto'}
                  </span>
                  <input
                    type="range"
                    min={5}
                    max={50}
                    value={options.binCount ?? 15}
                    onChange={(e) => updateOption('binCount', Number(e.target.value))}
                    style={{ accentColor: '#6B66FF', width: 140 }}
                  />
                </div>
              )}
              {chartType === 'area' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--qm-text-muted)' }}>
                    Fill Opacity: {(options.fillOpacity ?? 0.4).toFixed(1)}
                  </span>
                  <input
                    type="range"
                    min={1}
                    max={8}
                    value={Math.round((options.fillOpacity ?? 0.4) * 10)}
                    onChange={(e) => updateOption('fillOpacity', Number(e.target.value) / 10)}
                    style={{ accentColor: '#6B66FF', width: 140 }}
                  />
                </div>
              )}
              {chartType === 'heatmap' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--qm-text-muted)' }}>
                    Aggregation
                  </span>
                  <select
                    value={options.heatmapAgg ?? 'count'}
                    onChange={(e) => updateOption('heatmapAgg', e.target.value as ChartOptions['heatmapAgg'])}
                    style={{
                      background: 'var(--qm-bg-surface)',
                      border: '0.5px solid var(--qm-outline-variant)',
                      borderRadius: 8,
                      fontSize: 12,
                      height: 28,
                      padding: '0 8px',
                      color: 'var(--qm-on-surface)',
                    }}
                  >
                    <option value="count">Count</option>
                    <option value="sum">Sum</option>
                    <option value="avg">Average</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ROW 5 — Export Bar */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={handleDownloadPNG}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            borderRadius: 8,
            border: '0.5px solid var(--qm-outline-variant)',
            background: 'var(--qm-bg-surface)',
            color: 'var(--qm-on-surface)',
            fontSize: 12,
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--qm-bg-elevated)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--qm-bg-surface)')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download PNG
        </button>

        <button
          onClick={handleCopyJSON}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            borderRadius: 8,
            border: '0.5px solid var(--qm-outline-variant)',
            background: 'var(--qm-bg-surface)',
            color: 'var(--qm-on-surface)',
            fontSize: 12,
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--qm-bg-elevated)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--qm-bg-surface)')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          Copy as JSON
        </button>
      </div>
    </div>
  );
}
