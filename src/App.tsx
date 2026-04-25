import { lazy, Suspense } from 'react';
import { WizardProvider, useWizard } from './context/WizardContext';
import { WizardStepper } from './components/WizardStepper';
import { Header } from './components/Header';
import { HomePage } from './pages/HomePage';
import { InputPage } from './pages/InputPage';
import { ConsistencyPage } from './pages/ConsistencyPage';
import { BreakdownPage } from './pages/BreakdownPage';
import { SummaryPage } from './pages/SummaryPage';
import { AuroraGlow } from './components/AuroraGlow';
import { CustomCursor } from './components/CustomCursor';

const CascadeBackground = lazy(() =>
  import('./components/CascadeBackground').then(m => ({ default: m.CascadeBackground }))
);

function GrainOverlay() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2, pointerEvents: "none", opacity: 0.025 }}>
      <svg width="100%" height="100%">
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </div>
  );
}

function PageRouter() {
  const { state } = useWizard();
  if (state.currentStep === -1) return <HomePage />;
  const pages: Record<number, React.ReactNode> = {
    0: <InputPage />,
    1: <ConsistencyPage />,
    2: <BreakdownPage />,
    3: <SummaryPage />,
  };
  return <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }} key={state.currentStep}>{pages[state.currentStep]}</div>;
}

function AppContent() {
  const { state, dispatch } = useWizard();
  const isHome = state.currentStep === -1;
  const showStepper = state.currentStep >= 0;

  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      {isHome && <Suspense fallback={null}><CascadeBackground /></Suspense>}
      {isHome && <AuroraGlow />}
      <GrainOverlay />
      <div style={{ position: "relative", zIndex: 10 }}>
        <Header onLogoClick={() => dispatch({ type: 'NAVIGATE_TO', step: -1 })} />
        {showStepper && <WizardStepper />}
        <main><PageRouter /></main>
      </div>
      {/* Custom cursor removed */}
    </div>
  );
}

export default function App() {
  return <WizardProvider><AppContent /></WizardProvider>;
}
