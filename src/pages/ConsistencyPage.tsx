import { useState, useCallback } from "react";
import { useWizard } from "../context/WizardContext";
import type { FactItem } from "../types/index";
import styles from "./ConsistencyPage.module.css";

function getStatusIcon(status: FactItem["status"]) {
  switch (status) {
    case "consistent":
      return { symbol: "✓", className: styles.statusConsistent, label: "Consistent" };
    case "inconsistent":
      return { symbol: "✗", className: styles.statusInconsistent, label: "Inconsistent" };
    case "unverified":
      return { symbol: "?", className: styles.statusUnverified, label: "Unverified" };
  }
}

interface FactItemComponentProps {
  fact: FactItem;
  isExpanded: boolean;
  onToggle: () => void;
}

function FactItemComponent({ fact, isExpanded, onToggle }: FactItemComponentProps) {
  const icon = getStatusIcon(fact.status);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onToggle();
      } else if (e.key === "Escape" && isExpanded) {
        e.preventDefault();
        onToggle();
      }
    },
    [onToggle, isExpanded]
  );

  return (
    <li
      className={styles.factItem}
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      aria-label={`${fact.statement} — ${fact.agreement_percentage}% agree — ${icon.label}`}
      onClick={onToggle}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.factHeader}>
        <span className={`${styles.statusIcon} ${icon.className}`} aria-hidden="true">
          {icon.symbol}
        </span>
        <div className={styles.factBody}>
          <p className={styles.factStatement}>{fact.statement}</p>
          <span className={styles.factAgreement}>{fact.agreement_percentage}% agree</span>
        </div>
      </div>

      {isExpanded && (
        <div className={styles.factDetail}>
          {fact.supporting_sources.length > 0 && (
            <div className={styles.sourceGroup}>
              <span className={styles.sourceGroupLabel}>Supporting Sources</span>
              <ul className={styles.sourceList} aria-label="Supporting sources">
                {fact.supporting_sources.map((source) => (
                  <li key={source} className={`${styles.sourceChip} ${styles.sourceChipSupporting}`}>
                    {source}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {fact.contradicting_sources.length > 0 && (
            <div className={styles.sourceGroup}>
              <span className={styles.sourceGroupLabel}>Contradicting Sources</span>
              <ul className={styles.sourceList} aria-label="Contradicting sources">
                {fact.contradicting_sources.map((source) => (
                  <li key={source} className={`${styles.sourceChip} ${styles.sourceChipContradicting}`}>
                    {source}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className={styles.sourceGroup}>
            <span className={styles.sourceGroupLabel}>Agreement</span>
            <span className={styles.factAgreement}>{fact.agreement_percentage}% of sources agree</span>
          </div>
        </div>
      )}
    </li>
  );
}

export function ConsistencyPage() {
  const { state, dispatch } = useWizard();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const report = state.consistencyReport;
  const isLoading = state.stepStatuses[1] === "loading";
  const isError = state.stepStatuses[1] === "error";

  const toggleFact = useCallback((id: string) => {
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

  // Loading state
  if (isLoading) {
    return (
      <div className={styles.container}>
        <h2 className={styles.heading}>Consistency Report</h2>
        <div className={styles.loadingState} role="status" aria-label="Loading consistency report">
          <div className={styles.spinner} aria-hidden="true" />
          <p className={styles.stateMessage}>Analyzing source consistency…</p>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className={styles.container}>
        <h2 className={styles.heading}>Consistency Report</h2>
        <div className={styles.errorState} role="alert">
          <p className={styles.stateMessage}>{state.error ?? "An error occurred while analyzing consistency."}</p>
          <button
            type="button"
            className={styles.retryButton}
            aria-label="Retry consistency analysis"
            onClick={() => dispatch({ type: "RETRY" })}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // No report yet (shouldn't normally happen if not loading/error, but guard)
  if (!report) {
    return (
      <div className={styles.container}>
        <h2 className={styles.heading}>Consistency Report</h2>
        <div className={styles.loadingState} role="status" aria-label="Waiting for data">
          <div className={styles.spinner} aria-hidden="true" />
          <p className={styles.stateMessage}>Waiting for data…</p>
        </div>
      </div>
    );
  }

  // No sources found
  if (report.no_sources_found) {
    return (
      <div className={styles.container}>
        <h2 className={styles.heading}>Consistency Report</h2>
        <div className={styles.noSourcesState}>
          <p className={styles.stateMessage}>No relevant sources found for this event</p>
          <button
            type="button"
            className={styles.backButton}
            aria-label="Go back to input page"
            onClick={() => dispatch({ type: "NAVIGATE_TO", step: 0 })}
          >
            Back to Input
          </button>
        </div>
      </div>
    );
  }

  // Empty facts
  if (report.facts.length === 0) {
    return (
      <div className={styles.container}>
        <h2 className={styles.heading}>Consistency Report</h2>
        <div className={styles.emptyState}>
          <p className={styles.stateMessage}>No facts could be extracted from the selected sources.</p>
        </div>
      </div>
    );
  }

  // Compute bar proportions
  const consistentCount = report.facts.filter((f) => f.status === "consistent").length;
  const inconsistentCount = report.facts.filter((f) => f.status === "inconsistent").length;
  const unverifiedCount = report.facts.filter((f) => f.status === "unverified").length;
  const total = report.facts.length;
  const consistentPct = (consistentCount / total) * 100;
  const inconsistentPct = (inconsistentCount / total) * 100;
  const unverifiedPct = (unverifiedCount / total) * 100;

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Consistency Report</h2>

      <p className={styles.unknownLabel} aria-label={`Unknown: ${report.unknown_percentage}%`}>
        Unknown: {report.unknown_percentage}%
      </p>

      <div className={styles.barContainer}>
        <h3 className={styles.subheading}>Fact Distribution</h3>
        <div
          className={styles.segmentedBar}
          role="img"
          aria-label={`Consistency bar: ${consistentPct.toFixed(0)}% consistent, ${inconsistentPct.toFixed(0)}% inconsistent, ${unverifiedPct.toFixed(0)}% unknown`}
        >
          {consistentPct > 0 && (
            <div className={styles.segmentConsistent} style={{ width: `${consistentPct}%` }} />
          )}
          {inconsistentPct > 0 && (
            <div className={styles.segmentInconsistent} style={{ width: `${inconsistentPct}%` }} />
          )}
          {unverifiedPct > 0 && (
            <div className={styles.segmentUnknown} style={{ width: `${unverifiedPct}%` }} />
          )}
        </div>
        <div className={styles.barLegend}>
          <span className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.dotConsistent}`} />
            Consistent ({consistentCount})
          </span>
          <span className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.dotInconsistent}`} />
            Inconsistent ({inconsistentCount})
          </span>
          <span className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.dotUnknown}`} />
            Unknown ({unverifiedCount})
          </span>
        </div>
      </div>

      <div>
        <h3 className={styles.subheading}>Facts</h3>
        <ul className={styles.factList} aria-label="Fact items">
          {report.facts.map((fact) => (
            <FactItemComponent
              key={fact.id}
              fact={fact}
              isExpanded={expandedIds.has(fact.id)}
              onToggle={() => toggleFact(fact.id)}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}
