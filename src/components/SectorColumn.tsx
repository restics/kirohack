import { useState, useCallback, useMemo } from 'react';
import type { Sector, Impact } from '../types/index';
import { ImpactCard } from './ImpactCard';
import styles from './SectorColumn.module.css';

export interface SectorColumnProps {
  sector: Sector;
  sectorIndex: number;
}

const MAX_VISIBLE = 5;

function sortBySeverity(impacts: Impact[]): Impact[] {
  return [...impacts].sort((a, b) => b.severity - a.severity);
}

export function SectorColumn({ sector, sectorIndex }: SectorColumnProps) {
  const [showAll, setShowAll] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [cascadeStates, setCascadeStates] = useState<Record<string, boolean>>({});

  const sortedImpacts = useMemo(() => sortBySeverity(sector.impacts), [sector.impacts]);

  const visibleImpacts = showAll ? sortedImpacts : sortedImpacts.slice(0, MAX_VISIBLE);
  const hasMore = sortedImpacts.length > MAX_VISIBLE;
  const hiddenCount = sortedImpacts.length - MAX_VISIBLE;

  const handleToggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleCascadeToggle = useCallback((impactId: string, show: boolean) => {
    setCascadeStates((prev) => ({
      ...prev,
      [impactId]: show,
    }));
  }, []);

  const sectorColor = `var(--sector-color-${sectorIndex % 10})`;

  return (
    <section
      className={styles.column}
      style={{ borderTop: `3px solid ${sectorColor}` } as React.CSSProperties}
      aria-label={`Sector: ${sector.name}`}
    >
      <div className={styles.header}>
        <span className={styles.icon} role="img" aria-hidden="true">
          {sector.icon}
        </span>
        <h3 className={styles.sectorName}>{sector.name}</h3>
      </div>

      <div className={styles.impactList} role="list" aria-label={`Impacts in ${sector.name}`}>
        {visibleImpacts.map((impact) => (
          <div role="listitem" key={impact.id}>
            <ImpactCard
              impact={impact}
              depth={0}
              expandedIds={expandedIds}
              onToggle={handleToggle}
              showCascade={cascadeStates[impact.id] ?? false}
              onToggleCascade={(show) => handleCascadeToggle(impact.id, show)}
            />
          </div>
        ))}
      </div>

      {hasMore && !showAll && (
        <button
          className={styles.showMoreButton}
          onClick={() => setShowAll(true)}
          aria-label={`Show ${hiddenCount} more impacts in ${sector.name}`}
        >
          Show {hiddenCount} more
        </button>
      )}

      {showAll && hasMore && (
        <button
          className={styles.showMoreButton}
          onClick={() => setShowAll(false)}
          aria-label={`Show fewer impacts in ${sector.name}`}
        >
          Show less
        </button>
      )}
    </section>
  );
}
