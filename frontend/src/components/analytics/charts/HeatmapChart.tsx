import { useMemo } from 'react';
import { prepareHeatmapData } from '../../../utils/chartDataProcessor';
import type { ChartProps } from './types';
import type { AggFn } from '../../../utils/chartDataProcessor';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function interpolateColor(t: number, accent: string): string {
  const [r1, g1, b1] = [240, 240, 248]; // near white
  const [r2, g2, b2] = hexToRgb(accent);
  return `rgb(${Math.round(lerp(r1, r2, t))},${Math.round(lerp(g1, g2, t))},${Math.round(lerp(b1, b2, t))})`;
}

export default function HeatmapChart({ rows, xCol, yCol, valueCol, options, palette }: ChartProps) {
  const rowCol = xCol;
  const colCol = yCol;

  const matrix = useMemo(() => {
    if (!rowCol || !colCol) return null;
    return prepareHeatmapData(
      rows,
      rowCol,
      colCol,
      valueCol ?? null,
      (options?.heatmapAgg ?? 'count') as AggFn,
    );
  }, [rows, rowCol, colCol, valueCol, options?.heatmapAgg]);

  if (!matrix || !matrix.rows.length || !matrix.cols.length) return null;

  const { rows: rowLabels, cols: colLabels, min, max } = matrix;
  const range = max - min || 1;
  const accent = palette[0];
  const CELL_W = Math.max(36, Math.min(80, Math.floor(600 / colLabels.length)));
  const CELL_H = Math.max(28, Math.min(60, Math.floor(280 / rowLabels.length)));
  const showLabel = rowLabels.length <= 10 && colLabels.length <= 10;
  const LABEL_W = 90;

  return (
    <div
      style={{ width: '100%', height: '100%', overflowX: 'auto', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}
    >
      {/* Column headers */}
      <div style={{ display: 'flex', marginLeft: LABEL_W }}>
        {colLabels.map((col) => (
          <div
            key={col}
            style={{
              width: CELL_W,
              minWidth: CELL_W,
              fontSize: 10,
              color: 'var(--qm-text-muted)',
              textAlign: 'center',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              padding: '0 2px',
            }}
            title={col}
          >
            {col}
          </div>
        ))}
      </div>

      {/* Rows */}
      {rowLabels.map((rowLabel, ri) => (
        <div key={rowLabel} style={{ display: 'flex', alignItems: 'center' }}>
          {/* Row label */}
          <div
            style={{
              width: LABEL_W,
              minWidth: LABEL_W,
              fontSize: 10,
              color: 'var(--qm-text-muted)',
              textAlign: 'right',
              paddingRight: 6,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={rowLabel}
          >
            {rowLabel}
          </div>

          {/* Cells */}
          {colLabels.map((_, ci) => {
            const val = matrix.matrix[ri][ci];
            const t = (val - min) / range;
            const bg = interpolateColor(t, accent);
            const textColor = t > 0.55 ? '#fff' : '#333';

            return (
              <div
                key={ci}
                title={`${rowLabel} × ${colLabels[ci]}: ${val.toLocaleString()}`}
                style={{
                  width: CELL_W,
                  minWidth: CELL_W,
                  height: CELL_H,
                  background: bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontFamily: 'JetBrains Mono, monospace',
                  color: textColor,
                  border: '1px solid var(--qm-outline-variant)',
                  boxSizing: 'border-box',
                  cursor: 'default',
                  transition: 'filter 0.1s',
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.filter = 'brightness(1.15)')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.filter = 'none')}
              >
                {showLabel ? (Number.isInteger(val) ? val : val.toFixed(1)) : ''}
              </div>
            );
          })}
        </div>
      ))}

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, marginLeft: LABEL_W }}>
        <span style={{ fontSize: 10, color: 'var(--qm-text-muted)' }}>{min.toFixed(0)}</span>
        <div
          style={{
            flex: 1,
            maxWidth: 160,
            height: 8,
            borderRadius: 4,
            background: `linear-gradient(to right, ${interpolateColor(0, accent)}, ${interpolateColor(1, accent)})`,
          }}
        />
        <span style={{ fontSize: 10, color: 'var(--qm-text-muted)' }}>{max.toFixed(0)}</span>
      </div>
    </div>
  );
}
