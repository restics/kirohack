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
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
];

// SVG icon for sector headers
function SectorIcon({ color }: { color: string }) {
  return (
    <svg 
      className={styles.sectorIcon} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke={color} 
      strokeWidth="2"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
    </svg>
  );
}

// SVG icon for worldwide implications
function GlobeIcon() {
  return (
    <svg 
      className={styles.globeIcon} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.5"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  );
}

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
        <SectorIcon color={rawColor} />
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
          <p className={styles.implicationsLabel}>
            <GlobeIcon />
            Worldwide Implications
          </p>
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
