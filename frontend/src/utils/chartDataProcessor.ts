// ─── Types ───────────────────────────────────────────────────────────────────

export type ColType = 'numeric' | 'string' | 'date';

export interface ColumnTypeMeta {
  name: string;
  type: ColType;
}

export interface RechartsBarDataPoint {
  [key: string]: string | number;
}

export interface RechartsLineDataPoint {
  [key: string]: string | number;
}

export interface RechartsPieDataPoint {
  name: string;
  value: number;
  percent?: number;
}

export interface RechartsScatterPoint {
  x: number;
  y: number;
  size?: number;
  label?: string;
}

export interface ScatterGroup {
  name: string;
  data: RechartsScatterPoint[];
}

export interface HeatmapMatrix {
  rows: string[];
  cols: string[];
  matrix: number[][];
  min: number;
  max: number;
}

export interface HistogramBin {
  x0: number;
  x1: number;
  count: number;
  label: string;
}

export interface LinearRegression {
  slope: number;
  intercept: number;
}

// ─── Column Type Detection ────────────────────────────────────────────────────

/**
 * Tests whether a string value is numeric (integer or float).
 */
function isNumericValue(val: unknown): boolean {
  if (val === null || val === undefined || val === '') return false;
  const n = Number(val);
  return !isNaN(n) && String(val).trim() !== '';
}

/**
 * Tests whether a value looks like a date.
 */
function isDateValue(val: unknown): boolean {
  if (val === null || val === undefined || val === '') return false;
  const s = String(val).trim();
  if (s.length < 4) return false;
  // Check common date patterns
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}/,
    /^\d{2}\/\d{2}\/\d{4}/,
    /^\d{4}\/\d{2}\/\d{2}/,
    /^\w+ \d{1,2}, \d{4}/,
  ];
  if (!datePatterns.some((p) => p.test(s))) return false;
  return !isNaN(Date.parse(s));
}

export function detectColumnTypes(rows: Record<string, unknown>[]): ColumnTypeMeta[] {
  if (!rows.length) return [];
  const columns = Object.keys(rows[0]);
  const sampleSize = Math.min(rows.length, 50);

  return columns.map((name) => {
    const sample = rows.slice(0, sampleSize).map((r) => r[name]);
    const nonNull = sample.filter((v) => v !== null && v !== undefined && v !== '');
    if (!nonNull.length) return { name, type: 'string' as ColType };

    const numericCount = nonNull.filter(isNumericValue).length;
    const dateCount = nonNull.filter(isDateValue).length;

    const threshold = Math.ceil(nonNull.length * 0.7);
    if (numericCount >= threshold) return { name, type: 'numeric' as ColType };
    if (dateCount >= threshold) return { name, type: 'date' as ColType };
    return { name, type: 'string' as ColType };
  });
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────

export function prepareBarData(
  rows: Record<string, unknown>[],
  xCol: string,
  yCol: string,
  groupCol?: string,
): RechartsBarDataPoint[] {
  const aggregated: Record<string, Record<string, number>> = {};
  const groups = new Set<string>();

  for (const row of rows) {
    const xVal = String(row[xCol] ?? '(null)');
    const yVal = Number(row[yCol]) || 0;
    const gVal = groupCol ? String(row[groupCol] ?? 'Other') : '__default__';

    if (!aggregated[xVal]) aggregated[xVal] = {};
    aggregated[xVal][gVal] = (aggregated[xVal][gVal] || 0) + yVal;
    groups.add(gVal);
  }

  return Object.entries(aggregated).map(([xVal, groupVals]) => {
    const point: RechartsBarDataPoint = { [xCol]: xVal };
    for (const g of groups) {
      point[g] = groupVals[g] || 0;
    }
    return point;
  });
}

// ─── Line Chart ──────────────────────────────────────────────────────────────

export function prepareLineData(
  rows: Record<string, unknown>[],
  xCol: string,
  yCols: string[],
  groupCol?: string,
): RechartsLineDataPoint[] {
  if (groupCol) {
    // Multi-series from group column
    const groups = [...new Set(rows.map((r) => String(r[groupCol] ?? 'Other')))];
    const xVals = [...new Set(rows.map((r) => String(r[xCol] ?? '')))].sort();

    return xVals.map((xVal) => {
      const point: RechartsLineDataPoint = { [xCol]: xVal };
      for (const g of groups) {
        const match = rows.find(
          (r) => String(r[xCol]) === xVal && String(r[groupCol]) === g,
        );
        point[g] = match ? Number(match[yCols[0]]) || 0 : 0;
      }
      return point;
    });
  }

  // Multi-Y series
  const grouped: Record<string, RechartsLineDataPoint> = {};
  for (const row of rows) {
    const xVal = String(row[xCol] ?? '');
    if (!grouped[xVal]) grouped[xVal] = { [xCol]: xVal };
    for (const y of yCols) {
      grouped[xVal][y] = Number(row[y]) || 0;
    }
  }

  return Object.values(grouped).sort((a, b) => {
    const aX = String(a[xCol]);
    const bX = String(b[xCol]);
    // Try date sort
    const aDate = Date.parse(aX);
    const bDate = Date.parse(bX);
    if (!isNaN(aDate) && !isNaN(bDate)) return aDate - bDate;
    return aX.localeCompare(bX);
  });
}

// ─── Pie Chart ───────────────────────────────────────────────────────────────

export function preparePieData(
  rows: Record<string, unknown>[],
  labelCol: string,
  valueCol: string,
  topN = 8,
): RechartsPieDataPoint[] {
  const aggregated: Record<string, number> = {};
  for (const row of rows) {
    const label = String(row[labelCol] ?? '(null)');
    const val = Number(row[valueCol]) || 0;
    aggregated[label] = (aggregated[label] || 0) + val;
  }

  const sorted = Object.entries(aggregated).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, topN);
  const rest = sorted.slice(topN);

  const result: RechartsPieDataPoint[] = top.map(([name, value]) => ({ name, value }));

  if (rest.length > 0) {
    const othersTotal = rest.reduce((sum, [, v]) => sum + v, 0);
    result.push({ name: 'Others', value: othersTotal });
  }

  const total = result.reduce((sum, d) => sum + d.value, 0);
  return result.map((d) => ({ ...d, percent: total > 0 ? d.value / total : 0 }));
}

// ─── Scatter Chart ────────────────────────────────────────────────────────────

export function prepareScatterData(
  rows: Record<string, unknown>[],
  xCol: string,
  yCol: string,
  groupCol?: string,
  sizeCol?: string,
): ScatterGroup[] {
  let sizeMin = Infinity;
  let sizeMax = -Infinity;

  if (sizeCol) {
    for (const row of rows) {
      const s = Number(row[sizeCol]);
      if (!isNaN(s)) {
        sizeMin = Math.min(sizeMin, s);
        sizeMax = Math.max(sizeMax, s);
      }
    }
  }

  const normalizeSize = (val: number): number => {
    if (!sizeCol || sizeMax === sizeMin) return 8;
    return 4 + ((val - sizeMin) / (sizeMax - sizeMin)) * 20;
  };

  if (groupCol) {
    const groups: Record<string, RechartsScatterPoint[]> = {};
    for (const row of rows) {
      const x = Number(row[xCol]);
      const y = Number(row[yCol]);
      if (isNaN(x) || isNaN(y)) continue;
      const g = String(row[groupCol] ?? 'Other');
      if (!groups[g]) groups[g] = [];
      groups[g].push({
        x,
        y,
        size: sizeCol ? normalizeSize(Number(row[sizeCol]) || 0) : 8,
      });
    }
    return Object.entries(groups).map(([name, data]) => ({ name, data }));
  }

  const data: RechartsScatterPoint[] = rows
    .map((row) => {
      const x = Number(row[xCol]);
      const y = Number(row[yCol]);
      if (isNaN(x) || isNaN(y)) return null;
      return {
        x,
        y,
        size: sizeCol ? normalizeSize(Number(row[sizeCol]) || 0) : 8,
      };
    })
    .filter(Boolean) as RechartsScatterPoint[];

  return [{ name: 'Data', data }];
}

// ─── Heatmap ──────────────────────────────────────────────────────────────────

export type AggFn = 'count' | 'sum' | 'avg';

export function prepareHeatmapData(
  rows: Record<string, unknown>[],
  rowCol: string,
  colCol: string,
  valueCol: string | null,
  aggFn: AggFn = 'count',
): HeatmapMatrix {
  const rowSet = new Set<string>();
  const colSet = new Set<string>();

  type CellAccum = { sum: number; count: number };
  const cells: Record<string, Record<string, CellAccum>> = {};

  for (const row of rows) {
    const r = String(row[rowCol] ?? '(null)');
    const c = String(row[colCol] ?? '(null)');
    rowSet.add(r);
    colSet.add(c);
    if (!cells[r]) cells[r] = {};
    if (!cells[r][c]) cells[r][c] = { sum: 0, count: 0 };
    const val = valueCol ? Number(row[valueCol]) || 0 : 1;
    cells[r][c].sum += val;
    cells[r][c].count += 1;
  }

  const rowLabels = [...rowSet].slice(0, 20);
  const colLabels = [...colSet].slice(0, 20);

  const getValue = (accum: CellAccum | undefined): number => {
    if (!accum) return 0;
    if (aggFn === 'count') return accum.count;
    if (aggFn === 'avg') return accum.count ? accum.sum / accum.count : 0;
    return accum.sum;
  };

  let min = Infinity;
  let max = -Infinity;
  const matrix: number[][] = rowLabels.map((r) =>
    colLabels.map((c) => {
      const v = getValue(cells[r]?.[c]);
      min = Math.min(min, v);
      max = Math.max(max, v);
      return v;
    }),
  );

  return { rows: rowLabels, cols: colLabels, matrix, min, max };
}

// ─── Histogram ───────────────────────────────────────────────────────────────

export function computeHistogramBins(
  rows: Record<string, unknown>[],
  col: string,
  binCount?: number,
): HistogramBin[] {
  const values = rows
    .map((r) => Number(r[col]))
    .filter((v) => !isNaN(v));

  if (!values.length) return [];

  const n = values.length;
  const bins = binCount ?? Math.ceil(Math.log2(n) + 1);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const binWidth = (max - min) / bins || 1;

  const counts = Array.from({ length: bins }, () => 0);
  for (const v of values) {
    const idx = Math.min(Math.floor((v - min) / binWidth), bins - 1);
    counts[idx]++;
  }

  return counts.map((count, i) => {
    const x0 = min + i * binWidth;
    const x1 = x0 + binWidth;
    return {
      x0,
      x1,
      count,
      label: `${x0.toFixed(1)}–${x1.toFixed(1)}`,
    };
  });
}

export function computeHistogramStats(
  rows: Record<string, unknown>[],
  col: string,
): { mean: number; median: number } {
  const values = rows
    .map((r) => Number(r[col]))
    .filter((v) => !isNaN(v))
    .sort((a, b) => a - b);

  if (!values.length) return { mean: 0, median: 0 };

  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const mid = Math.floor(values.length / 2);
  const median =
    values.length % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid];

  return { mean, median };
}

// ─── Linear Regression ───────────────────────────────────────────────────────

export function computeLinearRegression(points: { x: number; y: number }[]): LinearRegression {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: 0 };

  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX) || 0;
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

// ─── Smart Auto-Suggest ───────────────────────────────────────────────────────

export type ChartType =
  | 'bar'
  | 'line'
  | 'pie'
  | 'scatter'
  | 'area'
  | 'histogram'
  | 'heatmap'
  | 'cluster';

export function autoSuggestChart(
  rows: Record<string, unknown>[],
  colMeta: ColumnTypeMeta[],
): ChartType {
  const strings = colMeta.filter((c) => c.type === 'string');
  const dates = colMeta.filter((c) => c.type === 'date');
  const numerics = colMeta.filter((c) => c.type === 'numeric');

  if (strings.length >= 1 && numerics.length >= 1 && dates.length === 0) {
    if (colMeta.length === 2 && rows.length <= 12) return 'pie';
    return 'bar';
  }
  if (dates.length >= 1 && numerics.length >= 1) return 'line';
  if (numerics.length >= 2) return 'scatter';
  if (numerics.length === 1) return 'histogram';
  return 'bar';
}

export function autoSuggestMessage(chartType: ChartType): string {
  const labels: Record<ChartType, string> = {
    bar: 'Bar chart',
    line: 'Line chart',
    pie: 'Pie chart',
    scatter: 'Scatter plot',
    area: 'Area chart',
    histogram: 'Histogram',
    heatmap: 'Heatmap',
    cluster: 'Cluster chart',
  };
  return `Auto-selected ${labels[chartType]} based on your data shape. Change it above.`;
}

// ─── Area Chart ──────────────────────────────────────────────────────────────
// Reuses prepareLineData structure

export const prepareAreaData = prepareLineData;
