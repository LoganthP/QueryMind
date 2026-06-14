import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { computeHistogramBins, computeHistogramStats } from '../../../utils/chartDataProcessor';
import type { ChartProps } from './types';

export default function HistogramChart({ rows, xCol, options, palette }: ChartProps) {
  if (!xCol) return null;

  const bins = useMemo(
    () => computeHistogramBins(rows, xCol, options?.binCount),
    [rows, xCol, options?.binCount],
  );

  const stats = useMemo(() => computeHistogramStats(rows, xCol), [rows, xCol]);

  const data = bins.map((b) => ({ label: b.label, count: b.count, x0: b.x0, x1: b.x1 }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        {options?.showGrid !== false && (
          <CartesianGrid strokeDasharray="3 3" stroke="var(--qm-outline-variant)" vertical={false} />
        )}
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: 'var(--qm-text-muted)' }}
          interval={Math.floor(data.length / 8)}
        />
        <YAxis tick={{ fontSize: 11, fill: 'var(--qm-text-muted)' }} />
        <Tooltip
          contentStyle={{
            background: 'var(--qm-bg-elevated)',
            border: '1px solid var(--qm-outline-variant)',
            borderRadius: 8,
            fontSize: 12,
            color: 'var(--qm-on-surface)',
          }}
          formatter={(value: number) => [value, 'Count']}
          labelFormatter={(label) => `Range: ${label}`}
        />
        <Bar dataKey="count" fill={palette[0]} radius={[2, 2, 0, 0]} />
        {/* Mean line */}
        <ReferenceLine
          x={(() => {
            const bin = data.find((b) => b.x0 <= stats.mean && stats.mean < b.x1);
            return bin?.label;
          })()}
          stroke="#f59e0b"
          strokeDasharray="4 4"
          label={{ value: 'Mean', fill: '#f59e0b', fontSize: 10, position: 'top' }}
        />
        {/* Median line */}
        <ReferenceLine
          x={(() => {
            const bin = data.find((b) => b.x0 <= stats.median && stats.median < b.x1);
            return bin?.label;
          })()}
          stroke="#10b981"
          strokeDasharray="4 4"
          label={{ value: 'Median', fill: '#10b981', fontSize: 10, position: 'top' }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
