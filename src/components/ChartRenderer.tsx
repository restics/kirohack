import { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Pie, Doughnut, Line } from 'react-chartjs-2';
import type { ChartData } from '../types/index';
import styles from './ChartRenderer.module.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Filler, Tooltip, Legend);

interface ChartRendererProps {
  chart: ChartData;
  sectorColor: string;
  animate: boolean;
}

function generateColors(base: string, count: number): string[] {
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    const hueShift = (i * 40) % 360;
    colors.push(`hsl(from ${base} calc(h + ${hueShift}) s l)`);
  }
  // Fallback: use a simple palette if CSS relative colors aren't supported
  const fallback = [
    base,
    '#22c55e', '#f59e0b', '#ef4444', '#a855f7',
    '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
  ];
  return count <= fallback.length ? fallback.slice(0, count) : colors;
}

const gridColor = 'rgba(136, 136, 160, 0.15)';
const textColor = '#e8e8f0';

function buildChartJsData(chart: ChartData, sectorColor: string) {
  const isPieType = chart.chart_type === 'pie' || chart.chart_type === 'donut';
  const colors = generateColors(sectorColor, chart.labels.length);

  return {
    labels: chart.labels,
    datasets: chart.datasets.map((ds, idx) => {
      if (isPieType) {
        return {
          label: ds.label,
          data: ds.values,
          backgroundColor: colors.map(c => c + (c.startsWith('#') ? 'cc' : '')),
          borderColor: colors,
          borderWidth: 1,
        };
      }
      const isArea = chart.chart_type === 'area';
      const color = colors[idx % colors.length];
      return {
        label: ds.label,
        data: ds.values,
        backgroundColor: isArea ? color + '40' : color + 'cc',
        borderColor: color,
        borderWidth: 2,
        fill: isArea,
        tension: chart.chart_type === 'line' || isArea ? 0.3 : 0,
        pointRadius: chart.chart_type === 'line' || isArea ? 4 : 0,
        pointHoverRadius: chart.chart_type === 'line' || isArea ? 6 : 0,
      };
    }),
  };
}

import type { ChartOptions } from 'chart.js';

function getCommonOptions(animate: boolean): ChartOptions<'bar'> & ChartOptions<'line'> {
  return {
    responsive: true,
    maintainAspectRatio: true,
    animation: animate ? { duration: 800 } : false,
    plugins: {
      legend: {
        labels: { color: textColor, font: { size: 12 } },
      },
      tooltip: {
        enabled: true,
      },
    },
    scales: {
      x: {
        ticks: { color: textColor, font: { size: 11 } },
        grid: { color: gridColor },
      },
      y: {
        ticks: { color: textColor, font: { size: 11 } },
        grid: { color: gridColor },
      },
    },
  } as ChartOptions<'bar'> & ChartOptions<'line'>;
}

function getPieOptions(animate: boolean): ChartOptions<'pie'> & ChartOptions<'doughnut'> {
  return {
    responsive: true,
    maintainAspectRatio: true,
    animation: animate ? { duration: 800 } : false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: textColor, font: { size: 12 }, padding: 16 },
      },
      tooltip: {
        enabled: true,
      },
    },
  } as ChartOptions<'pie'> & ChartOptions<'doughnut'>;
}

export function ChartRenderer({ chart, sectorColor, animate }: ChartRendererProps) {
  const [showTable, setShowTable] = useState(false);
  const data = buildChartJsData(chart, sectorColor);

  const renderChart = () => {
    const commonOpts = getCommonOptions(animate);
    const pieOpts = getPieOptions(animate);

    switch (chart.chart_type) {
      case 'pie':
        return <Pie data={data} options={pieOpts as any} />;
      case 'donut':
        return <Doughnut data={data} options={{ ...pieOpts, cutout: '50%' } as any} />;
      case 'line':
        return <Line data={data} options={commonOpts as any} />;
      case 'area':
        return <Line data={data} options={commonOpts as any} />;
      case 'bar':
      default:
        return <Bar data={data} options={commonOpts as any} />;
    }
  };

  return (
    <div className={styles.container}>
      <p className={styles.chartTitle}>{chart.title}</p>
      <div
        className={styles.chartWrapper}
        role="img"
        aria-label={`Chart: ${chart.title}`}
      >
        {renderChart()}
      </div>
      <button
        className={styles.toggleButton}
        onClick={() => setShowTable(prev => !prev)}
        aria-label={showTable ? 'Hide data table' : 'Show data table'}
        aria-expanded={showTable}
      >
        {showTable ? '📊 Hide Data Table' : '📋 Show Data Table'}
      </button>
      {showTable && (
        <table className={styles.dataTable} aria-label={`Data table for ${chart.title}`}>
          <thead>
            <tr>
              <th>Label</th>
              {chart.datasets.map(ds => (
                <th key={ds.label}>{ds.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chart.labels.map((label, i) => (
              <tr key={label}>
                <td>{label}</td>
                {chart.datasets.map(ds => (
                  <td key={ds.label}>{ds.values[i]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
