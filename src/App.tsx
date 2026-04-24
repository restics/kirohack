import { WizardProvider, useWizard } from './context/WizardContext';
import { WizardStepper } from './components/WizardStepper';
import { InputPage } from './pages/InputPage';
import { ConsistencyPage } from './pages/ConsistencyPage';
import { BreakdownPage } from './pages/BreakdownPage';
import { SummaryPage } from './pages/SummaryPage';
import styles from './App.module.css';

function PageRouter() {
  const { state } = useWizard();

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

function App() {
  return (
    <WizardProvider>
      <div className={styles.app}>
        <header className={styles.header}>
          <h1 className={styles.title}>Economic Cascade Analyzer</h1>
          <p className={styles.tagline}>
            Exposing the economic impacts hiding in plain sight
          </p>
        </header>
        <WizardStepper />
        <main className={styles.main}>
          <PageRouter />
        </main>
      </div>
    </WizardProvider>
  );
}

export default App;
