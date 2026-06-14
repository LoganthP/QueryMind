import {
  ScatterChart as RScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  prepareScatterData,
  computeLinearRegression,
} from '../../../utils/chartDataProcessor';
import type { ChartProps } from './types';

export default function ScatterChart({ rows, xCol, yCol, groupCol, sizeCol, options, palette }: ChartProps) {
  if (!xCol || !yCol) return null;

  const groups = prepareScatterData(rows, xCol, yCol, groupCol, sizeCol);

  // Compute trend line from all points
  let trendSlope = 0;
  let trendIntercept = 0;
  let xMin = Infinity;
  let xMax = -Infinity;

  if (options?.trendLine) {
    const allPoints = groups.flatMap((g) => g.data.map((p) => ({ x: p.x, y: p.y })));
    const reg = computeLinearRegression(allPoints);
    trendSlope = reg.slope;
    trendIntercept = reg.intercept;
    for (const p of allPoints) {
      xMin = Math.min(xMin, p.x);
      xMax = Math.max(xMax, p.x);
    }
  }

  const trendData =
    options?.trendLine && isFinite(xMin) && isFinite(xMax)
      ? [
          { x: xMin, y: trendSlope * xMin + trendIntercept },
          { x: xMax, y: trendSlope * xMax + trendIntercept },
        ]
      : [];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RScatterChart margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
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
        {options?.showLegend !== false && groups.length > 1 && (
          <Legend wrapperStyle={{ fontSize: 12, color: 'var(--qm-text-muted)' }} />
        )}
        {groups.map((group, i) => (
          <Scatter
            key={group.name}
            name={group.name}
            data={group.data}
            fill={palette[i % palette.length]}
            fillOpacity={0.75}
          />
        ))}
        {options?.trendLine && trendData.length === 2 && (
          <Scatter
            name="Trend"
            data={trendData}
            line={{ stroke: '#ff7f7f', strokeWidth: 2, strokeDasharray: '6 3' }}
            fill="transparent"
            legendType="none"
          />
        )}
      </RScatterChart>
    </ResponsiveContainer>
  );
}
