import { useState, useCallback } from 'react';
import { useWizard } from '../context/WizardContext';
import { createMockApiClient } from '../api/client';
import { SectorColumn } from '../components/SectorColumn';
import styles from './BreakdownPage.module.css';

const apiClient = createMockApiClient();

export function BreakdownPage() {
  const { state, dispatch } = useWizard();
  const { cascadeData, stepStatuses } = state;
  const [isAdvancing, setIsAdvancing] = useState(false);

  const handleContinue = useCallback(async () => {
    dispatch({ type: "CONFIRM_CASCADE" });
    setIsAdvancing(true);

    try {
      const summaryData = await apiClient.fetchSummary(state.newsEvent, state.selectedSources, cascadeData ?? undefined);
      dispatch({ type: "RECEIVE_SUMMARY", summaryData });
    } catch (e) {
      dispatch({
        type: "SET_ERROR",
        error: e instanceof Error ? e.message : "An unexpected error occurred.",
      });
    }
    setIsAdvancing(false);
  }, [dispatch, state.newsEvent, state.selectedSources]);

  const handleBack = useCallback(() => {
    dispatch({ type: "NAVIGATE_TO", step: 1 });
  }, [dispatch]);

  if (stepStatuses[2] === 'loading') {
    return (
      <div className={styles.container}>
        <h2 className={styles.heading}>Analyzing Impacts</h2>
        <div className={styles.loadingState} role="status" aria-label="Loading cascade data">
          <div className={styles.spinner} />
          <p className={styles.stateMessage}>Tracing cascading economic impacts...</p>
        </div>
      </div>
    );
  }

  if (stepStatuses[2] === 'error') {
    return (
      <div className={styles.container}>
        <h2 className={styles.heading}>Analyzing Impacts</h2>
        <div className={styles.errorState} role="alert">
          <p className={styles.stateMessage}>{state.error ?? 'Something went wrong.'}</p>
          <button className={styles.retryButton} onClick={() => dispatch({ type: 'RETRY' })}>Try Again</button>
        </div>
      </div>
    );
  }

  if (!cascadeData || !cascadeData.sectors || cascadeData.sectors.length === 0) {
    return (
      <div className={styles.container}>
        <h2 className={styles.heading}>Analyzing Impacts</h2>
        <div className={styles.emptyState}>
          <p className={styles.stateMessage}>No sectors impacted by this event.</p>
        </div>
      </div>
    );
  }

  const totalImpacts = cascadeData.sectors.reduce((sum, s) => sum + (s.impacts?.length ?? 0), 0);
  const hiddenFactors = cascadeData.sectors.reduce((sum, s) => 
    sum + (s.impacts ?? []).filter(i => i.is_hidden_factor).length, 0);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.heading}>Impact Analysis</h2>
        <p className={styles.subtext}>
          Explore how the event cascades through interconnected economic sectors. Click on impacts to see details and trace downstream effects.
        </p>
      </div>
      
      <div className={styles.summaryStats}>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{cascadeData.sectors.length}</span>
          <span className={styles.statLabel}>Sectors</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{totalImpacts}</span>
          <span className={styles.statLabel}>Impacts</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{hiddenFactors}</span>
          <span className={styles.statLabel}>Hidden Factors</span>
        </div>
      </div>

      <div className={styles.sectorsVertical} role="region" aria-label="Sector breakdown">
        {cascadeData.sectors.map((sector, index) => (
          <SectorColumn key={sector.name} sector={sector} sectorIndex={index} />
        ))}
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
          disabled={isAdvancing}
          onClick={handleContinue}
        >
          {isAdvancing ? "Generating..." : "View Summary"}
        </button>
      </div>
    </div>
  );
}
