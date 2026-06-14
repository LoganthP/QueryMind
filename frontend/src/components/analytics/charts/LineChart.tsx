import {
  LineChart as RLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { prepareLineData } from '../../../utils/chartDataProcessor';
import type { ChartProps } from './types';

export default function LineChart({ rows, xCol, yCol, yCols, groupCol, options, palette }: ChartProps) {
  if (!xCol || (!yCol && !yCols?.length)) return null;

  const effectiveYCols = yCols?.length ? yCols : [yCol!];
  const data = prepareLineData(rows, xCol, effectiveYCols, groupCol);
  const seriesKeys = groupCol
    ? [...new Set(data.flatMap((d) => Object.keys(d).filter((k) => k !== xCol)))]
    : effectiveYCols;

  const curveType = options?.smooth ? 'monotone' : 'linear';

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RLineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        {options?.showGrid !== false && (
          <CartesianGrid strokeDasharray="3 3" stroke="var(--qm-outline-variant)" />
        )}
        <XAxis
          dataKey={xCol}
          tick={{ fontSize: 11, fill: 'var(--qm-text-muted)' }}
          interval="preserveStartEnd"
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
        />
        {options?.showLegend !== false && seriesKeys.length > 1 && (
          <Legend wrapperStyle={{ fontSize: 12, color: 'var(--qm-text-muted)' }} />
        )}
        {seriesKeys.map((key, i) => (
          <Line
            key={key}
            type={curveType}
            dataKey={key}
            stroke={palette[i % palette.length]}
            strokeWidth={2}
            dot={options?.dots ? { r: 3, fill: palette[i % palette.length] } : false}
            activeDot={{ r: 5 }}
          />
        ))}
      </RLineChart>
    </ResponsiveContainer>
  );
}
