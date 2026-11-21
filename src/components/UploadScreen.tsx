"use client";

import { useRef, useState, type DragEvent } from "react";
import type { Job } from "@/lib/flow";
import { errorMessage, type ErrorKey } from "@/lib/i18n";
import { Header } from "./Header";
import { useLocale } from "./LocaleProvider";
import { Mascot } from "./Mascot";

type Props = {
  job: Job | null;
  pickError: ErrorKey | null;
  preparing: boolean;
  onFile: (file: File) => void;
  onOpenJob: () => void;
};

export function UploadScreen({ job, pickError, preparing, onFile, onOpenJob }: Props) {
  const { m } = useLocale();
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const choose = (file: File | undefined) => {
    if (file) onFile(file);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    choose(e.dataTransfer.files[0]);
  };

  return (
    <div className="flex flex-1 flex-col gap-6">
      <Header />

      {job && (
        <button
          type="button"
          onClick={onOpenJob}
          disabled={job.status === "running"}
          className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold ${
            job.status === "done" ? "bg-lime text-on-lime" : "border border-line bg-surface"
          }`}
        >
          {job.status === "running" && <span className="spinner text-lime" aria-hidden="true" />}
          <span role="status">
            {job.status === "running" ? m.bgCounting : job.status === "done" ? m.bgDone : m.bgFailed}
          </span>
        </button>
      )}

      <div>
        <p className="text-sm font-bold text-lime" lang="ja">
          {m.brandJa}
        </p>
        <h1 className="font-display mt-1 text-5xl leading-[0.95] tracking-tight">{m.headline}</h1>
        <p className="mt-3 text-base text-muted">{m.headlineSub}</p>
      </div>

      <button
        type="button"
        onClick={() => libraryRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        disabled={preparing}
        className={`flex flex-1 flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed px-4 py-8 transition-colors ${
          dragging ? "border-lime bg-surface" : "border-line"
        }`}
        style={{ minHeight: "14rem" }}
      >
        <span className="grid size-36 place-items-center rounded-full bg-lime">
          <Mascot variant={preparing ? "searching" : "idle"} className="w-28" />
        </span>
        <span className="font-bold">{preparing ? m.preparing : m.dropTitle}</span>
        <span className="text-xs text-muted">{m.dropFormats}</span>
      </button>

      {pickError && (
        <p role="alert" className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm">
          {errorMessage(m, pickError)}
        </p>
      )}

      <div className="flex flex-col gap-3">
        <button type="button" className="btn btn-primary" disabled={preparing} onClick={() => cameraRef.current?.click()}>
          <CameraIcon /> {m.takePhoto}
        </button>
        <button type="button" className="btn btn-ghost" disabled={preparing} onClick={() => libraryRef.current?.click()}>
          <ImageIcon /> {m.chooseLibrary}
        </button>
      </div>

      <div className="text-center text-xs text-muted">
        <p>{m.tip}</p>
        <p className="mt-2">{m.privacy}</p>
      </div>

      {/* Plain file inputs: the camera one asks phones for the rear camera. */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          choose(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={libraryRef}
        type="file"
        accept="image/*,.heic,.heif"
        hidden
        onChange={(e) => {
          choose(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function CameraIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="m5 18 5-5 3 3 2-2 4 4" />
    </svg>
  );
}
