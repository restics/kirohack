import { useCallback } from 'react';
import { useWizard } from '../context/WizardContext';
import { Hero } from '../components/Hero';
import { FeaturesGrid } from '../components/FeaturesGrid';

export function HomePage() {
  const { dispatch } = useWizard();

  const handleGetStarted = useCallback(() => {
    dispatch({ type: 'NAVIGATE_TO', step: 0 });
  }, [dispatch]);

  return (
    <div>
      <Hero onStart={handleGetStarted} />
      <FeaturesGrid />
      <footer style={{
        textAlign: "center",
        padding: "24px",
        fontSize: "0.8rem",
        color: "rgba(148,163,184,0.5)",
      }}>
        Powered by advanced AI analysis
      </footer>
    </div>
  );
}
