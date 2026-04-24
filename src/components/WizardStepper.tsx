import { useWizard } from '../context/WizardContext';
import type { WizardStep } from '../types/index';
import styles from './WizardStepper.module.css';

const STEP_LABELS = ['Event', 'Verify', 'Analyze', 'Results'] as const;

export function WizardStepper() {
  const { state, dispatch } = useWizard();
  const { currentStep, stepStatuses } = state;

  function getStepState(index: number) {
    if (stepStatuses[index] === 'complete' && index !== currentStep) return 'completed';
    if (index === currentStep) return 'current';
    return 'upcoming';
  }

  function handleClick(index: number) {
    const stepState = getStepState(index);
    if (stepState === 'completed' || index === 0) {
      dispatch({ type: 'NAVIGATE_TO', step: index as WizardStep });
    }
  }

  return (
    <nav className={styles.stepper} aria-label="Progress">
      <div className={styles.stepperInner}>
        {STEP_LABELS.map((label, index) => {
          const stepState = getStepState(index);
          const isLoading = index === currentStep && currentStep >= 0 && stepStatuses[currentStep as 0 | 1 | 2 | 3] === 'loading';

          return (
            <div key={label} className={styles.stepWrapper}>
              <button
                type="button"
                className={`${styles.step} ${styles[stepState]}`}
                aria-current={index === currentStep ? 'step' : undefined}
                onClick={() => handleClick(index)}
                disabled={stepState === 'upcoming'}
              >
                <span className={styles.indicator}>
                  {stepState === 'completed' ? (
                    <svg viewBox="0 0 20 20" fill="currentColor" className={styles.checkIcon}>
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                  ) : isLoading ? (
                    <span className={styles.spinner} />
                  ) : (
                    <span className={styles.number}>{index + 1}</span>
                  )}
                </span>
                <span className={styles.label}>{label}</span>
              </button>
              {index < STEP_LABELS.length - 1 && (
                <div className={`${styles.connector} ${stepStatuses[index] === 'complete' ? styles.connectorDone : ''}`} />
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
