import { useCallback } from 'react';
import { useWizard } from '../context/WizardContext';
import { SectorSection } from '../components/SectorSection';
import { HiddenFactorsCallout } from '../components/HiddenFactorsCallout';
import styles from './SummaryPage.module.css';

export function SummaryPage() {
  const { state, dispatch } = useWizard();
  const status = state.stepStatuses[3];
  const summaryData = state.summaryData;

  const handleBack = useCallback(() => {
    dispatch({ type: "NAVIGATE_TO", step: 2 });
  }, [dispatch]);

  const handleStartOver = useCallback(() => {
    dispatch({ type: "RESET" });
  }, [dispatch]);

  if (status === 'loading') {
    return (
      <div className={styles.page}>
        <h2 className={styles.pageTitle}>Step 4: Summary Infographic</h2>
        <div className={styles.loading} role="status" aria-label="Loading summary">
          <div className={styles.spinner} />
          <p className={styles.loadingText}>Generating summary infographic…</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className={styles.page}>
        <h2 className={styles.pageTitle}>Step 4: Summary Infographic</h2>
        <div className={styles.error}>
          <p className={styles.errorMessage}>
            {state.error || 'Failed to generate summary. Please try again.'}
          </p>
          <button
            className={styles.retryButton}
            onClick={() => dispatch({ type: 'RETRY' })}
            aria-label="Retry generating summary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const sectors = summaryData?.sectors ?? [];
  const hiddenFactors = summaryData?.hidden_factors_summary ?? [];
  const narrative = summaryData?.narrative_summary ?? '';

  return (
    <div className={styles.page}>
      <h2 className={styles.pageTitle}>Step 4: Summary Infographic</h2>
      <p className={styles.pageSubtext}>
        Your complete economic impact analysis is ready. Review the sector-by-sector breakdown, 
        hidden factors, and narrative summary below.
      </p>

      {sectors.length === 0 && (
        <p className={styles.emptyNote}>
          No sector-specific data is available for this event.
        </p>
      )}

      {sectors.map((sector, index) => (
        <SectorSection
          key={sector.name}
          sector={sector}
          sectorIndex={index}
        />
      ))}

      <HiddenFactorsCallout factors={hiddenFactors} />

      {narrative && (
        <div className={styles.narrative}>
          <p className={styles.narrativeLabel}>📝 Narrative Summary</p>
          <p className={styles.narrativeText}>{narrative}</p>
        </div>
      )}

      <div className={styles.navigationButtons}>
        <button
          type="button"
          className={styles.backButton}
          onClick={handleBack}
        >
          ← Back to Breakdown
        </button>
        <button
          type="button"
          className={styles.startOverButton}
          onClick={handleStartOver}
        >
          Start New Analysis
        </button>
      </div>
    </div>
  );
}
