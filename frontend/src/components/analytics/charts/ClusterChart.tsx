import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ZAxis,
} from 'recharts';
import { prepareScatterData } from '../../../utils/chartDataProcessor';
import type { ChartProps } from './types';

export default function ClusterChart({ rows, xCol, yCol, groupCol, sizeCol, options, palette }: ChartProps) {
  if (!xCol || !yCol) return null;

  const groups = prepareScatterData(rows, xCol, yCol, groupCol, sizeCol);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        {options?.showGrid !== false && (
          <CartesianGrid strokeDasharray="3 3" stroke="var(--qm-outline-variant)" />
        )}
        <XAxis
          dataKey="x"
          type="number"
          name={xCol}
          tick={{ fontSize: 11, fill: 'var(--qm-text-muted)' }}
          label={{ value: xCol, position: 'insideBottom', offset: -2, fontSize: 11, fill: 'var(--qm-text-muted)' }}
        />
        <YAxis
          dataKey="y"
          type="number"
          name={yCol}
          tick={{ fontSize: 11, fill: 'var(--qm-text-muted)' }}
          label={{ value: yCol, angle: -90, position: 'insideLeft', fontSize: 11, fill: 'var(--qm-text-muted)' }}
        />
        <ZAxis dataKey="size" range={[20, 400]} />
        <Tooltip
          cursor={{ strokeDasharray: '3 3' }}
          contentStyle={{
            background: 'var(--qm-bg-elevated)',
            border: '1px solid var(--qm-outline-variant)',
            borderRadius: 8,
            fontSize: 12,
            color: 'var(--qm-on-surface)',
          }}
          formatter={(value: number, name: string) => [value.toLocaleString(), name]}
        />
        {options?.showLegend !== false && (
          <Legend wrapperStyle={{ fontSize: 12, color: 'var(--qm-text-muted)' }} />
        )}
        {groups.map((group, i) => (
          <Scatter
            key={group.name}
            name={group.name}
            data={group.data}
            fill={palette[i % palette.length]}
            fillOpacity={0.7}
          />
        ))}
      </ScatterChart>
    </ResponsiveContainer>
  );
}
