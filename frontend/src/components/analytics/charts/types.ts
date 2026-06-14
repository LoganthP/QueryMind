export interface ChartOptions {
  horizontal?: boolean;
  stacked?: boolean;
  smooth?: boolean;
  dots?: boolean;
  donut?: boolean;
  trendLine?: boolean;
  fillOpacity?: number;
  binCount?: number;
  heatmapAgg?: 'count' | 'sum' | 'avg';
  showGrid?: boolean;
  showLegend?: boolean;
  showLabels?: boolean;
}

export interface ChartProps {
  rows: Record<string, unknown>[];
  xCol?: string;
  yCol?: string;
  yCols?: string[];
  groupCol?: string;
  sizeCol?: string;
  valueCol?: string;
  colCol?: string;
  options: ChartOptions;
  palette: string[];
}
