import type { ChartType } from '../../utils/chartDataProcessor';

interface ChartTypeSelectorProps {
  selected: ChartType;
  onChange: (type: ChartType) => void;
}

interface ChartTypeCard {
  type: ChartType;
  label: string;
  icon: React.ReactNode;
}

const CHART_TYPES: ChartTypeCard[] = [
  {
    type: 'bar',
    label: 'Bar',
    icon: (
      <svg viewBox="0 0 28 24" width="28" height="24" fill="currentColor">
        <rect x="2" y="10" width="5" height="12" rx="1" opacity="0.9" />
        <rect x="9" y="4" width="5" height="18" rx="1" opacity="0.9" />
        <rect x="16" y="14" width="5" height="8" rx="1" opacity="0.9" />
        <rect x="23" y="7" width="5" height="15" rx="1" opacity="0.9" />
      </svg>
    ),
  },
  {
    type: 'line',
    label: 'Line',
    icon: (
      <svg viewBox="0 0 28 24" width="28" height="24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="2,20 8,10 14,14 20,6 26,12" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="2" cy="20" r="2" fill="currentColor" stroke="none" />
        <circle cx="8" cy="10" r="2" fill="currentColor" stroke="none" />
        <circle cx="14" cy="14" r="2" fill="currentColor" stroke="none" />
        <circle cx="20" cy="6" r="2" fill="currentColor" stroke="none" />
        <circle cx="26" cy="12" r="2" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    type: 'pie',
    label: 'Pie',
    icon: (
      <svg viewBox="0 0 28 28" width="28" height="28">
        <circle cx="14" cy="14" r="11" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3" />
        <path d="M14 14 L14 3 A11 11 0 0 1 25 14 Z" fill="currentColor" opacity="0.9" />
        <path d="M14 14 L25 14 A11 11 0 0 1 7 23 Z" fill="currentColor" opacity="0.6" />
        <path d="M14 14 L7 23 A11 11 0 0 1 14 3 Z" fill="currentColor" opacity="0.4" />
      </svg>
    ),
  },
  {
    type: 'scatter',
    label: 'Scatter',
    icon: (
      <svg viewBox="0 0 28 28" width="28" height="28" fill="currentColor">
        <circle cx="7" cy="20" r="2.5" opacity="0.9" />
        <circle cx="12" cy="10" r="2.5" opacity="0.9" />
        <circle cx="18" cy="16" r="2.5" opacity="0.9" />
        <circle cx="22" cy="7" r="2.5" opacity="0.9" />
        <circle cx="5" cy="14" r="2.5" opacity="0.6" />
        <circle cx="24" cy="18" r="2.5" opacity="0.6" />
        <circle cx="15" cy="22" r="2.5" opacity="0.6" />
      </svg>
    ),
  },
  {
    type: 'area',
    label: 'Area',
    icon: (
      <svg viewBox="0 0 28 24" width="28" height="24">
        <path
          d="M2 22 L2 14 L8 8 L14 12 L20 4 L26 10 L26 22 Z"
          fill="currentColor"
          opacity="0.5"
        />
        <polyline
          points="2,14 8,8 14,12 20,4 26,10"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    type: 'histogram',
    label: 'Histogram',
    icon: (
      <svg viewBox="0 0 28 24" width="28" height="24" fill="currentColor">
        <rect x="2" y="16" width="4" height="6" rx="1" opacity="0.7" />
        <rect x="7" y="10" width="4" height="12" rx="1" opacity="0.9" />
        <rect x="12" y="5" width="4" height="17" rx="1" opacity="0.9" />
        <rect x="17" y="8" width="4" height="14" rx="1" opacity="0.9" />
        <rect x="22" y="13" width="4" height="9" rx="1" opacity="0.7" />
      </svg>
    ),
  },
  {
    type: 'heatmap',
    label: 'Heatmap',
    icon: (
      <svg viewBox="0 0 28 28" width="28" height="28" fill="currentColor">
        {[0, 1, 2, 3].map((row) =>
          [0, 1, 2, 3].map((col) => {
            const opacity = 0.2 + (((row + col) % 4) / 4) * 0.8;
            return (
              <rect
                key={`${row}-${col}`}
                x={2 + col * 7}
                y={2 + row * 7}
                width="6"
                height="6"
                rx="1"
                opacity={opacity}
              />
            );
          }),
        )}
      </svg>
    ),
  },
  {
    type: 'cluster',
    label: 'Cluster',
    icon: (
      <svg viewBox="0 0 28 28" width="28" height="28" fill="currentColor">
        <circle cx="8" cy="18" r="5" opacity="0.9" />
        <circle cx="10" cy="20" r="3" opacity="0.7" fill="white" />
        <circle cx="19" cy="9" r="5" opacity="0.7" />
        <circle cx="21" cy="11" r="2.5" opacity="0.5" fill="white" />
        <circle cx="22" cy="20" r="3" opacity="0.6" />
        <circle cx="7" cy="8" r="2" opacity="0.5" />
      </svg>
    ),
  },
];

export default function ChartTypeSelector({ selected, onChange }: ChartTypeSelectorProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        paddingBottom: 4,
        scrollbarWidth: 'none',
      }}
    >
      {CHART_TYPES.map(({ type, label, icon }) => {
        const isSelected = selected === type;
        return (
          <button
            key={type}
            onClick={() => onChange(type)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              minWidth: 80,
              width: 80,
              height: 72,
              borderRadius: 10,
              border: isSelected
                ? '1.5px solid #6B66FF'
                : '0.5px solid var(--qm-outline-variant)',
              background: isSelected ? 'rgba(107,102,255,0.08)' : 'transparent',
              color: isSelected ? '#6B66FF' : 'var(--qm-text-muted)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              flexShrink: 0,
              padding: 0,
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                (e.currentTarget as HTMLButtonElement).style.background =
                  'var(--qm-bg-elevated)';
                (e.currentTarget as HTMLButtonElement).style.color =
                  'var(--qm-on-surface)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                (e.currentTarget as HTMLButtonElement).style.color =
                  'var(--qm-text-muted)';
              }
            }}
            title={label}
          >
            {icon}
            <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.01em' }}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
