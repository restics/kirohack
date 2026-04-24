import { useState, useCallback } from "react";
import { useWizard } from "../context/WizardContext";
import { createMockApiClient } from "../api/client";
import styles from "./InputPage.module.css";

const AVAILABLE_SOURCES = [
  { name: "NYT", description: "The New York Times" },
  { name: "Reuters", description: "Reuters News Agency" },
  { name: "Bloomberg", description: "Bloomberg News" },
  { name: "AP News", description: "Associated Press" },
  { name: "WSJ", description: "Wall Street Journal" },
  { name: "Financial Times", description: "Financial Times" },
];

const MIN_LENGTH = 10;
const MAX_LENGTH = 500;

const apiClient = createMockApiClient();

export function validateEventInput(value: string): string | null {
  if (value.length < MIN_LENGTH) {
    return `Event description must be at least ${MIN_LENGTH} characters.`;
  }
  if (value.length > MAX_LENGTH) {
    return `Event description must be at most ${MAX_LENGTH} characters.`;
  }
  return null;
}

export function InputPage() {
  const { dispatch } = useWizard();
  const [event, setEvent] = useState("");
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validationError = validateEventInput(event);
  const isDisabled =
    event.length < MIN_LENGTH ||
    event.length > MAX_LENGTH ||
    selectedSources.length === 0 ||
    isSubmitting;

  const toggleSource = useCallback((source: string) => {
    setSelectedSources((prev) =>
      prev.includes(source)
        ? prev.filter((s) => s !== source)
        : [...prev, source]
    );
  }, []);

  const selectAllSources = useCallback(() => {
    setSelectedSources(AVAILABLE_SOURCES.map(s => s.name));
  }, []);

  const deselectAllSources = useCallback(() => {
    setSelectedSources([]);
  }, []);

  const handleSubmit = useCallback(async () => {
    setAttempted(true);
    const err = validateEventInput(event);
    if (err || selectedSources.length === 0) {
      setError(err);
      return;
    }

    setError(null);
    setIsSubmitting(true);
    dispatch({ type: "SUBMIT", newsEvent: event, selectedSources });

    try {
      const consistencyReport = await apiClient.fetchConsistency(
        event,
        selectedSources
      );
      dispatch({ type: "RECEIVE_CONSISTENCY", consistencyReport });
    } catch (e) {
      dispatch({
        type: "SET_ERROR",
        error: e instanceof Error ? e.message : "An unexpected error occurred.",
      });
    }
    setIsSubmitting(false);
  }, [event, selectedSources, dispatch]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && !isDisabled) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit, isDisabled]
  );

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Step 1: Describe Your Event</h2>
      <p className={styles.stepDescription}>Enter the news event you want to analyze and select your preferred sources.</p>

      <div className={styles.textareaWrapper}>
        <textarea
          className={`${styles.textarea}${attempted && validationError ? ` ${styles.textareaError}` : ""}`}
          aria-label="News event description"
          placeholder="What do you want to analyze? (e.g., 'US imposes 25% tariff on imported coffee')"
          rows={4}
          value={event}
          onChange={(e) => setEvent(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <span
          className={`${styles.charCount}${event.length > MAX_LENGTH ? ` ${styles.charCountOver}` : ""}`}
          aria-live="polite"
        >
          {event.length} / {MAX_LENGTH}
        </span>
        {attempted && validationError && (
          <p className={styles.errorMessage} role="alert">
            {validationError}
          </p>
        )}
        {error && (
          <p className={styles.errorMessage} role="alert">
            {error}
          </p>
        )}
      </div>

      <div className={styles.sourceSection}>
        <div className={styles.sourceSectionHeader}>
          <span className={styles.sourceLabel}>Select News Sources</span>
          <div className={styles.sourceActions}>
            <button type="button" className={styles.sourceActionBtn} onClick={selectAllSources}>Select All</button>
            <button type="button" className={styles.sourceActionBtn} onClick={deselectAllSources}>Deselect All</button>
          </div>
        </div>
        <p className={styles.sourceHint}>Choose which sources to analyze. Consistency scores will be calculated after analysis.</p>
        
        <div className={styles.sourceGrid} role="group" aria-label="News source selection">
          {AVAILABLE_SOURCES.map((source) => {
            const selected = selectedSources.includes(source.name);
            return (
              <button
                key={source.name}
                type="button"
                className={`${styles.sourceCard}${selected ? ` ${styles.sourceCardSelected}` : ""}`}
                aria-label={`Select ${source.name}`}
                aria-pressed={selected}
                onClick={() => toggleSource(source.name)}
              >
                <div className={styles.sourceCardHeader}>
                  <span className={styles.sourceCardName}>{source.name}</span>
                  <span className={styles.sourceCardCheck}>{selected ? "✓" : ""}</span>
                </div>
                <span className={styles.sourceCardDescription}>{source.description}</span>
              </button>
            );
          })}
        </div>

        {selectedSources.length > 0 && (
          <div className={styles.selectionSummary}>
            <span className={styles.summaryText}>
              {selectedSources.length} source{selectedSources.length !== 1 ? "s" : ""} selected
            </span>
          </div>
        )}
      </div>

      <button
        type="button"
        className={styles.submitButton}
        disabled={isDisabled}
        aria-label="Continue to consistency analysis"
        onClick={handleSubmit}
      >
        {isSubmitting ? "Analyzing…" : "Continue to Consistency Analysis →"}
      </button>
    </div>
  );
}
