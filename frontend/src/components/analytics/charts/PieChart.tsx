import {
  PieChart as RPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { preparePieData } from '../../../utils/chartDataProcessor';
import type { ChartProps } from './types';

const RADIAN = Math.PI / 180;

const renderCustomLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}) => {
  if (percent < 0.04) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function PieChart({ rows, xCol, yCol, options, palette }: ChartProps) {
  if (!xCol || !yCol) return null;

  const data = preparePieData(rows, xCol, yCol, 8);
  const innerRadius = options?.donut ? 70 : 0;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RPieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={130}
          innerRadius={innerRadius}
          labelLine={false}
          label={renderCustomLabel}
        >
          {data.map((_entry, index) => (
            <Cell key={index} fill={palette[index % palette.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: 'var(--qm-bg-elevated)',
            border: '1px solid var(--qm-outline-variant)',
            borderRadius: 8,
            fontSize: 12,
            color: 'var(--qm-on-surface)',
          }}
          formatter={(value: number, name: string, props) => [
            `${value.toLocaleString()} (${((props.payload.percent ?? 0) * 100).toFixed(1)}%)`,
            name,
          ]}
        />
        {options?.showLegend !== false && (
          <Legend
            wrapperStyle={{ fontSize: 12, color: 'var(--qm-text-muted)' }}
            formatter={(value) => value}
          />
        )}
      </RPieChart>
    </ResponsiveContainer>
  );
}
