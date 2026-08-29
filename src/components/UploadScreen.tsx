"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Database, Upload, FileText, AlertTriangle, RefreshCw, Info, Plus, X, BookOpen, Check } from "lucide-react";
import type { GraphData } from "@/lib/types";
import { isGraphData, readErrorResponse } from "@/lib/parseResponse";
import { MAX_UPLOAD_MB, MAX_UPLOAD_BYTES } from "@/lib/uploadLimits";
import { TranslateFn } from "@/lib/i18n";
import { deriveLabelFromFilename } from "@/lib/labels";
import { PRESET_DOCUMENTS } from "@/lib/presetCorpus";

const MIN_SLOTS = 2;
const MAX_SLOTS = 12;

interface SlotState {
  file: File | null;
  label: string;
  labelTouched: boolean;
  error: string | null;
}

function emptySlot(): SlotState {
  return { file: null, label: "", labelTouched: false, error: null };
}

interface UploadScreenProps {
  /**
   * `presetIds` is present only for a preset run, and it is what makes the resulting
   * analysis addressable: the bundled PDFs ship with the deployment, so a URL naming their
   * ids can rebuild the same corpus. A hand-uploaded corpus has nowhere to persist to and
   * passes none, which the caller reads as "this analysis has no shareable link".
   */
  onSuccess: (data: GraphData, presetIds?: string[]) => void;
  t: TranslateFn;
}

interface FileSlotProps {
  file: File | null;
  error: string | null;
  label: string;
  dropZoneText: string;
  onFile: (file: File) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  disabled?: boolean;
  onDropExtras: (fileCount: number) => void;
}

function FileSlot({ file, error, label, dropZoneText, onFile, inputRef, disabled, onDropExtras }: FileSlotProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;
    const files = e.dataTransfer.files;
    onDropExtras(files.length);
    const dropped = files[0];
    if (dropped) onFile(dropped);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const selected = e.target.files?.[0];
    if (selected) onFile(selected);
    // Reset so the same file can be re-selected after an error
    e.target.value = "";
  };

  const handleClick = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
        {label}
      </span>

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-disabled={disabled}
        onClick={handleClick}
        onKeyDown={(e) => { if (disabled) return; if (e.key === "Enter" || e.key === " ") handleClick(); }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          flex flex-col items-center justify-center gap-2.5 p-6 rounded-xl border-2 border-dashed
          transition-all duration-200 min-h-[140px] select-none
          ${disabled
            ? "opacity-50 cursor-not-allowed pointer-events-none border-slate-200 bg-slate-50"
            : "cursor-pointer"
          }
          ${!disabled && isDragging
            ? "border-sky-500 bg-sky-50/60"
            : !disabled && file && !error
              ? "border-emerald-400 bg-emerald-50/40"
              : !disabled && error
                ? "border-rose-400 bg-rose-50/40"
                : !disabled
                  ? "border-slate-200 bg-slate-50/40 hover:border-slate-400 hover:bg-slate-50"
                  : ""
          }
        `}
      >
        {file && !error ? (
          <>
            <FileText className="w-7 h-7 text-emerald-700" />
            <span className="text-sm font-medium text-slate-800 text-center break-all">
              {file.name}
            </span>
            <span className="text-xs text-slate-400">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </span>
          </>
        ) : (
          <>
            <Upload className={`w-7 h-7 ${error ? "text-rose-600" : "text-slate-400"}`} />
            <span className={`text-sm text-center leading-snug ${error ? "text-rose-600" : "text-slate-500"}`}>
              {dropZoneText}
            </span>
          </>
        )}
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-rose-600">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={handleInputChange}
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
}

export function UploadScreen({
  onSuccess,
  t,
}: UploadScreenProps) {
  const [mode, setMode] = useState<"bulk" | "individual">("bulk");
  const [slots, setSlots] = useState<SlotState[]>([emptySlot(), emptySlot()]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errorReport, setErrorReport] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [multiDropNotice, setMultiDropNotice] = useState<string | null>(null);
  const [isContainerDragging, setIsContainerDragging] = useState(false);
  const [selectedPresetIds, setSelectedPresetIds] = useState<string[]>(["eu-1224-2009", "eu-2023-2842"]);
  const [presetFilter, setPresetFilter] = useState<"all" | "eu" | "bek" | "lov">("all");

  const togglePreset = (id: string) => {
    setSelectedPresetIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const selectAllPresets = () => {
    setSelectedPresetIds(PRESET_DOCUMENTS.map((d) => d.id));
  };

  const clearAllPresets = () => {
    setSelectedPresetIds([]);
  };

  const handleAnalyzePresets = async () => {
    if (loading || selectedPresetIds.length < 2) return;
    setSubmitError(null);
    setErrorReport(null);
    setCopied(false);
    setLoading(true);

    try {
      // Only the ids go over the wire. The corpus PDFs ship with the deployment, so
      // downloading them into the browser and posting the bytes back cost a multi-megabyte
      // request that the platform's body limit rejected before the route ever saw it.
      // The route reads them from disk and knows their authoritative EU/national type.
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presetIds: selectedPresetIds }),
      });
      if (!res.ok) {
        const { message, parsedBody } = await readErrorResponse(res, t);
        setSubmitError(message);
        setErrorReport(
          JSON.stringify(
            {
              timestamp: new Date().toISOString(),
              presetIds: selectedPresetIds,
              httpStatus: res.status,
              responseBody: parsedBody,
            },
            null,
            2
          )
        );
        setLoading(false);
        return;
      }

      // The body is JSON from a route that can also return an error object, so the
      // GraphData type is an assertion until it is checked.
      const graphData: unknown = await res.json();
      if (!isGraphData(graphData)) {
        console.error("Preset analysis returned a malformed graph:", graphData);
        setSubmitError(t("malformedResponseError"));
        setLoading(false);
        return;
      }
      onSuccess(graphData, selectedPresetIds);
    } catch (err: unknown) {
      console.error("Preset analysis failed:", err);
      // Surface the actual failure. A preset run can fail because a bundled corpus PDF is
      // missing or the network dropped, and a bare "unknown error" gives the demo operator
      // nothing to act on.
      setSubmitError(err instanceof Error && err.message ? err.message : t("unknownError"));
      setLoading(false);
    }
  };

  const inputRefsRef = useRef<Map<number, React.RefObject<HTMLInputElement | null>>>(new Map());
  const labelInputRefsRef = useRef<Map<number, HTMLInputElement | null>>(new Map());
  const autoTriggerArmedRef = useRef(false);
  const pendingFocusIndexRef = useRef<number | null>(null);

  const getInputRef = (index: number): React.RefObject<HTMLInputElement | null> => {
    if (!inputRefsRef.current.has(index)) {
      inputRefsRef.current.set(index, React.createRef<HTMLInputElement | null>());
    }
    return inputRefsRef.current.get(index)!;
  };

  // Focuses a slot's label input right after it's added via "+ Add document", so keyboard
  // users don't lose their place. Only fires for adds, slots.length is a coarse trigger,
  // but pendingFocusIndexRef being null after every other mutation path keeps this a no-op
  // for file drops, removals, and mode toggles.
  useEffect(() => {
    if (pendingFocusIndexRef.current === null) return;
    const index = pendingFocusIndexRef.current;
    pendingFocusIndexRef.current = null;
    labelInputRefsRef.current.get(index)?.focus();
  }, [slots.length]);

  // Derived (not effect-driven) so it's always in sync with slots in the same
  // render, the auto-trigger effect below reads it in that same render.
  const combinedSize = slots.reduce((sum, s) => sum + (s.file?.size ?? 0), 0);
  const sizeError =
    combinedSize > MAX_UPLOAD_BYTES
      ? t("sizeLimitError").replace("{max}", String(MAX_UPLOAD_MB))
      : null;

  const isSameFile = (a: File | null, b: File) =>
    a !== null && a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;

  const handleSlotFile = (index: number, file: File) => {
    if (loading) return;
    if (file.type !== "application/pdf") {
      setSlots(prev => prev.map((s, i) => i === index ? { ...s, error: t("invalidPdfError"), file: null } : s));
      return;
    }
    setSlots(prev => {
      const next = prev.map((s, i) => {
        if (i !== index) return s;
        const isNewFile = !isSameFile(s.file, file);
        if (isNewFile) {
          return { file, error: null, label: deriveLabelFromFilename(file.name), labelTouched: false };
        }
        return { ...s, file, error: null, label: s.labelTouched ? s.label : deriveLabelFromFilename(file.name) };
      });
      if (next.filter(s => s.file !== null).length >= 2) {
        autoTriggerArmedRef.current = true;
      }
      return next;
    });
  };

  const handleLabelChange = (index: number, value: string) => {
    autoTriggerArmedRef.current = false;
    setSlots(prev => prev.map((s, i) => i === index ? { ...s, label: value, labelTouched: true } : s));
  };

  const handleAddSlot = () => {
    if (loading || slots.length >= MAX_SLOTS) return;
    autoTriggerArmedRef.current = false;
    pendingFocusIndexRef.current = slots.length;
    setSlots(prev => [...prev, emptySlot()]);
  };

  const handleRemoveSlot = (index: number) => {
    if (loading || slots.length <= MIN_SLOTS) return;
    autoTriggerArmedRef.current = false;
    setSlots(prev => prev.filter((_, i) => i !== index));
  };

  // Switching to Bulk drops any lingering empty slots (e.g. an unfilled "+ Add document"
  // slot from Individual mode) so Bulk's single-box view, which only ever renders filled
  // slots, can't have an invisible empty slot silently blocking canSubmit. Switching to
  // Individual pads back up to MIN_SLOTS so it keeps showing its classic 2-box minimum.
  const handleModeToggle = (next: "bulk" | "individual") => {
    if (loading) return;
    autoTriggerArmedRef.current = false;
    setSlots(prev => {
      if (next === "bulk") return prev.filter(s => s.file !== null);
      if (prev.length >= MIN_SLOTS) return prev;
      return [...prev, ...Array.from({ length: MIN_SLOTS - prev.length }, emptySlot)];
    });
    setMode(next);
  };

  const handleContainerDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (loading) return;
    setIsContainerDragging(true);
  };

  const handleContainerDragLeave = () => {
    setIsContainerDragging(false);
  };

  // Shared by both FileSlots: a drop landing directly on a slot still needs to
  // settle the container's transient state (drag highlight, stale multi-drop
  // notice) since FileSlot.handleDrop stops the event from bubbling there.
  const handleSlotDropExtras = (fileCount: number) => {
    setIsContainerDragging(false);
    setMultiDropNotice(fileCount > 1 ? t("multiDropNonPdfIgnored") : null);
  };

  // Bulk assignment (shared by container drop and the bulk box's multi-file browse input):
  // fill existing empty slots first (in drop order), then append any remaining PDFs as new
  // slots up to MAX_SLOTS. Existing filled slots are never overwritten or reordered.
  const assignFiles = (files: File[]) => {
    if (files.length === 0) return;

    const pdfFiles = files.filter((f) => f.type === "application/pdf");

    if (pdfFiles.length === 0) {
      setMultiDropNotice(t("invalidPdfError"));
      return;
    }

    setSlots(prev => {
      const next = [...prev];
      let capped = false;
      let pdfIndex = 0;

      for (let i = 0; i < next.length && pdfIndex < pdfFiles.length; i++) {
        if (next[i].file === null) {
          const f = pdfFiles[pdfIndex++];
          next[i] = { file: f, error: null, label: deriveLabelFromFilename(f.name), labelTouched: false };
        }
      }

      while (pdfIndex < pdfFiles.length) {
        if (next.length >= MAX_SLOTS) {
          capped = true;
          break;
        }
        const f = pdfFiles[pdfIndex++];
        next.push({ file: f, error: null, label: deriveLabelFromFilename(f.name), labelTouched: false });
      }

      const usedCount = next.filter(s => s.file !== null).length - prev.filter(s => s.file !== null).length;
      if (capped) {
        setMultiDropNotice(t("multiDropCapReached").replace("{max}", String(MAX_SLOTS)));
      } else if (pdfFiles.length < files.length) {
        setMultiDropNotice(t("multiDropNonPdfIgnored"));
      } else {
        setMultiDropNotice(null);
      }

      if (usedCount > 0 && next.filter(s => s.file !== null).length >= 2) {
        autoTriggerArmedRef.current = true;
      }

      return next;
    });
  };

  const handleContainerDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsContainerDragging(false);
    if (loading) return;
    assignFiles(Array.from(e.dataTransfer.files));
  };

  const bulkFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleBulkFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (loading) return;
    assignFiles(Array.from(e.target.files ?? []));
    // Reset so selecting the exact same file(s) again still fires a change event.
    e.target.value = "";
  };

  const openBulkFileBrowser = () => {
    if (loading) return;
    bulkFileInputRef.current?.click();
  };

  const canSubmit =
    slots.length >= MIN_SLOTS &&
    slots.every(s => s.file !== null && s.label.trim().length >= 1) &&
    !sizeError &&
    !loading;

  // Auto-fire the analysis once the slot array completes a valid set for the first time.
  // `runAnalysis` is intentionally omitted from deps: it's redefined every render and
  // isn't itself the trigger condition, including it would re-run this effect on every
  // keystroke/render without changing when armedRef is actually set.
  useEffect(() => {
    if (autoTriggerArmedRef.current && canSubmit) {
      autoTriggerArmedRef.current = false;
      void runAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots, sizeError, loading]);

  const runAnalysis = async () => {
    if (!canSubmit) return;

    setSubmitError(null);
    setErrorReport(null);
    setCopied(false);
    setLoading(true);

    const buildReport = (extra: Record<string, unknown>) =>
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent,
          files: slots.map(s => s.file && { name: s.file.name, size: s.file.size, type: s.file.type }),
          ...extra,
        },
        null,
        2
      );

    try {
      const fd = new FormData();
      slots.forEach((s, i) => {
        if (!s.file) return;
        fd.append(`pdf${i}`, s.file);
        fd.append(`label${i}`, s.label.trim());
      });

      const res = await fetch("/api/parse", { method: "POST", body: fd });

      if (!res.ok) {
        const { message, parsedBody } = await readErrorResponse(res, t);
        console.error("Upload failed:", res.status, parsedBody);
        setSubmitError(message);
        setErrorReport(
          buildReport({
            httpStatus: res.status,
            httpStatusText: res.statusText,
            responseBody: parsedBody,
          })
        );
        setLoading(false);
        return;
      }

      const graphData: unknown = await res.json();
      if (!isGraphData(graphData)) {
        console.error("Upload returned a malformed graph:", graphData);
        setSubmitError(t("malformedResponseError"));
        setErrorReport(buildReport({ httpStatus: res.status, responseBody: graphData }));
        setLoading(false);
        return;
      }
      onSuccess(graphData);
    } catch (err: unknown) {
      console.error("Upload failed:", err);
      setSubmitError(t("unknownError"));
      setErrorReport(
        buildReport({
          clientError: {
            name: err instanceof Error ? err.name : "UnknownError",
            message: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined,
          },
        })
      );
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runAnalysis();
  };

  const handleCopyReport = async () => {
    if (!errorReport) return;
    await navigator.clipboard.writeText(errorReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const slotLabel = (index: number) => `${t("docFallback")} ${index + 1}`;

  return (
    <div className="flex flex-col min-h-screen bg-[#fafaf9] text-slate-900 font-sans antialiased">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5 text-sky-700" />
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-900">
              {t("appTitle")}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* About link */}
          <Link
            href="/about"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 border border-slate-200 hover:text-slate-900 hover:bg-slate-50 transition-all duration-200 shadow-xs"
          >
            <Info className="w-3.5 h-3.5" />
            {t("aboutButton")}
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-2xl">
          {/* Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-8 sm:p-10 shadow-sm">
            {/* Title block */}
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                {t("uploadTitle")}
              </h2>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
                {t("uploadSubtitle")}
              </p>
            </div>

            {/* Preset Regulatory Library Section */}
            <div className="mb-6 p-5 rounded-xl bg-slate-50/70 border border-slate-200/90 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-sky-800 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-sky-700" /> {t("presetLibraryTitle")}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t("presetLibrarySubtitle")}
                  </p>
                </div>
                {selectedPresetIds.length > 0 && (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-900 border border-sky-200">
                    {t("selectedPresetCount").replace("{count}", String(selectedPresetIds.length))}
                  </span>
                )}
              </div>

              {/* Category Filter Pills & Selection helpers */}
              <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px] font-medium">
                  <button
                    type="button"
                    onClick={() => setPresetFilter("all")}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      presetFilter === "all" ? "bg-white text-slate-900 font-semibold shadow-xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {"Alle"} ({PRESET_DOCUMENTS.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetFilter("eu")}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      presetFilter === "eu" ? "bg-white text-slate-900 font-semibold shadow-xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    EU ({PRESET_DOCUMENTS.filter(d => d.type === "eu").length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetFilter("bek")}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      presetFilter === "bek" ? "bg-white text-slate-900 font-semibold shadow-xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {"Bekendtgørelser"} ({PRESET_DOCUMENTS.filter(d => d.type === "bek").length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetFilter("lov")}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      presetFilter === "lov" ? "bg-white text-slate-900 font-semibold shadow-xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {"Love"} ({PRESET_DOCUMENTS.filter(d => d.type === "lov").length})
                  </button>
                </div>

                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={selectAllPresets}
                    className="text-sky-700 hover:text-sky-900 font-medium hover:underline cursor-pointer"
                  >
                    {"Vælg alle"}
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={clearAllPresets}
                    className="text-slate-500 hover:text-slate-800 font-medium hover:underline cursor-pointer"
                  >
                    {"Ryd"}
                  </button>
                </div>
              </div>

              {/* Grid of Preset Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                {PRESET_DOCUMENTS.filter(doc => presetFilter === "all" || doc.type === presetFilter).map((doc) => {
                  const isSelected = selectedPresetIds.includes(doc.id);
                  const isEu = doc.type === "eu";
                  return (
                    <div
                      key={doc.id}
                      data-testid={`preset-card-${doc.id}`}
                      onClick={() => !loading && togglePreset(doc.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                        isEu
                          ? isSelected
                            ? "bg-sky-50/80 border-sky-600 shadow-xs ring-1 ring-sky-500/30"
                            : "bg-white border-slate-300 hover:border-sky-400 hover:shadow-xs"
                          : isSelected
                          ? "bg-slate-100/90 border-slate-400 shadow-2xs"
                          : "bg-slate-50/50 border-slate-200/80 opacity-75 hover:opacity-100 hover:bg-white"
                      } ${loading ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className={`text-[10px] px-2 py-0.5 rounded ${
                            isEu 
                              ? "bg-sky-100 text-sky-900 border border-sky-300 font-bold" 
                              : "bg-slate-100 text-slate-500 border border-slate-200/90 font-medium"
                          }`}>
                            {doc.typeLabelDa}
                          </span>
                          <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                            isSelected 
                              ? isEu 
                                ? "bg-sky-700 border-sky-700 text-white" 
                                : "bg-slate-700 border-slate-700 text-white" 
                              : "border-slate-300 bg-white"
                          }`}>
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>
                        <h4 className={`text-xs font-bold ${isEu ? "text-slate-900" : "text-slate-700"}`}>
                          {doc.code}
                        </h4>
                        <p className={`text-xs mt-0.5 ${isEu ? "text-slate-700 font-semibold" : "text-slate-500 font-normal"}`}>
                          {doc.titleDa}
                        </p>
                      </div>
                      <p className={`text-[11px] mt-2 line-clamp-2 leading-relaxed ${isEu ? "text-slate-600" : "text-slate-400"}`}>
                        {doc.descriptionDa}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Preset Fast-Launch Button */}
              {selectedPresetIds.length >= 2 && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleAnalyzePresets}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      {t("analysing")}
                    </>
                  ) : (
                    <>
                      <Database className="w-3.5 h-3.5" />
                      {t("analyzePresets")} ({selectedPresetIds.length})
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="relative flex py-2 items-center mb-6">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-4 text-xs font-medium uppercase text-slate-400 tracking-wider">
                {"Eller upload egne PDF-filer"}
              </span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            {/* Mode Toggle */}
            <div className="flex justify-center mb-6">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "bulk"}
                  disabled={loading}
                  onClick={() => handleModeToggle("bulk")}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
                    mode === "bulk" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {t("uploadModeBulk")}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "individual"}
                  disabled={loading}
                  onClick={() => handleModeToggle("individual")}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
                    mode === "individual" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {t("uploadModeIndividual")}
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-6">
              {/* Multi-file drop notice */}
              {multiDropNotice && (
                <p className="flex items-center gap-1.5 text-xs text-amber-700">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {multiDropNotice}
                </p>
              )}

              {mode === "bulk" ? (
                (() => {
                  const filledCount = slots.filter(s => s.file !== null).length;
                  return (
                    <div
                      data-testid="upload-drop-zone"
                      role={filledCount === 0 ? "button" : undefined}
                      tabIndex={filledCount === 0 ? (loading ? -1 : 0) : undefined}
                      aria-label={filledCount === 0 ? t("dropZoneBulk") : undefined}
                      aria-disabled={filledCount === 0 ? loading : undefined}
                      onClick={filledCount === 0 ? openBulkFileBrowser : undefined}
                      onKeyDown={filledCount === 0 ? (e) => {
                        if (loading) return;
                        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openBulkFileBrowser(); }
                      } : undefined}
                      onDragOver={handleContainerDragOver}
                      onDragLeave={handleContainerDragLeave}
                      onDrop={handleContainerDrop}
                      className={`rounded-xl border-2 border-dashed transition-all duration-200 ${
                        filledCount === 0 ? "min-h-[140px] flex flex-col items-center justify-center gap-2.5 p-6 select-none" : "p-4"
                      } ${
                        isContainerDragging
                          ? "border-sky-500 bg-sky-50/50"
                          : filledCount === 0
                            ? `border-slate-300 bg-slate-50/50 ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-slate-400 hover:bg-slate-50"}`
                            : "border-slate-200"
                      }`}
                    >
                      {filledCount === 0 ? (
                        <>
                          <Upload className="w-7 h-7 text-slate-400" />
                          <span className="text-sm text-center leading-snug text-slate-500">
                            {t("dropZoneBulk")}
                          </span>
                        </>
                      ) : (
                        <div className="space-y-2">
                          {slots.map((slot, i) => slot.file && (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                              <FileText className="w-5 h-5 text-emerald-700 shrink-0" />
                              <div className="min-w-0 shrink-0 w-40 sm:w-56">
                                <p className="text-sm font-medium text-slate-800 truncate">{slot.file.name}</p>
                                <p className="text-xs text-slate-400">{(slot.file.size / 1024 / 1024).toFixed(2)} MB</p>
                              </div>
                              <input
                                type="text"
                                value={slot.label}
                                onChange={(e) => handleLabelChange(i, e.target.value)}
                                placeholder={slotLabel(i)}
                                aria-label={slotLabel(i)}
                                disabled={loading}
                                className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm text-slate-900 placeholder-slate-400
                                           focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors disabled:opacity-50"
                              />
                              {filledCount > MIN_SLOTS && (
                                <button
                                  type="button"
                                  aria-label={`${t("removeDocument")} ${i + 1}`}
                                  disabled={loading}
                                  onClick={() => handleRemoveSlot(i)}
                                  className="shrink-0 w-7 h-7 rounded-full bg-slate-200 hover:bg-slate-300 border border-slate-300 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            disabled={loading || slots.length >= MAX_SLOTS}
                            onClick={openBulkFileBrowser}
                            className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 text-xs font-medium text-slate-500 hover:text-slate-800 hover:border-slate-400 transition-all duration-200 flex items-center justify-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            {t("addDocument")}
                          </button>
                        </div>
                      )}
                      <input
                        ref={bulkFileInputRef}
                        type="file"
                        accept=".pdf"
                        multiple
                        className="hidden"
                        onChange={handleBulkFileInputChange}
                        aria-hidden="true"
                        tabIndex={-1}
                      />
                    </div>
                  );
                })()
              ) : (
                <div className="space-y-4">
                  <div
                    data-testid="upload-drop-zone"
                    onDragOver={handleContainerDragOver}
                    onDragLeave={handleContainerDragLeave}
                    onDrop={handleContainerDrop}
                    className={`rounded-xl border-2 border-dashed transition-colors duration-200 p-4 ${
                      isContainerDragging ? "border-sky-500 bg-sky-50/50" : "border-transparent"
                    }`}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {slots.map((slot, i) => (
                        <div key={i} className="relative">
                          {slots.length > MIN_SLOTS && (
                            <button
                              type="button"
                              aria-label={`${t("removeDocument")} ${i + 1}`}
                              disabled={loading}
                              onClick={() => handleRemoveSlot(i)}
                              className="absolute -top-2 -right-2 z-10 w-6 h-6 rounded-full bg-slate-200 hover:bg-slate-300 border border-slate-300 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <FileSlot
                            file={slot.file}
                            error={slot.error}
                            label={slotLabel(i)}
                            dropZoneText={t("dropZoneSlot")}
                            onFile={(file) => handleSlotFile(i, file)}
                            inputRef={getInputRef(i)}
                            disabled={loading}
                            onDropExtras={handleSlotDropExtras}
                          />
                          <input
                            ref={(el) => { labelInputRefsRef.current.set(i, el); }}
                            type="text"
                            value={slot.label}
                            onChange={(e) => handleLabelChange(i, e.target.value)}
                            placeholder={slotLabel(i)}
                            aria-label={slotLabel(i)}
                            className="mt-1.5 w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder-slate-400
                                       focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={loading || slots.length >= MAX_SLOTS}
                    onClick={handleAddSlot}
                    className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 text-xs font-medium text-slate-500 hover:text-slate-800 hover:border-slate-400 transition-all duration-200 flex items-center justify-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {t("addDocument")}
                  </button>
                </div>
              )}

              {/* Size error */}
              {sizeError && (
                <p className="flex items-center gap-1.5 text-xs text-amber-700">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {sizeError}
                </p>
              )}

              {/* Submit error */}
              {submitError && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-800 space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    <span>{submitError}</span>
                  </div>
                  {errorReport && (
                    <>
                      <pre className="max-h-48 overflow-auto p-3 rounded-lg bg-white border border-rose-200 text-xs text-slate-700 whitespace-pre-wrap break-all font-mono">
                        {errorReport}
                      </pre>
                      <button
                        type="button"
                        onClick={handleCopyReport}
                        className="px-3 py-1.5 rounded-md text-xs font-medium bg-white text-rose-900 border border-rose-200 hover:bg-rose-100 transition-colors"
                      >
                        {copied ? t("copiedErrorDetails") : t("copyErrorDetails")}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={!canSubmit}
                className={`
                  w-full py-3.5 rounded-xl font-medium text-sm transition-all duration-200
                  flex items-center justify-center gap-2 shadow-xs
                  ${canSubmit
                    ? "bg-slate-900 text-white hover:bg-slate-800 cursor-pointer shadow-sm"
                    : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                  }
                `}
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    {t("analysing")}
                  </>
                ) : (
                  t("analyseButton")
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

export default UploadScreen;
