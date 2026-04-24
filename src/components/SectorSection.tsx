import { useEffect, useRef, useState } from 'react';
import type { SummarySector } from '../types/index';
import { ChartRenderer } from './ChartRenderer';
import styles from './SectorSection.module.css';

interface SectorSectionProps {
  sector: SummarySector;
  sectorIndex: number;
}

const SECTOR_COLORS = [
  'var(--sector-color-0)', 'var(--sector-color-1)', 'var(--sector-color-2)',
  'var(--sector-color-3)', 'var(--sector-color-4)', 'var(--sector-color-5)',
  'var(--sector-color-6)', 'var(--sector-color-7)', 'var(--sector-color-8)',
  'var(--sector-color-9)',
];

const RAW_SECTOR_COLORS = [
  '#4f8cff', '#22c55e', '#f59e0b', '#ef4444', '#a855f7',
  '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
];

function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(el);
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isInView };
}

function getSeverityColor(severity: number): string {
  if (severity >= 8) return '#ef4444';
  if (severity >= 6) return '#f59e0b';
  if (severity >= 4) return '#4f8cff';
  return '#22c55e';
}

export function SectorSection({ sector, sectorIndex }: SectorSectionProps) {
  const { ref: sectionRef, isInView: sectionVisible } = useInView(0.1);
  const { ref: chartRef, isInView: chartVisible } = useInView(0.1);
  const sectorColor = SECTOR_COLORS[sectorIndex % SECTOR_COLORS.length];
  const rawColor = RAW_SECTOR_COLORS[sectorIndex % RAW_SECTOR_COLORS.length];

  return (
    <section
      ref={sectionRef}
      className={`${styles.section} ${sectionVisible ? styles.visible : ''}`}
      aria-label={`${sector.name} sector summary`}
    >
      <h3 className={styles.heading}>
        <span className={styles.sectorIcon}>{sector.icon}</span>
        <span style={{ color: sectorColor }}>{sector.name}</span>
      </h3>

      <p className={styles.blurb}>{sector.summary_blurb}</p>

      <div ref={chartRef} className={styles.chartsGrid}>
        {sector.charts.map((chart, i) => (
          <ChartRenderer
            key={`${chart.title}-${i}`}
            chart={chart}
            sectorColor={rawColor}
            animate={chartVisible}
          />
        ))}
      </div>

      {sector.worldwide_implications && (
        <div className={styles.implications}>
          <p className={styles.implicationsLabel}>🌐 Worldwide Implications</p>
          <p className={styles.implicationsText}>{sector.worldwide_implications}</p>
        </div>
      )}

      {sector.impacts_summary.length > 0 && (
        <ul className={styles.impactsList}>
          {sector.impacts_summary.map((impact) => (
            <li key={impact.title} className={styles.impactItem}>
              <span
                className={styles.severityBadge}
                style={{ backgroundColor: getSeverityColor(impact.severity) }}
              >
                {impact.severity}
              </span>
              <div>
                <p className={styles.impactTitle}>{impact.title}</p>
                <p className={styles.impactDesc}>{impact.description}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
