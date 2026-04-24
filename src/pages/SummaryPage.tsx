import { useWizard } from '../context/WizardContext';
import { SectorSection } from '../components/SectorSection';
import { HiddenFactorsCallout } from '../components/HiddenFactorsCallout';
import styles from './SummaryPage.module.css';

export function SummaryPage() {
  const { state, dispatch } = useWizard();
  const status = state.stepStatuses[3];
  const summaryData = state.summaryData;

  if (status === 'loading') {
    return (
      <div className={styles.page}>
        <h2 className={styles.pageTitle}>Summary Infographic</h2>
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
        <h2 className={styles.pageTitle}>Summary Infographic</h2>
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
      <h2 className={styles.pageTitle}>Summary Infographic</h2>

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
    </div>
  );
}
