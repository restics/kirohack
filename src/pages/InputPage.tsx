import { useState, useCallback } from "react";
import { useWizard } from "../context/WizardContext";
import { createMockApiClient } from "../api/client";
import styles from "./InputPage.module.css";

const SOURCES = ["NYT", "Reuters", "Bloomberg"] as const;
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

  const validationError = validateEventInput(event);
  const isDisabled =
    event.length < MIN_LENGTH ||
    event.length > MAX_LENGTH ||
    selectedSources.length === 0;

  const toggleSource = useCallback((source: string) => {
    setSelectedSources((prev) =>
      prev.includes(source)
        ? prev.filter((s) => s !== source)
        : [...prev, source]
    );
  }, []);

  const handleSubmit = useCallback(async () => {
    setAttempted(true);
    const err = validateEventInput(event);
    if (err || selectedSources.length === 0) {
      setError(err);
      return;
    }

    setError(null);
    dispatch({ type: "SUBMIT", newsEvent: event, selectedSources });

    try {
      const consistencyReport = await apiClient.fetchConsistency(
        event,
        selectedSources
      );
      dispatch({ type: "RECEIVE_CONSISTENCY", consistencyReport });

      const cascadeData = await apiClient.fetchCascade(
        event,
        selectedSources
      );
      dispatch({ type: "RECEIVE_CASCADE", cascadeData });

      const summaryData = await apiClient.fetchSummary(
        event,
        selectedSources
      );
      dispatch({ type: "RECEIVE_SUMMARY", summaryData });
    } catch (e) {
      dispatch({
        type: "SET_ERROR",
        error: e instanceof Error ? e.message : "An unexpected error occurred.",
      });
    }
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
      <h2 className={styles.heading}>Describe Your Event</h2>

      <div className={styles.textareaWrapper}>
        <textarea
          className={`${styles.textarea}${attempted && validationError ? ` ${styles.textareaError}` : ""}`}
          aria-label="News event description"
          placeholder="What do you want to analyze?"
          rows={5}
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
        <span className={styles.sourceLabel}>News Sources</span>
        <div className={styles.sourcePills} role="group" aria-label="News source selection">
          {SOURCES.map((source) => {
            const selected = selectedSources.includes(source);
            return (
              <button
                key={source}
                type="button"
                className={`${styles.pill}${selected ? ` ${styles.pillSelected}` : ""}`}
                aria-label={`Select ${source}`}
                aria-pressed={selected}
                onClick={() => toggleSource(source)}
              >
                {source}
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        className={styles.submitButton}
        disabled={isDisabled}
        aria-label="Analyze event"
        onClick={handleSubmit}
      >
        Analyze
      </button>
    </div>
  );
}
