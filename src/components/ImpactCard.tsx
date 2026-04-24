import React, { useCallback } from 'react';
import type { Impact } from '../types/index';
import styles from './ImpactCard.module.css';

export interface ImpactCardProps {
  impact: Impact;
  depth: number;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
}

function sortBySeverity(impacts: Impact[]): Impact[] {
  return [...impacts].sort((a, b) => b.severity - a.severity);
}

export function ImpactCard({ impact, depth, expandedIds, onToggle }: ImpactCardProps) {
  const isExpanded = expandedIds.has(impact.id);

  const handleToggle = useCallback(() => {
    onToggle(impact.id);
  }, [impact.id, onToggle]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onToggle(impact.id);
      } else if (e.key === 'Escape' && isExpanded) {
        e.preventDefault();
        onToggle(impact.id);
      }
    },
    [impact.id, isExpanded, onToggle]
  );

  const borderClass = impact.type === 'direct' ? styles.direct : styles.indirect;
  const badgeClass = impact.type === 'direct' ? styles.typeBadgeDirect : styles.typeBadgeIndirect;
  const sortedChildren = sortBySeverity(impact.children);

  return (
    <div>
      <div
        className={`${styles.card} ${borderClass}`}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-label={`Impact: ${impact.title}. Severity ${impact.severity} out of 10. ${impact.type} impact.${impact.is_hidden_factor ? ' Hidden factor.' : ''} Press Enter to ${isExpanded ? 'collapse' : 'expand'} details.`}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
      >
        <div className={styles.header}>
          <span className={styles.title}>{impact.title}</span>
          <div className={styles.badges}>
            <span className={`${styles.typeBadge} ${badgeClass}`}>
              {impact.type === 'direct' ? 'Direct' : 'Indirect'}
            </span>
            {impact.is_hidden_factor && (
              <span className={styles.hiddenBadge} aria-label={`Hidden factor: ${impact.hidden_factor_category ?? 'Unknown'}`}>
                🔍 {impact.hidden_factor_category}
              </span>
            )}
          </div>
        </div>
        <p className={styles.description}>{impact.description}</p>

        {isExpanded && (
          <div className={styles.detail}>
            {impact.causal_chain.length > 0 && (
              <div className={styles.detailSection}>
                <span className={styles.detailLabel}>Causal Chain</span>
                <ol className={styles.causalChain}>
                  {impact.causal_chain.map((step, i) => (
                    <li key={i} className={styles.causalStep}>
                      <span className={styles.stepNumber}>{i + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div className={styles.detailSection}>
              <span className={styles.detailLabel}>Confidence</span>
              <span className={styles.confidence}>
                {Math.round(impact.confidence * 100)}%
              </span>
            </div>

            {impact.originating_facts.length > 0 && (
              <div className={styles.detailSection}>
                <span className={styles.detailLabel}>Originating Facts</span>
                <ul className={styles.factsList}>
                  {impact.originating_facts.map((fact, i) => (
                    <li key={i} className={styles.factChip}>{fact}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {sortedChildren.length > 0 && (
        <div className={styles.children} role="group" aria-label={`Child impacts of ${impact.title}`}>
          {sortedChildren.map((child) => (
            <ImpactCard
              key={child.id}
              impact={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}
