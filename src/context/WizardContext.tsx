import React, { createContext, useContext, useReducer } from "react";
import type {
  WizardState,
  WizardStep,
  ConsistencyReport,
  CascadeData,
  SummaryData,
  StepStatus,
} from "../types/index";

// --- Action Types ---

type WizardAction =
  | { type: "SUBMIT"; newsEvent: string; selectedSources: string[] }
  | { type: "RECEIVE_CONSISTENCY"; consistencyReport: ConsistencyReport }
  | { type: "CONFIRM_CONSISTENCY"; selectedFactIds: string[] }
  | { type: "RECEIVE_CASCADE"; cascadeData: CascadeData }
  | { type: "CONFIRM_CASCADE" }
  | { type: "RECEIVE_SUMMARY"; summaryData: SummaryData }
  | { type: "SET_ERROR"; error: string }
  | { type: "RETRY" }
  | { type: "NAVIGATE_TO"; step: WizardStep }
  | { type: "RESET" };

// --- Initial State ---

export const initialState: WizardState = {
  currentStep: -1,
  stepStatuses: ["idle", "idle", "idle", "idle"],
  newsEvent: "",
  selectedSources: [],
  selectedFactIds: [],
  consistencyReport: null,
  cascadeData: null,
  summaryData: null,
  error: null,
};

// --- Helpers ---

function setStepStatus(
  statuses: WizardState["stepStatuses"],
  index: number,
  status: StepStatus
): WizardState["stepStatuses"] {
  const copy: [StepStatus, StepStatus, StepStatus, StepStatus] = [...statuses];
  copy[index] = status;
  return copy;
}

// --- Reducer ---

export function wizardReducer(
  state: WizardState,
  action: WizardAction
): WizardState {
  switch (action.type) {
    case "SUBMIT": {
      let statuses = setStepStatus(state.stepStatuses, 0, "complete");
      statuses = setStepStatus(statuses, 1, "loading");
      return {
        ...state,
        newsEvent: action.newsEvent,
        selectedSources: action.selectedSources,
        selectedFactIds: [],
        stepStatuses: statuses,
        currentStep: 1,
        error: null,
        consistencyReport: null,
        cascadeData: null,
        summaryData: null,
      };
    }

    case "RECEIVE_CONSISTENCY": {
      // Don't auto-advance — wait for user to review and confirm
      const statuses = setStepStatus(state.stepStatuses, 1, "complete");
      return {
        ...state,
        consistencyReport: action.consistencyReport,
        stepStatuses: statuses,
        error: null,
      };
    }

    case "CONFIRM_CONSISTENCY": {
      // User confirmed fact selection — advance to cascade loading
      let statuses = setStepStatus(state.stepStatuses, 1, "complete");
      statuses = setStepStatus(statuses, 2, "loading");
      return {
        ...state,
        selectedFactIds: action.selectedFactIds,
        stepStatuses: statuses,
        currentStep: 2,
        error: null,
      };
    }

    case "RECEIVE_CASCADE": {
      // Don't auto-advance — wait for user to review and confirm
      const statuses = setStepStatus(state.stepStatuses, 2, "complete");
      return {
        ...state,
        cascadeData: action.cascadeData,
        stepStatuses: statuses,
        error: null,
      };
    }

    case "CONFIRM_CASCADE": {
      // User confirmed breakdown — advance to summary loading
      let statuses = setStepStatus(state.stepStatuses, 2, "complete");
      statuses = setStepStatus(statuses, 3, "loading");
      return {
        ...state,
        stepStatuses: statuses,
        currentStep: 3,
        error: null,
      };
    }

    case "RECEIVE_SUMMARY": {
      const statuses = setStepStatus(state.stepStatuses, 3, "complete");
      return {
        ...state,
        summaryData: action.summaryData,
        stepStatuses: statuses,
        error: null,
      };
    }

    case "SET_ERROR": {
      const statuses = setStepStatus(
        state.stepStatuses,
        state.currentStep,
        "error"
      );
      return {
        ...state,
        error: action.error,
        stepStatuses: statuses,
      };
    }

    case "RETRY": {
      const statuses = setStepStatus(
        state.stepStatuses,
        state.currentStep,
        "loading"
      );
      return {
        ...state,
        error: null,
        stepStatuses: statuses,
      };
    }

    case "NAVIGATE_TO": {
      const target = action.step;
      // Allow navigation to home
      if (target === -1) {
        return { ...state, currentStep: -1 };
      }
      // Allow navigation to step 0 from home
      if (state.currentStep === -1 && target === 0) {
        return { ...state, currentStep: 0 };
      }
      // Allow backward navigation to completed steps
      if (target < state.currentStep) {
        if (state.stepStatuses[target] === "complete" || target === 0) {
          return { ...state, currentStep: target };
        }
        return state;
      }
      // Allow navigation to current step (no-op effectively)
      if (target === state.currentStep) {
        return state;
      }
      // Block forward navigation to incomplete steps
      if (state.stepStatuses[target] !== "complete") {
        return state;
      }
      return { ...state, currentStep: target };
    }

    case "RESET": {
      // Reset all state but go to step 0 (input page) instead of homepage
      return { ...initialState, currentStep: 0 };
    }

    default:
      return state;
  }
}

// --- Context ---

interface WizardContextValue {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}

const WizardContext = createContext<WizardContextValue | null>(null);

// --- Provider ---

export function WizardProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(wizardReducer, initialState);

  return (
    <WizardContext.Provider value={{ state, dispatch }}>
      {children}
    </WizardContext.Provider>
  );
}

// --- Hook ---

export function useWizard(): WizardContextValue {
  const ctx = useContext(WizardContext);
  if (!ctx) {
    throw new Error("useWizard must be used within a WizardProvider");
  }
  return ctx;
}
