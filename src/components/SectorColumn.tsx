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

// Simple sector icon component
function SectorIcon() {
  // Return a generic chart icon for all sectors
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={styles.icon}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
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
      style={{ borderTopColor: sectorColor, borderTopWidth: '3px' } as React.CSSProperties}
      aria-label={`Sector: ${sector.name}`}
    >
      <div className={styles.header}>
        <div className={styles.iconWrapper} style={{ background: `color-mix(in srgb, ${sectorColor} 15%, transparent)` }}>
          <SectorIcon />
        </div>
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
