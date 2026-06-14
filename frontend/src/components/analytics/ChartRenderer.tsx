import { lazy, Suspense } from 'react';
import type { ChartType } from '../../utils/chartDataProcessor';
import type { ChartOptions } from './charts/types';
import type { PaletteName } from '../../utils/chartPalettes';
import { PALETTES } from '../../utils/chartPalettes';

const BarChart = lazy(() => import('./charts/BarChart'));
const LineChart = lazy(() => import('./charts/LineChart'));
const PieChart = lazy(() => import('./charts/PieChart'));
const ScatterChart = lazy(() => import('./charts/ScatterChart'));
const AreaChart = lazy(() => import('./charts/AreaChart'));
const HistogramChart = lazy(() => import('./charts/HistogramChart'));
const HeatmapChart = lazy(() => import('./charts/HeatmapChart'));
const ClusterChart = lazy(() => import('./charts/ClusterChart'));

interface ChartRendererProps {
  chartType: ChartType;
  rows: Record<string, unknown>[];
  xCol: string;
  yCol: string;
  yCols: string[];
  groupCol: string;
  sizeCol: string;
  valueCol: string;
  colCol: string;
  options: ChartOptions;
  palette: PaletteName;
}

function Spinner() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          border: '3px solid var(--qm-outline-variant)',
          borderTop: '3px solid #6B66FF',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }}
      />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function ChartRenderer({
  chartType,
  rows,
  xCol,
  yCol,
  yCols,
  groupCol,
  sizeCol,
  valueCol,
  colCol,
  options,
  palette,
}: ChartRendererProps) {
  const colors = PALETTES[palette];

  const props = {
    rows,
    xCol: xCol || undefined,
    yCol: yCol || undefined,
    yCols,
    groupCol: groupCol || undefined,
    sizeCol: sizeCol || undefined,
    valueCol: valueCol || undefined,
    colCol: colCol || undefined,
    options,
    palette: colors,
  };

  return (
    <Suspense fallback={<Spinner />}>
      {chartType === 'bar' && <BarChart {...props} />}
      {chartType === 'line' && <LineChart {...props} />}
      {chartType === 'pie' && <PieChart {...props} />}
      {chartType === 'scatter' && <ScatterChart {...props} />}
      {chartType === 'area' && <AreaChart {...props} />}
      {chartType === 'histogram' && <HistogramChart {...props} />}
      {chartType === 'heatmap' && <HeatmapChart {...props} yCol={colCol || undefined} />}
      {chartType === 'cluster' && <ClusterChart {...props} />}
    </Suspense>
  );
}
