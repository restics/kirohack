import { useState, useCallback } from "react";
import { useWizard } from "../context/WizardContext";
import { createMockApiClient } from "../api/client";
import type { FactItem } from "../types/index";
import styles from "./ConsistencyPage.module.css";

const apiClient = createMockApiClient();

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

function getAgreementColor(percentage: number): string {
  if (percentage >= 80) return "var(--color-success)";
  if (percentage >= 50) return "var(--color-warning, #f59e0b)";
  return "var(--color-error)";
}

interface FactItemComponentProps {
  fact: FactItem;
  isExpanded: boolean;
  isSelected: boolean;
  onToggleExpand: () => void;
  onToggleSelect: () => void;
}

function FactItemComponent({ fact, isExpanded, isSelected, onToggleExpand, onToggleSelect }: FactItemComponentProps) {
  const icon = getStatusIcon(fact.status);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onToggleExpand();
      } else if (e.key === "Escape" && isExpanded) {
        e.preventDefault();
        onToggleExpand();
      }
    },
    [onToggleExpand, isExpanded]
  );

  return (
    <li className={`${styles.factItem} ${isSelected ? styles.factItemSelected : ""}`}>
      <div className={styles.factRow}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className={styles.factCheckbox}
          aria-label={`Select fact: ${fact.statement}`}
        />
        <div
          className={styles.factContent}
          role="button"
          tabIndex={0}
          aria-expanded={isExpanded}
          aria-label={`${fact.statement} — ${fact.agreement_percentage}% agree — ${icon.label}`}
          onClick={onToggleExpand}
          onKeyDown={handleKeyDown}
        >
          <div className={styles.factHeader}>
            <span className={`${styles.statusIcon} ${icon.className}`} aria-hidden="true">
              {icon.symbol}
            </span>
            <div className={styles.factBody}>
              <p className={styles.factStatement}>{fact.statement}</p>
              <span 
                className={styles.factAgreement}
                style={{ color: getAgreementColor(fact.agreement_percentage) }}
              >
                {fact.agreement_percentage}% consistency
              </span>
            </div>
            <span className={styles.expandIcon}>{isExpanded ? "▼" : "▶"}</span>
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
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

export function ConsistencyPage() {
  const { state, dispatch } = useWizard();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedFactIds, setSelectedFactIds] = useState<Set<string>>(() => {
    // Default: select all consistent facts
    const ids = new Set<string>();
    if (state.consistencyReport) {
      for (const fact of state.consistencyReport.facts) {
        if (fact.status === "consistent") {
          ids.add(fact.id);
        }
      }
    }
    return ids;
  });
  const [isAdvancing, setIsAdvancing] = useState(false);

  const report = state.consistencyReport;
  const isLoading = state.stepStatuses[1] === "loading";
  const isError = state.stepStatuses[1] === "error";

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedFactIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (report) {
      setSelectedFactIds(new Set(report.facts.map(f => f.id)));
    }
  }, [report]);

  const deselectAll = useCallback(() => {
    setSelectedFactIds(new Set());
  }, []);

  const selectConsistent = useCallback(() => {
    if (report) {
      setSelectedFactIds(new Set(report.facts.filter(f => f.status === "consistent").map(f => f.id)));
    }
  }, [report]);

  const handleContinue = useCallback(async () => {
    const ids = Array.from(selectedFactIds);
    dispatch({ type: "CONFIRM_CONSISTENCY", selectedFactIds: ids });
    setIsAdvancing(true);

    // Filter to only the facts the user selected
    const selectedFacts = report ? report.facts.filter(f => selectedFactIds.has(f.id)) : [];

    try {
      const cascadeData = await apiClient.fetchCascade(state.newsEvent, state.selectedSources, selectedFacts);
      dispatch({ type: "RECEIVE_CASCADE", cascadeData });
    } catch (e) {
      dispatch({
        type: "SET_ERROR",
        error: e instanceof Error ? e.message : "An unexpected error occurred.",
      });
    }
    setIsAdvancing(false);
  }, [selectedFactIds, dispatch, state.newsEvent, state.selectedSources]);

  const handleBack = useCallback(() => {
    dispatch({ type: "NAVIGATE_TO", step: 0 });
  }, [dispatch]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <h2 className={styles.heading}>Verifying Facts</h2>
        <div className={styles.loadingState} role="status" aria-label="Loading consistency report">
          <div className={styles.spinner} aria-hidden="true" />
          <p className={styles.stateMessage}>Cross-referencing sources...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={styles.container}>
        <h2 className={styles.heading}>Verifying Facts</h2>
        <div className={styles.errorState} role="alert">
          <p className={styles.stateMessage}>{state.error ?? "An error occurred."}</p>
          <button type="button" className={styles.retryButton} onClick={() => dispatch({ type: "RETRY" })}>Try Again</button>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className={styles.container}>
        <h2 className={styles.heading}>Verifying Facts</h2>
        <div className={styles.loadingState} role="status"><div className={styles.spinner} /><p className={styles.stateMessage}>Waiting for data...</p></div>
      </div>
    );
  }

  if (report.no_sources_found) {
    return (
      <div className={styles.container}>
        <h2 className={styles.heading}>Verifying Facts</h2>
        <div className={styles.noSourcesState}>
          <p className={styles.stateMessage}>No relevant sources found for this event</p>
          <button type="button" className={styles.backButton} onClick={() => dispatch({ type: "NAVIGATE_TO", step: 0 })}>Go Back</button>
        </div>
      </div>
    );
  }

  if (report.facts.length === 0) {
    return (
      <div className={styles.container}>
        <h2 className={styles.heading}>Verifying Facts</h2>
        <div className={styles.emptyState}><p className={styles.stateMessage}>No facts could be extracted from the selected sources.</p></div>
      </div>
    );
  }

  const consistentCount = report.facts.filter((f) => f.status === "consistent").length;
  const inconsistentCount = report.facts.filter((f) => f.status === "inconsistent").length;
  const unverifiedCount = report.facts.filter((f) => f.status === "unverified").length;
  const total = report.facts.length;
  const consistentPct = (consistentCount / total) * 100;
  const inconsistentPct = (inconsistentCount / total) * 100;
  const unverifiedPct = (unverifiedCount / total) * 100;

  // Sort facts by agreement percentage descending
  const sortedFacts = [...report.facts].sort((a, b) => b.agreement_percentage - a.agreement_percentage);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.heading}>Fact Verification</h2>
        <p className={styles.subtext}>
          Select the verified facts to include in your impact analysis. Facts are cross-referenced across your selected sources.
        </p>
      </div>

      <div className={styles.barContainer}>
        <h3 className={styles.subheading}>Source Agreement</h3>
        <div className={styles.segmentedBar} role="img" aria-label={`${consistentPct.toFixed(0)}% consistent, ${inconsistentPct.toFixed(0)}% inconsistent, ${unverifiedPct.toFixed(0)}% unknown`}>
          {consistentPct > 0 && <div className={styles.segmentConsistent} style={{ width: `${consistentPct}%` }} />}
          {inconsistentPct > 0 && <div className={styles.segmentInconsistent} style={{ width: `${inconsistentPct}%` }} />}
          {unverifiedPct > 0 && <div className={styles.segmentUnknown} style={{ width: `${unverifiedPct}%` }} />}
        </div>
        <div className={styles.barLegend}>
          <span className={styles.legendItem}><span className={`${styles.legendDot} ${styles.dotConsistent}`} />Verified ({consistentCount})</span>
          <span className={styles.legendItem}><span className={`${styles.legendDot} ${styles.dotInconsistent}`} />Disputed ({inconsistentCount})</span>
          <span className={styles.legendItem}><span className={`${styles.legendDot} ${styles.dotUnknown}`} />Unverified ({unverifiedCount})</span>
        </div>
      </div>

      <div>
        <div className={styles.factsHeader}>
          <h3 className={styles.subheading}>Facts ({selectedFactIds.size} of {total} selected)</h3>
          <div className={styles.selectActions}>
            <button type="button" className={styles.selectActionButton} onClick={selectAll}>All</button>
            <button type="button" className={styles.selectActionButton} onClick={selectConsistent}>Verified Only</button>
            <button type="button" className={styles.selectActionButton} onClick={deselectAll}>None</button>
          </div>
        </div>
        <ul className={styles.factList} aria-label="Fact items">
          {sortedFacts.map((fact) => (
            <FactItemComponent
              key={fact.id}
              fact={fact}
              isExpanded={expandedIds.has(fact.id)}
              isSelected={selectedFactIds.has(fact.id)}
              onToggleExpand={() => toggleExpand(fact.id)}
              onToggleSelect={() => toggleSelect(fact.id)}
            />
          ))}
        </ul>
      </div>

      <div className={styles.navigationButtons}>
        <button
          type="button"
          className={styles.backButton}
          onClick={handleBack}
        >
          Back
        </button>
        <button
          type="button"
          className={styles.continueButton}
          disabled={selectedFactIds.size === 0 || isAdvancing}
          onClick={handleContinue}
        >
          {isAdvancing ? "Analyzing..." : `Analyze ${selectedFactIds.size} Facts`}
        </button>
      </div>
    </div>
  );
}
