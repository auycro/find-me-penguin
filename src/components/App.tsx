"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { countView } from "@/lib/crowd";
import { CountClientError, requestCount } from "@/lib/count-client";
import { flowReducer, initialFlow } from "@/lib/flow";
import type { ErrorKey } from "@/lib/i18n";
import { prepareImageForUpload } from "@/lib/browser-image";
import { ImageError } from "@/lib/image-pipeline";
import { CountingScreen } from "./CountingScreen";
import { ErrorScreen } from "./ErrorScreen";
import { LocaleProvider } from "./LocaleProvider";
import { ResultScreen } from "./ResultScreen";
import { UploadScreen } from "./UploadScreen";

/** Keep the animation on screen long enough to read, even when the answer is instant. */
const MIN_COUNTING_MS = 2200;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function isAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

function Inner() {
  const [state, dispatch] = useReducer(flowReducer, initialFlow);
  const [preparing, setPreparing] = useState(false);
  const jobCounter = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  // When the screen changes, move focus to its heading so screen readers announce it
  // and keyboard users start at the top of the new content. Skipped on first load.
  const lastView = useRef(state.view);
  useEffect(() => {
    if (lastView.current === state.view) return;
    lastView.current = state.view;
    document.querySelector<HTMLElement>("main h1")?.focus({ preventScroll: false });
  }, [state.view]);

  // Free the preview image when a job is replaced or cleared.
  const previewUrl = state.job?.previewUrl;
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function handleFile(file: File) {
    if (preparing) return;
    setPreparing(true);

    let prepared;
    try {
      prepared = await prepareImageForUpload(file);
    } catch (err) {
      setPreparing(false);
      dispatch({ type: "pickRejected", error: err instanceof ImageError ? err.code : "unsupported" });
      return;
    }
    setPreparing(false);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const id = ++jobCounter.current;
    dispatch({ type: "start", id, previewUrl: URL.createObjectURL(prepared.blob) });

    const startedAt = Date.now();
    try {
      const res = await requestCount(prepared.blob, { signal: controller.signal });
      await sleep(Math.max(0, MIN_COUNTING_MS - (Date.now() - startedAt)));
      if (controller.signal.aborted) return;
      dispatch({
        type: "finished",
        id,
        result: { count: res.count, points: res.points, width: prepared.width, height: prepared.height },
      });
    } catch (err) {
      if (isAbort(err) || controller.signal.aborted) return;
      const error: ErrorKey = err instanceof CountClientError ? err.code : "model_error";
      dispatch({ type: "failed", id, error });
    }
  }

  function reset() {
    abortRef.current?.abort();
    abortRef.current = null;
    dispatch({ type: "reset" });
  }

  const { view, job } = state;
  const snow = view === "result" && job?.result ? countView(job.result.count).kind === "zero" : false;

  return (
    <div className={`app ${snow ? "theme-snow" : ""}`}>
      <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))]">
        {view === "upload" && (
          <UploadScreen
            job={job}
            pickError={state.pickError}
            preparing={preparing}
            onFile={handleFile}
            onOpenJob={() => dispatch({ type: "openJob" })}
          />
        )}
        {view === "counting" && job && (
          <CountingScreen previewUrl={job.previewUrl} onCancel={reset} onBackground={() => dispatch({ type: "background" })} />
        )}
        {view === "result" && job?.result && <ResultScreen job={job} onClose={reset} onAgain={reset} />}
        {view === "error" && job?.error && <ErrorScreen error={job.error} onAgain={reset} />}
      </main>
    </div>
  );
}

export function App() {
  return (
    <LocaleProvider>
      <Inner />
    </LocaleProvider>
  );
}
