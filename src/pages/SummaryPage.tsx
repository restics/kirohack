import { useCallback } from 'react';
import { useWizard } from '../context/WizardContext';
import { SectorSection } from '../components/SectorSection';
import { HiddenFactorsCallout } from '../components/HiddenFactorsCallout';
import { CitedText } from '../components/CitedText';
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
        <h2 className={styles.pageTitle}>Generating Summary</h2>
        <div className={styles.loading} role="status" aria-label="Loading summary">
          <div className={styles.spinner} />
          <p className={styles.loadingText}>Creating your analysis report...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className={styles.page}>
        <h2 className={styles.pageTitle}>Summary</h2>
        <div className={styles.error}>
          <p className={styles.errorMessage}>
            {state.error || 'Failed to generate summary. Please try again.'}
          </p>
          <button
            className={styles.retryButton}
            onClick={() => dispatch({ type: 'RETRY' })}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const sectors = summaryData?.sectors ?? [];
  const hiddenFactors = summaryData?.hidden_factors_summary ?? [];
  const narrative = summaryData?.narrative_summary ?? '';
  const sourcesUsed = summaryData?.sources_used ?? [];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.pageTitle}>Analysis Complete</h2>
        <p className={styles.pageSubtext}>
          Review the comprehensive breakdown of economic impacts across all affected sectors.
        </p>
      </div>

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
          sources={sourcesUsed}
        />
      ))}

      <HiddenFactorsCallout factors={hiddenFactors} sources={sourcesUsed} />

      {narrative && (
        <div className={styles.narrative}>
          <p className={styles.narrativeLabel}>Summary</p>
          <p className={styles.narrativeText}>
            <CitedText text={narrative} sources={sourcesUsed} />
          </p>
        </div>
      )}

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
          className={styles.startOverButton}
          onClick={handleStartOver}
        >
          New Analysis
        </button>
      </div>
    </div>
  );
}
