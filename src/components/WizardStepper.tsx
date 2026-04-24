import { useWizard } from '../context/WizardContext';
import type { WizardStep } from '../types/index';
import styles from './WizardStepper.module.css';

const STEP_LABELS = ['Input', 'Consistency', 'Breakdown', 'Summary'] as const;

export function WizardStepper() {
  const { state, dispatch } = useWizard();
  const { currentStep, stepStatuses } = state;

  function getStepState(index: number) {
    if (stepStatuses[index] === 'complete' && index !== currentStep) return 'completed';
    if (index === currentStep) return 'current';
    return 'upcoming';
  }

  function getAriaLabel(index: number) {
    const label = STEP_LABELS[index];
    const stepState = getStepState(index);
    const statusText =
      stepState === 'completed'
        ? 'Completed'
        : stepState === 'current'
          ? stepStatuses[index] === 'loading'
            ? 'In progress'
            : 'Current'
          : 'Upcoming';
    return `Step ${index + 1}: ${label} - ${statusText}`;
  }

  function handleClick(index: number) {
    const stepState = getStepState(index);
    if (stepState === 'completed') {
      dispatch({ type: 'NAVIGATE_TO', step: index as WizardStep });
    }
  }

  return (
    <nav className={styles.stepper} aria-label="Wizard progress">
      {STEP_LABELS.map((label, index) => {
        const stepState = getStepState(index);
        const isLoading = index === currentStep && stepStatuses[index] === 'loading';

        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 'inherit' }}>
            <button
              type="button"
              className={`${styles.step} ${styles[stepState]}`}
              aria-label={getAriaLabel(index)}
              aria-current={index === currentStep ? 'step' : undefined}
              onClick={() => handleClick(index)}
              disabled={stepState === 'upcoming'}
              tabIndex={stepState === 'upcoming' ? -1 : 0}
            >
              <span className={styles.indicator}>
                {stepState === 'completed' ? '✓' : index + 1}
              </span>
              <span className={styles.label}>{label}</span>
              {isLoading && <span className={styles.spinner} aria-hidden="true" />}
            </button>
            {index < STEP_LABELS.length - 1 && (
              <span
                className={`${styles.connector} ${stepStatuses[index] === 'complete' ? styles.done : ''}`}
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
