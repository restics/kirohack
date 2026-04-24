import { useWizard } from '../context/WizardContext';
import { SectorColumn } from '../components/SectorColumn';
import styles from './BreakdownPage.module.css';

export function BreakdownPage() {
  const { state, dispatch } = useWizard();
  const { cascadeData, stepStatuses } = state;

  // Loading state
  if (stepStatuses[2] === 'loading') {
    return (
      <div className={styles.container}>
        <h2 className={styles.heading}>Cascading Breakdown</h2>
        <div className={styles.loadingState} role="status" aria-label="Loading cascade data">
          <div className={styles.spinner} />
          <p className={styles.stateMessage}>Analyzing cascading economic impacts…</p>
        </div>
      </div>
    );
  }

  // Error state
  if (stepStatuses[2] === 'error') {
    return (
      <div className={styles.container}>
        <h2 className={styles.heading}>Cascading Breakdown</h2>
        <div className={styles.errorState} role="alert">
          <p className={styles.stateMessage}>
            {state.error ?? 'Something went wrong while analyzing cascade data.'}
          </p>
          <button
            className={styles.retryButton}
            onClick={() => dispatch({ type: 'RETRY' })}
            aria-label="Retry cascade analysis"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (!cascadeData || cascadeData.sectors.length === 0) {
    return (
      <div className={styles.container}>
        <h2 className={styles.heading}>Cascading Breakdown</h2>
        <div className={styles.emptyState}>
          <p className={styles.stateMessage}>No sectors impacted by this event.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Cascading Breakdown</h2>
      <div
        className={styles.scrollContainer}
        role="region"
        aria-label="Sector columns with cascading impacts"
        tabIndex={0}
      >
        {cascadeData.sectors.map((sector, index) => (
          <SectorColumn key={sector.name} sector={sector} sectorIndex={index} />
        ))}
      </div>
    </div>
  );
}
