import type { HiddenFactorSummary } from '../types/index';
import styles from './HiddenFactorsCallout.module.css';

interface HiddenFactorsCalloutProps {
  factors: HiddenFactorSummary[];
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'Environmental Debt': { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e' },
  'Social Capital': { bg: 'rgba(168, 85, 247, 0.15)', text: '#a855f7' },
  'Supply Chain Ripple': { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b' },
  'Regulatory Risk': { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444' },
  'Labor Market Shift': { bg: 'rgba(79, 140, 255, 0.15)', text: '#4f8cff' },
};

function getCategoryStyle(category: string) {
  return CATEGORY_COLORS[category] || { bg: 'rgba(136, 136, 160, 0.15)', text: '#8888a0' };
}

export function HiddenFactorsCallout({ factors }: HiddenFactorsCalloutProps) {
  if (factors.length === 0) return null;

  return (
    <section className={styles.container} aria-label="Hidden economic factors">
      <h3 className={styles.heading}>
        <span>🔍</span>
        Hidden Economic Factors
      </h3>
      <p className={styles.subtitle}>
        Economic impacts not explicitly covered by mainstream news — surfaced through cascading analysis.
      </p>

      <div className={styles.factorsList}>
        {factors.map((factor) => {
          const catStyle = getCategoryStyle(factor.category);
          return (
            <div key={factor.factor} className={styles.factorCard}>
              <div className={styles.factorHeader}>
                <span className={styles.factorName}>{factor.factor}</span>
                <span
                  className={styles.categoryBadge}
                  style={{ backgroundColor: catStyle.bg, color: catStyle.text }}
                >
                  {factor.category}
                </span>
              </div>
              <p className={styles.factorExplanation}>{factor.explanation}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
