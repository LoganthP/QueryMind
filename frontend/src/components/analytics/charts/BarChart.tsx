import {
  BarChart as RBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { prepareBarData } from '../../../utils/chartDataProcessor';
import type { ChartProps } from './types';

export default function BarChart({ rows, xCol, yCol, groupCol, options, palette }: ChartProps) {
  if (!xCol || !yCol) return null;

  const data = prepareBarData(rows, xCol, yCol, groupCol);
  const keys = groupCol
    ? [...new Set(data.flatMap((d) => Object.keys(d).filter((k) => k !== xCol)))]
    : [yCol];

  const isHorizontal = options?.horizontal;
  const isStacked = options?.stacked && !!groupCol;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RBarChart
        data={data}
        layout={isHorizontal ? 'vertical' : 'horizontal'}
        margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
      >
        {options?.showGrid !== false && (
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--qm-outline-variant)"
            vertical={!isHorizontal}
            horizontal={!!isHorizontal}
          />
        )}
        {isHorizontal ? (
          <>
            <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--qm-text-muted)' }} />
            <YAxis
              dataKey={xCol}
              type="category"
              tick={{ fontSize: 11, fill: 'var(--qm-text-muted)' }}
              width={90}
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey={xCol}
              tick={{ fontSize: 11, fill: 'var(--qm-text-muted)' }}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 11, fill: 'var(--qm-text-muted)' }} />
          </>
        )}
        <Tooltip
          contentStyle={{
            background: 'var(--qm-bg-elevated)',
            border: '1px solid var(--qm-outline-variant)',
            borderRadius: 8,
            fontSize: 12,
            color: 'var(--qm-on-surface)',
          }}
        />
        {options?.showLegend !== false && keys.length > 1 && (
          <Legend wrapperStyle={{ fontSize: 12, color: 'var(--qm-text-muted)' }} />
        )}
        {keys.map((key, i) => (
          <Bar
            key={key}
            dataKey={key}
            stackId={isStacked ? 'stack' : undefined}
            fill={palette[i % palette.length]}
            radius={isStacked ? undefined : [3, 3, 0, 0]}
            label={
              options?.showLabels
                ? { position: 'top', fontSize: 10, fill: 'var(--qm-text-muted)' }
                : undefined
            }
          >
            {!groupCol &&
              data.map((_entry, idx) => (
                <Cell key={idx} fill={palette[idx % palette.length]} />
              ))}
          </Bar>
        ))}
      </RBarChart>
    </ResponsiveContainer>
  );
}
