import { useState, useCallback } from "react";
import { useWizard } from "../context/WizardContext";
import { createMockApiClient, setApiKey, getApiKey, setNewsApiKey, getNewsApiKey } from "../api/client";
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
  if (value.length < MIN_LENGTH) return `Event description must be at least ${MIN_LENGTH} characters.`;
  if (value.length > MAX_LENGTH) return `Event description must be at most ${MAX_LENGTH} characters.`;
  return null;
}

export function InputPage() {
  const { dispatch } = useWizard();
  const [event, setEvent] = useState("");
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // API keys
  const [newsApiKeyInput, setNewsApiKeyInput] = useState(getNewsApiKey() || "");
  const [apiKeyInput, setApiKeyInput] = useState(getApiKey() || "");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const validationError = validateEventInput(event);
  const needsNewsKey = !newsApiKeyInput.trim();
  const isDisabled =
    event.length < MIN_LENGTH ||
    event.length > MAX_LENGTH ||
    selectedSources.length === 0 ||
    needsNewsKey ||
    isSubmitting;

  const toggleSource = useCallback((source: string) => {
    setSelectedSources((prev) =>
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source]
    );
  }, []);

  const selectAllSources = useCallback(() => {
    setSelectedSources(AVAILABLE_SOURCES.map(s => s.name));
  }, []);

  const deselectAllSources = useCallback(() => {
    setSelectedSources([]);
  }, []);

  const handleNewsApiKeyChange = useCallback((value: string) => {
    setNewsApiKeyInput(value);
    setNewsApiKey(value || null);
  }, []);

  const handleApiKeyChange = useCallback((value: string) => {
    setApiKeyInput(value);
    setApiKey(value || null);
  }, []);

  const handleSubmit = useCallback(async () => {
    setAttempted(true);
    const err = validateEventInput(event);
    if (err || selectedSources.length === 0 || needsNewsKey) {
      setError(err);
      return;
    }

    setError(null);
    setIsSubmitting(true);
    dispatch({ type: "SUBMIT", newsEvent: event, selectedSources });

    try {
      const consistencyReport = await apiClient.fetchConsistency(event, selectedSources);
      dispatch({ type: "RECEIVE_CONSISTENCY", consistencyReport });
    } catch (e) {
      dispatch({
        type: "SET_ERROR",
        error: e instanceof Error ? e.message : "An unexpected error occurred.",
      });
    }
    setIsSubmitting(false);
  }, [event, selectedSources, needsNewsKey, dispatch]);

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
      <div className={styles.header}>
        <h2 className={styles.heading}>Describe the Economic Event</h2>
        <p className={styles.stepDescription}>
          Enter a news event or economic development you want to analyze. We'll trace its cascading impacts across multiple sectors.
        </p>
      </div>

      {/* NewsAPI Key — required, always visible */}
      <div className={styles.inputSection}>
        <label className={styles.inputLabel}>
          NewsAPI Key <span className={styles.requiredStar}>*</span>
        </label>
        <p className={styles.sourceHint}>
          Required for real article retrieval. Get a free key at{" "}
          <a href="https://newsapi.org/register" target="_blank" rel="noopener noreferrer" className={styles.link}>
            newsapi.org
          </a>
        </p>
        <input
          type="text"
          className={`${styles.apiKeyInput} ${styles.apiKeyInputVisible}${attempted && needsNewsKey ? ` ${styles.textareaError}` : ""}`}
          placeholder="e.g., d2694db37c28..."
          value={newsApiKeyInput}
          onChange={(e) => handleNewsApiKeyChange(e.target.value)}
          aria-label="NewsAPI key"
        />
        {attempted && needsNewsKey && (
          <p className={styles.errorMessage} role="alert">NewsAPI key is required.</p>
        )}
      </div>

      {/* Event description */}
      <div className={styles.inputSection}>
        <label className={styles.inputLabel}>Event Description</label>
        <div className={styles.textareaWrapper}>
          <textarea
            className={`${styles.textarea}${attempted && validationError ? ` ${styles.textareaError}` : ""}`}
            aria-label="News event description"
            placeholder="e.g., US imposes 25% tariff on imported coffee beans"
            rows={4}
            value={event}
            onChange={(e) => setEvent(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <span
          className={`${styles.charCount}${event.length > MAX_LENGTH ? ` ${styles.charCountOver}` : ""}`}
          aria-live="polite"
        >
          {event.length} / {MAX_LENGTH}
        </span>
        {attempted && validationError && (
          <p className={styles.errorMessage} role="alert">{validationError}</p>
        )}
        {error && (
          <p className={styles.errorMessage} role="alert">{error}</p>
        )}
      </div>

      {/* Source selection */}
      <div className={styles.sourceSection}>
        <div className={styles.sourceSectionHeader}>
          <span className={styles.sourceLabel}>News Sources</span>
          <div className={styles.sourceActions}>
            <button type="button" className={styles.sourceActionBtn} onClick={selectAllSources}>Select All</button>
            <button type="button" className={styles.sourceActionBtn} onClick={deselectAllSources}>Clear</button>
          </div>
        </div>
        <p className={styles.sourceHint}>Select sources to cross-reference for fact verification</p>
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
                  {selected && <span className={styles.sourceCardCheck}>✓</span>}
                </div>
                <span className={styles.sourceCardDescription}>{source.description}</span>
              </button>
            );
          })}
        </div>
        {selectedSources.length > 0 && (
          <div className={styles.selectionSummary}>
            {selectedSources.length} source{selectedSources.length !== 1 ? "s" : ""} selected
          </div>
        )}
      </div>

      {/* Advanced: AI model settings */}
      <div className={styles.apiKeySection}>
        <button
          type="button"
          className={styles.apiKeyToggle}
          onClick={() => setShowAdvanced(prev => !prev)}
        >
          <span>
            AI Model
            {apiKeyInput ? (
              <span className={`${styles.apiKeyBadge} ${styles.apiKeyBadgePro}`}> Claude</span>
            ) : (
              <span className={`${styles.apiKeyBadge} ${styles.apiKeyBadgeFree}`}> Free</span>
            )}
          </span>
          <span className={`${styles.apiKeyChevron} ${showAdvanced ? styles.apiKeyChevronOpen : ''}`}>▶</span>
        </button>
        {showAdvanced && (
          <div className={styles.apiKeyContent}>
            <div className={styles.settingsRow}>
              <label className={styles.settingsLabel}>Anthropic API Key (optional)</label>
              <p className={styles.apiKeyHint}>
                Paste your key for Claude-powered analysis. Leave blank to use a free model.
              </p>
              <input
                type="password"
                className={styles.apiKeyInput}
                placeholder="sk-ant-..."
                value={apiKeyInput}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                aria-label="Anthropic API key"
              />
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        className={styles.submitButton}
        disabled={isDisabled}
        onClick={handleSubmit}
      >
        {isSubmitting ? "Analyzing..." : "Continue"}
      </button>
    </div>
  );
}
