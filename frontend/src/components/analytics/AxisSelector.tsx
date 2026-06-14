import type { ChartType, ColumnTypeMeta } from '../../utils/chartDataProcessor';

interface AxisSelectorProps {
  chartType: ChartType;
  colMeta: ColumnTypeMeta[];
  xCol: string;
  yCol: string;
  yCols: string[];
  groupCol: string;
  sizeCol: string;
  valueCol: string;
  colCol: string;
  onChange: (updates: Partial<AxisSelectorState>) => void;
}

export interface AxisSelectorState {
  xCol: string;
  yCol: string;
  yCols: string[];
  groupCol: string;
  sizeCol: string;
  valueCol: string;
  colCol: string;
}

const ALL_OPTION = '';

function Select({
  label,
  value,
  options,
  onChange,
  allowEmpty = true,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  allowEmpty?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 120 }}>
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--qm-text-muted)',
        }}
      >
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: 'var(--qm-bg-surface)',
          border: '0.5px solid var(--qm-outline-variant)',
          borderRadius: 8,
          fontSize: 13,
          height: 32,
          padding: '0 10px',
          color: 'var(--qm-on-surface)',
          cursor: 'pointer',
          outline: 'none',
          width: '100%',
        }}
      >
        {allowEmpty && <option value={ALL_OPTION}>— none —</option>}
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function AxisSelector({
  chartType,
  colMeta,
  xCol,
  yCol,
  groupCol,
  sizeCol,
  valueCol,
  colCol,
  onChange,
}: AxisSelectorProps) {
  const allCols = colMeta.map((c) => c.name);
  const numericCols = colMeta.filter((c) => c.type === 'numeric').map((c) => c.name);
  const stringDateCols = colMeta.filter((c) => c.type !== 'numeric').map((c) => c.name);
  const stringCols = colMeta.filter((c) => c.type === 'string').map((c) => c.name);

  switch (chartType) {
    case 'bar':
    case 'area':
    case 'line':
      return (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Select
            label="X Axis"
            value={xCol}
            options={chartType === 'scatter' ? numericCols : stringDateCols.length ? stringDateCols : allCols}
            onChange={(v) => onChange({ xCol: v })}
            allowEmpty={false}
          />
          <Select
            label="Y Axis"
            value={yCol}
            options={numericCols.length ? numericCols : allCols}
            onChange={(v) => onChange({ yCol: v })}
            allowEmpty={false}
          />
          <Select
            label="Group By"
            value={groupCol}
            options={stringCols}
            onChange={(v) => onChange({ groupCol: v })}
          />
        </div>
      );

    case 'pie':
      return (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Select
            label="Label Column"
            value={xCol}
            options={stringDateCols.length ? stringDateCols : allCols}
            onChange={(v) => onChange({ xCol: v })}
            allowEmpty={false}
          />
          <Select
            label="Value Column"
            value={yCol}
            options={numericCols.length ? numericCols : allCols}
            onChange={(v) => onChange({ yCol: v })}
            allowEmpty={false}
          />
        </div>
      );

    case 'scatter':
      return (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Select
            label="X Axis"
            value={xCol}
            options={numericCols.length ? numericCols : allCols}
            onChange={(v) => onChange({ xCol: v })}
            allowEmpty={false}
          />
          <Select
            label="Y Axis"
            value={yCol}
            options={numericCols.length ? numericCols : allCols}
            onChange={(v) => onChange({ yCol: v })}
            allowEmpty={false}
          />
          <Select
            label="Color (Group)"
            value={groupCol}
            options={stringCols}
            onChange={(v) => onChange({ groupCol: v })}
          />
          <Select
            label="Size"
            value={sizeCol}
            options={numericCols}
            onChange={(v) => onChange({ sizeCol: v })}
          />
        </div>
      );

    case 'histogram':
      return (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Select
            label="Numeric Column"
            value={xCol}
            options={numericCols.length ? numericCols : allCols}
            onChange={(v) => onChange({ xCol: v })}
            allowEmpty={false}
          />
        </div>
      );

    case 'heatmap':
      return (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Select
            label="Row Axis"
            value={xCol}
            options={stringCols.length ? stringCols : allCols}
            onChange={(v) => onChange({ xCol: v })}
            allowEmpty={false}
          />
          <Select
            label="Col Axis"
            value={colCol}
            options={stringCols.length ? stringCols : allCols}
            onChange={(v) => onChange({ colCol: v })}
            allowEmpty={false}
          />
          <Select
            label="Value"
            value={valueCol}
            options={numericCols}
            onChange={(v) => onChange({ valueCol: v })}
          />
        </div>
      );

    case 'cluster':
      return (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Select
            label="X Axis"
            value={xCol}
            options={numericCols.length ? numericCols : allCols}
            onChange={(v) => onChange({ xCol: v })}
            allowEmpty={false}
          />
          <Select
            label="Y Axis"
            value={yCol}
            options={numericCols.length ? numericCols : allCols}
            onChange={(v) => onChange({ yCol: v })}
            allowEmpty={false}
          />
          <Select
            label="Bubble Size"
            value={sizeCol}
            options={numericCols}
            onChange={(v) => onChange({ sizeCol: v })}
          />
          <Select
            label="Color (Category)"
            value={groupCol}
            options={stringCols}
            onChange={(v) => onChange({ groupCol: v })}
          />
        </div>
      );

    default:
      return null;
  }
}
