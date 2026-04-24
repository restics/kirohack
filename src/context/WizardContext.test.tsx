import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import React from "react";
import { wizardReducer, initialState, WizardProvider, useWizard } from "./WizardContext";
import type { WizardState } from "../types/index";

describe("wizardReducer", () => {
  it("has correct initial state", () => {
    expect(initialState).toEqual({
      currentStep: 0,
      stepStatuses: ["idle", "idle", "idle", "idle"],
      newsEvent: "",
      selectedSources: [],
      consistencyReport: null,
      cascadeData: null,
      summaryData: null,
      error: null,
    });
  });

  describe("SUBMIT", () => {
    it("sets newsEvent, selectedSources, advances to step 1, marks step 0 complete and step 1 loading", () => {
      const result = wizardReducer(initialState, {
        type: "SUBMIT",
        newsEvent: "US tariff on coffee",
        selectedSources: ["NYT", "Reuters"],
      });
      expect(result.newsEvent).toBe("US tariff on coffee");
      expect(result.selectedSources).toEqual(["NYT", "Reuters"]);
      expect(result.currentStep).toBe(1);
      expect(result.stepStatuses[0]).toBe("complete");
      expect(result.stepStatuses[1]).toBe("loading");
      expect(result.error).toBeNull();
      expect(result.consistencyReport).toBeNull();
      expect(result.cascadeData).toBeNull();
      expect(result.summaryData).toBeNull();
    });
  });

  describe("RECEIVE_CONSISTENCY", () => {
    it("sets consistencyReport, marks step 1 complete, step 2 loading, auto-advances to step 2", () => {
      const state: WizardState = {
        ...initialState,
        currentStep: 1,
        stepStatuses: ["complete", "loading", "idle", "idle"],
      };
      const report = { unknown_percentage: 5, no_sources_found: false, facts: [] };
      const result = wizardReducer(state, {
        type: "RECEIVE_CONSISTENCY",
        consistencyReport: report,
      });
      expect(result.consistencyReport).toBe(report);
      expect(result.currentStep).toBe(2);
      expect(result.stepStatuses[1]).toBe("complete");
      expect(result.stepStatuses[2]).toBe("loading");
      expect(result.error).toBeNull();
    });
  });

  describe("RECEIVE_CASCADE", () => {
    it("sets cascadeData, marks step 2 complete, step 3 loading, auto-advances to step 3", () => {
      const state: WizardState = {
        ...initialState,
        currentStep: 2,
        stepStatuses: ["complete", "complete", "loading", "idle"],
      };
      const cascade = { sectors: [] };
      const result = wizardReducer(state, {
        type: "RECEIVE_CASCADE",
        cascadeData: cascade,
      });
      expect(result.cascadeData).toBe(cascade);
      expect(result.currentStep).toBe(3);
      expect(result.stepStatuses[2]).toBe("complete");
      expect(result.stepStatuses[3]).toBe("loading");
    });
  });

  describe("RECEIVE_SUMMARY", () => {
    it("sets summaryData, marks step 3 complete, does not change currentStep", () => {
      const state: WizardState = {
        ...initialState,
        currentStep: 3,
        stepStatuses: ["complete", "complete", "complete", "loading"],
      };
      const summary = { sectors: [], hidden_factors_summary: [], narrative_summary: "done" };
      const result = wizardReducer(state, {
        type: "RECEIVE_SUMMARY",
        summaryData: summary,
      });
      expect(result.summaryData).toBe(summary);
      expect(result.stepStatuses[3]).toBe("complete");
      expect(result.currentStep).toBe(3);
    });
  });

  describe("SET_ERROR", () => {
    it("sets error and marks current step as error", () => {
      const state: WizardState = {
        ...initialState,
        currentStep: 2,
        stepStatuses: ["complete", "complete", "loading", "idle"],
      };
      const result = wizardReducer(state, {
        type: "SET_ERROR",
        error: "Network failure",
      });
      expect(result.error).toBe("Network failure");
      expect(result.stepStatuses[2]).toBe("error");
    });
  });

  describe("RETRY", () => {
    it("clears error and sets current step back to loading", () => {
      const state: WizardState = {
        ...initialState,
        currentStep: 2,
        stepStatuses: ["complete", "complete", "error", "idle"],
        error: "Network failure",
      };
      const result = wizardReducer(state, { type: "RETRY" });
      expect(result.error).toBeNull();
      expect(result.stepStatuses[2]).toBe("loading");
    });
  });

  describe("NAVIGATE_TO", () => {
    it("allows backward navigation to a completed step", () => {
      const state: WizardState = {
        ...initialState,
        currentStep: 3,
        stepStatuses: ["complete", "complete", "complete", "loading"],
      };
      const result = wizardReducer(state, { type: "NAVIGATE_TO", step: 1 });
      expect(result.currentStep).toBe(1);
    });

    it("blocks backward navigation to a non-complete step", () => {
      const state: WizardState = {
        ...initialState,
        currentStep: 2,
        stepStatuses: ["complete", "idle", "loading", "idle"],
      };
      const result = wizardReducer(state, { type: "NAVIGATE_TO", step: 1 });
      expect(result.currentStep).toBe(2); // unchanged
    });

    it("blocks forward navigation to an incomplete step", () => {
      const state: WizardState = {
        ...initialState,
        currentStep: 1,
        stepStatuses: ["complete", "loading", "idle", "idle"],
      };
      const result = wizardReducer(state, { type: "NAVIGATE_TO", step: 3 });
      expect(result.currentStep).toBe(1); // unchanged
    });

    it("allows forward navigation to a completed step", () => {
      const state: WizardState = {
        ...initialState,
        currentStep: 0,
        stepStatuses: ["complete", "complete", "complete", "idle"],
      };
      const result = wizardReducer(state, { type: "NAVIGATE_TO", step: 2 });
      expect(result.currentStep).toBe(2);
    });

    it("is a no-op when navigating to the current step", () => {
      const state: WizardState = {
        ...initialState,
        currentStep: 2,
        stepStatuses: ["complete", "complete", "loading", "idle"],
      };
      const result = wizardReducer(state, { type: "NAVIGATE_TO", step: 2 });
      expect(result).toBe(state); // same reference
    });
  });
});

describe("useWizard", () => {
  it("throws when used outside WizardProvider", () => {
    expect(() => {
      renderHook(() => useWizard());
    }).toThrow("useWizard must be used within a WizardProvider");
  });

  it("returns state and dispatch when used inside WizardProvider", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <WizardProvider>{children}</WizardProvider>
    );
    const { result } = renderHook(() => useWizard(), { wrapper });
    expect(result.current.state).toEqual(initialState);
    expect(typeof result.current.dispatch).toBe("function");
  });
});
