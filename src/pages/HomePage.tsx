import { useCallback } from 'react';
import { useWizard } from '../context/WizardContext';
import styles from './HomePage.module.css';

export function HomePage() {
  const { dispatch } = useWizard();
  const handleGetStarted = useCallback(() => {
    dispatch({ type: 'NAVIGATE_TO', step: 0 });
  }, [dispatch]);

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <div className={styles.badge}>Economic Analysis Tool</div>
        <h1 className={styles.title}>
          Uncover the <span className={styles.gradient}>Hidden Impacts</span> of Economic Events
        </h1>
        <p className={styles.subtitle}>
          Analyze how news events cascade through interconnected economic sectors.
          Get AI-powered insights into direct and indirect impacts that traditional analysis misses.
        </p>
        <button className={styles.ctaButton} onClick={handleGetStarted}>
          Start Analysis
          <svg className={styles.ctaIcon} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      <div className={styles.features}>
        <div className={styles.feature}>
          <div className={styles.featureIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
            </svg>
          </div>
          <h3 className={styles.featureTitle}>Multi-Source Verification</h3>
          <p className={styles.featureDesc}>
            Cross-reference facts across multiple news sources to identify consistent and contested information.
          </p>
        </div>
        <div className={styles.feature}>
          <div className={styles.featureIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
          </div>
          <h3 className={styles.featureTitle}>Cascade Analysis</h3>
          <p className={styles.featureDesc}>
            Trace how impacts ripple through agriculture, energy, finance, and other interconnected sectors.
          </p>
        </div>
        <div className={styles.feature}>
          <div className={styles.featureIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className={styles.featureTitle}>Hidden Factor Detection</h3>
          <p className={styles.featureDesc}>
            Discover overlooked impacts like labor shifts, environmental debt, and regulatory risks.
          </p>
        </div>
      </div>
      <div className={styles.footer}>
        <p className={styles.footerText}>Powered by advanced AI analysis</p>
      </div>
    </div>
  );
}
