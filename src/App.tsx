import { WizardProvider, useWizard } from './context/WizardContext';
import { WizardStepper } from './components/WizardStepper';
import { HomePage } from './pages/HomePage';
import { InputPage } from './pages/InputPage';
import { ConsistencyPage } from './pages/ConsistencyPage';
import { BreakdownPage } from './pages/BreakdownPage';
import { SummaryPage } from './pages/SummaryPage';
import styles from './App.module.css';

function PageRouter() {
  const { state } = useWizard();

  if (state.currentStep === -1) {
    return <HomePage />;
  }

  const pages: Record<number, React.ReactNode> = {
    0: <InputPage />,
    1: <ConsistencyPage />,
    2: <BreakdownPage />,
    3: <SummaryPage />,
  };

  return (
    <div className={styles.pageCard} key={state.currentStep}>
      {pages[state.currentStep]}
    </div>
  );
}

function AppContent() {
  const { state, dispatch } = useWizard();
  const showStepper = state.currentStep >= 0;

  const handleLogoClick = () => {
    dispatch({ type: 'NAVIGATE_TO', step: -1 });
  };

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <button className={styles.logo} onClick={handleLogoClick} aria-label="Go to homepage">
          <svg className={styles.logoIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
          </svg>
          <span className={styles.logoText}>Cascade</span>
        </button>
      </header>
      {showStepper && <WizardStepper />}
      <main className={styles.main}>
        <PageRouter />
      </main>
    </div>
  );
}

function App() {
  return (
    <WizardProvider>
      <AppContent />
    </WizardProvider>
  );
}

export default App;
