import type { HiddenFactorSummary, SourceArticle } from '../types/index';
import { CitedText } from './CitedText';
import styles from './HiddenFactorsCallout.module.css';

interface HiddenFactorsCalloutProps {
  factors: HiddenFactorSummary[];
  sources?: SourceArticle[];
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'Environmental Debt': { bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981' },
  'Social Capital': { bg: 'rgba(139, 92, 246, 0.1)', text: '#8b5cf6' },
  'Supply Chain Ripple': { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b' },
  'Regulatory Risk': { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444' },
  'Labor Market Shift': { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6' },
};

function getCategoryStyle(category: string) {
  return CATEGORY_COLORS[category] || { bg: 'rgba(113, 113, 122, 0.1)', text: '#71717a' };
}

export function HiddenFactorsCallout({ factors, sources = [] }: HiddenFactorsCalloutProps) {
  if (factors.length === 0) return null;

  return (
    <section className={styles.container} aria-label="Hidden economic factors">
      <div className={styles.headerRow}>
        <div className={styles.iconWrapper}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={styles.icon}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>
        <div>
          <h3 className={styles.heading}>Hidden Factors</h3>
          <p className={styles.subtitle}>
            Economic impacts not covered by mainstream reporting
          </p>
        </div>
      </div>

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
              <p className={styles.factorExplanation}>
                <CitedText text={factor.explanation} sources={sources} />
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
