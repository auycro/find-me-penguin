import { describe, expect, it } from "vitest";
import { flowReducer, initialFlow, type FlowState, type JobResult } from "./flow";

const result: JobResult = { count: 3, points: [], width: 100, height: 100 };
const run = (...actions: Parameters<typeof flowReducer>[1][]): FlowState =>
  actions.reduce(flowReducer, initialFlow);

describe("flowReducer", () => {
  it("goes upload -> counting -> result", () => {
    const s = run({ type: "start", id: 1, previewUrl: "blob:a" }, { type: "finished", id: 1, result });
    expect(s.view).toBe("result");
    expect(s.job).toMatchObject({ status: "done", result });
  });

  it("goes to the error view when counting fails", () => {
    const s = run({ type: "start", id: 1, previewUrl: "blob:a" }, { type: "failed", id: 1, error: "model_error" });
    expect(s.view).toBe("error");
    expect(s.job?.error).toBe("model_error");
  });

  it("keeps counting in the background without changing the view when it finishes", () => {
    let s = run({ type: "start", id: 1, previewUrl: "blob:a" }, { type: "background" });
    expect(s.view).toBe("upload");
    expect(s.job?.status).toBe("running");

    s = flowReducer(s, { type: "finished", id: 1, result });
    expect(s.view).toBe("upload"); // stays put; the banner offers "view result"
    expect(s.job?.status).toBe("done");

    s = flowReducer(s, { type: "openJob" });
    expect(s.view).toBe("result");
  });

  it("opens a background failure as the error view", () => {
    let s = run(
      { type: "start", id: 1, previewUrl: "blob:a" },
      { type: "background" },
      { type: "failed", id: 1, error: "rate_limited" },
    );
    expect(s.view).toBe("upload");
    s = flowReducer(s, { type: "openJob" });
    expect(s.view).toBe("error");
  });

  it("returns to the counting view when opening a job that is still running", () => {
    const s = run({ type: "start", id: 1, previewUrl: "blob:a" }, { type: "background" }, { type: "openJob" });
    expect(s.view).toBe("counting");
  });

  it("ignores results for a cancelled or replaced job", () => {
    const afterCancel = run(
      { type: "start", id: 1, previewUrl: "blob:a" },
      { type: "reset" },
      { type: "finished", id: 1, result },
    );
    expect(afterCancel).toEqual(initialFlow);

    const replaced = run(
      { type: "start", id: 1, previewUrl: "blob:a" },
      { type: "start", id: 2, previewUrl: "blob:b" },
      { type: "finished", id: 1, result },
    );
    expect(replaced.job).toMatchObject({ id: 2, status: "running" });
    expect(replaced.view).toBe("counting");
  });

  it("only moves to the upload view on background from the counting view", () => {
    const s = run({ type: "start", id: 1, previewUrl: "blob:a" }, { type: "finished", id: 1, result }, { type: "background" });
    expect(s.view).toBe("result");
  });

  it("records pick errors and clears them on the next start or reset", () => {
    let s = run({ type: "pickRejected", error: "unsupported" });
    expect(s.pickError).toBe("unsupported");
    s = flowReducer(s, { type: "start", id: 1, previewUrl: "blob:a" });
    expect(s.pickError).toBeNull();
    s = flowReducer(run({ type: "pickRejected", error: "empty" }), { type: "reset" });
    expect(s.pickError).toBeNull();
  });
});
