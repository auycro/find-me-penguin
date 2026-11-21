import type { ErrorKey } from "./i18n";
import type { Point } from "./schema";

export type JobResult = { count: number; points: Point[]; width: number; height: number };

export type Job = {
  id: number;
  previewUrl: string;
  status: "running" | "done" | "failed";
  result?: JobResult;
  error?: ErrorKey;
};

export type View = "upload" | "counting" | "result" | "error";

export type FlowState = {
  view: View;
  job: Job | null;
  /** Problem with the picked file, shown on the upload screen. */
  pickError: ErrorKey | null;
};

export type FlowAction =
  | { type: "start"; id: number; previewUrl: string }
  | { type: "pickRejected"; error: ErrorKey }
  | { type: "background" }
  | { type: "finished"; id: number; result: JobResult }
  | { type: "failed"; id: number; error: ErrorKey }
  | { type: "openJob" }
  | { type: "reset" };

export const initialFlow: FlowState = { view: "upload", job: null, pickError: null };

export function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case "start":
      return {
        view: "counting",
        pickError: null,
        job: { id: action.id, previewUrl: action.previewUrl, status: "running" },
      };

    case "pickRejected":
      return { ...state, pickError: action.error };

    case "background":
      return state.view === "counting" ? { ...state, view: "upload" } : state;

    case "finished": {
      // Ignore results from a job the user already cancelled or replaced.
      if (!state.job || state.job.id !== action.id) return state;
      const job: Job = { ...state.job, status: "done", result: action.result };
      return { ...state, job, view: state.view === "counting" ? "result" : state.view };
    }

    case "failed": {
      if (!state.job || state.job.id !== action.id) return state;
      const job: Job = { ...state.job, status: "failed", error: action.error };
      return { ...state, job, view: state.view === "counting" ? "error" : state.view };
    }

    case "openJob": {
      if (!state.job) return state;
      if (state.job.status === "done") return { ...state, view: "result" };
      if (state.job.status === "failed") return { ...state, view: "error" };
      return { ...state, view: "counting" };
    }

    case "reset":
      return initialFlow;
  }
}
