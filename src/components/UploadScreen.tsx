"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Database, Upload, FileText, AlertTriangle, RefreshCw, Info, Plus, X, BookOpen, Check } from "lucide-react";
import { GraphData } from "@/app/page";
import { TranslateFn } from "@/lib/i18n";
import { deriveLabelFromFilename } from "@/lib/labels";
import { PRESET_DOCUMENTS, fetchPresetFiles } from "@/lib/presetCorpus";

import { Lang } from "@/lib/i18n";

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
  onSuccess: (data: GraphData) => void;
  t: TranslateFn;
  lang: Lang;
  setLang: (lang: Lang) => void;
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
      <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">
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
          flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed
          transition-all duration-200 min-h-[140px] select-none
          ${disabled
            ? "opacity-50 cursor-not-allowed pointer-events-none border-[#1e293b] bg-[#0d1527]"
            : "cursor-pointer"
          }
          ${!disabled && isDragging
            ? "border-[#38bdf8] bg-[#38bdf8]/10"
            : !disabled && file && !error
              ? "border-[#10b981]/60 bg-[#10b981]/5"
              : !disabled && error
                ? "border-[#ef4444]/60 bg-[#ef4444]/5"
                : !disabled
                  ? "border-[#1e293b] bg-[#0d1527] hover:border-[#38bdf8]/50 hover:bg-[#38bdf8]/5"
                  : ""
          }
        `}
      >
        {file && !error ? (
          <>
            <FileText className="w-8 h-8 text-[#10b981]" />
            <span className="text-sm font-medium text-[#10b981] text-center break-all">
              {file.name}
            </span>
            <span className="text-xs text-[#94a3b8]">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </span>
          </>
        ) : (
          <>
            <Upload className={`w-8 h-8 ${error ? "text-[#ef4444]" : "text-[#38bdf8]"}`} />
            <span className={`text-sm text-center leading-snug ${error ? "text-[#ef4444]" : "text-[#94a3b8]"}`}>
              {dropZoneText}
            </span>
          </>
        )}
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-[#ef4444]">
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
  lang,
  setLang,
}: UploadScreenProps) {
  const [mode, setMode] = useState<"bulk" | "individual">("bulk");
  const [slots, setSlots] = useState<SlotState[]>([emptySlot(), emptySlot()]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errorReport, setErrorReport] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [multiDropNotice, setMultiDropNotice] = useState<string | null>(null);
  const [isContainerDragging, setIsContainerDragging] = useState(false);
  const [selectedPresetIds, setSelectedPresetIds] = useState<string[]>(["eu-2023-2842", "bek-1197-2025"]);

  const togglePreset = (id: string) => {
    setSelectedPresetIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleAnalyzePresets = async () => {
    if (loading || selectedPresetIds.length < 2) return;
    setSubmitError(null);
    setErrorReport(null);
    setCopied(false);
    setLoading(true);

    try {
      const presetFiles = await fetchPresetFiles(selectedPresetIds);
      const fd = new FormData();
      presetFiles.forEach((p, i) => {
        fd.append(`pdf${i}`, p.file);
        fd.append(`label${i}`, p.label);
      });

      const res = await fetch("/api/parse", { method: "POST", body: fd });
      if (!res.ok) {
        const rawBody = await res.text();
        let errorMsg = t("unknownError");
        let parsedBody: unknown = null;
        try {
          parsedBody = JSON.parse(rawBody);
          const body = parsedBody as { error?: string };
          if (body?.error) errorMsg = body.error;
        } catch {
          // ignore
        }
        setSubmitError(errorMsg);
        setLoading(false);
        return;
      }

      const graphData: GraphData = await res.json();
      onSuccess(graphData);
    } catch (err: unknown) {
      console.error("Preset analysis failed:", err);
      setSubmitError(t("unknownError"));
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
  // users don't lose their place. Only fires for adds — slots.length is a coarse trigger,
  // but pendingFocusIndexRef being null after every other mutation path keeps this a no-op
  // for file drops, removals, and mode toggles.
  useEffect(() => {
    if (pendingFocusIndexRef.current === null) return;
    const index = pendingFocusIndexRef.current;
    pendingFocusIndexRef.current = null;
    labelInputRefsRef.current.get(index)?.focus();
  }, [slots.length]);

  // Derived (not effect-driven) so it's always in sync with slots in the same
  // render — the auto-trigger effect below reads it in that same render.
  const combinedSize = slots.reduce((sum, s) => sum + (s.file?.size ?? 0), 0);
  const sizeError = combinedSize > 10 * 1024 * 1024 ? t("sizeLimitError") : null;

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
  // slot from Individual mode) so Bulk's single-box view — which only ever renders filled
  // slots — can't have an invisible empty slot silently blocking canSubmit. Switching to
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
  // isn't itself the trigger condition — including it would re-run this effect on every
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
        const rawBody = await res.text();
        let errorMsg = t("unknownError");
        let parsedBody: unknown = null;
        try {
          parsedBody = JSON.parse(rawBody);
          const body = parsedBody as { error?: string };
          if (body?.error) errorMsg = body.error;
        } catch {
          // ignore parse failure; use default message
        }
        console.error("Upload failed:", res.status, rawBody);
        setSubmitError(errorMsg);
        setErrorReport(
          buildReport({
            httpStatus: res.status,
            httpStatusText: res.statusText,
            responseBody: parsedBody ?? rawBody,
          })
        );
        setLoading(false);
        return;
      }

      const graphData: GraphData = await res.json();
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
    <div className="flex flex-col min-h-screen bg-[#070b13] text-[#f8fafc] font-sans antialiased">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-[#0d1527] border-b border-[#1e293b]">
        <div className="flex items-center gap-3">
          <Database className="w-6 h-6 text-[#38bdf8]" />
          <div>
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-[#38bdf8] to-[#818cf8] bg-clip-text text-transparent">
              {t("appTitle")}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* About link */}
          <Link
            href="/about"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#94a3b8] border border-[#1e293b] hover:text-[#38bdf8] hover:border-[#38bdf8]/40 transition-all duration-200"
          >
            <Info className="w-3.5 h-3.5" />
            {t("aboutButton")}
          </Link>

          {/* Language Toggle */}
          <div className="flex items-center gap-1 bg-[#131e35] p-1 rounded-lg border border-[#1e293b]">
            <button
              type="button"
              onClick={() => setLang("da")}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all duration-200 ${
                lang === "da" ? "bg-[#38bdf8] text-[#070b13] shadow-md shadow-[#38bdf8]/10" : "text-[#94a3b8] hover:text-[#f8fafc]"
              }`}
            >
              DA
            </button>
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all duration-200 ${
                lang === "en" ? "bg-[#38bdf8] text-[#070b13] shadow-md shadow-[#38bdf8]/10" : "text-[#94a3b8] hover:text-[#f8fafc]"
              }`}
            >
              EN
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          {/* Card */}
          <div className="bg-[#0d1527] border border-[#1e293b] rounded-2xl p-8 shadow-xl shadow-black/40">
            {/* Title block */}
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-extrabold tracking-tight text-[#f8fafc]">
                {t("uploadTitle")}
              </h2>
              <p className="mt-2 text-sm text-[#94a3b8] leading-relaxed">
                {t("uploadSubtitle")}
              </p>
            </div>

            {/* Preset Regulatory Library Section */}
            <div className="mb-6 p-5 rounded-xl bg-[#070b13] border border-[#1e293b] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#38bdf8] flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-[#38bdf8]" /> {t("presetLibraryTitle")}
                  </h3>
                  <p className="text-xs text-[#94a3b8] mt-0.5">
                    {t("presetLibrarySubtitle")}
                  </p>
                </div>
                {selectedPresetIds.length > 0 && (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]/30">
                    {t("selectedPresetCount").replace("{count}", String(selectedPresetIds.length))}
                  </span>
                )}
              </div>

              {/* Grid of Preset Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PRESET_DOCUMENTS.map((doc) => {
                  const isSelected = selectedPresetIds.includes(doc.id);
                  return (
                    <div
                      key={doc.id}
                      data-testid={`preset-card-${doc.id}`}
                      onClick={() => !loading && togglePreset(doc.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                        isSelected
                          ? "bg-[#38bdf8]/10 border-[#38bdf8]/70 shadow-sm shadow-[#38bdf8]/5"
                          : "bg-[#0d1527] border-[#1e293b] hover:border-[#38bdf8]/40 hover:bg-[#131e35]"
                      } ${loading ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            doc.type === "eu" 
                              ? "bg-[#3b82f6]/20 text-[#60a5fa] border border-[#3b82f6]/30" 
                              : doc.type === "bek" 
                                ? "bg-[#10b981]/20 text-[#34d399] border border-[#10b981]/30"
                                : "bg-[#f59e0b]/20 text-[#fbbf24] border border-[#f59e0b]/30"
                          }`}>
                            {lang === "da" ? doc.typeLabelDa : doc.typeLabelEn}
                          </span>
                          <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                            isSelected ? "bg-[#38bdf8] border-[#38bdf8] text-[#070b13]" : "border-[#4b5c75]"
                          }`}>
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>
                        <h4 className="text-xs font-bold text-[#f8fafc]">{doc.code}</h4>
                        <p className="text-xs text-[#94a3b8] font-medium mt-0.5">
                          {lang === "da" ? doc.titleDa : doc.titleEn}
                        </p>
                      </div>
                      <p className="text-[11px] text-[#64748b] mt-2 line-clamp-2 leading-relaxed">
                        {lang === "da" ? doc.descriptionDa : doc.descriptionEn}
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
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#38bdf8] to-[#818cf8] text-[#070b13] font-bold text-xs hover:opacity-95 transition-all flex items-center justify-center gap-2 shadow-md shadow-[#38bdf8]/15 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      {t("analysing")}
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4" />
                      {t("analyzePresets")} ({selectedPresetIds.length})
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="relative flex py-2 items-center mb-6">
              <div className="flex-grow border-t border-[#1e293b]"></div>
              <span className="flex-shrink mx-4 text-xs font-semibold uppercase text-[#64748b] tracking-wider">
                {lang === "da" ? "Eller upload egne PDF-filer" : "Or upload custom PDFs"}
              </span>
              <div className="flex-grow border-t border-[#1e293b]"></div>
            </div>

            {/* Mode Toggle */}
            <div className="flex justify-center mb-6">
              <div className="flex items-center gap-1 bg-[#131e35] p-1 rounded-lg border border-[#1e293b]" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "bulk"}
                  disabled={loading}
                  onClick={() => handleModeToggle("bulk")}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
                    mode === "bulk" ? "bg-[#38bdf8] text-[#070b13] shadow-md shadow-[#38bdf8]/10" : "text-[#94a3b8] hover:text-[#f8fafc]"
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
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
                    mode === "individual" ? "bg-[#38bdf8] text-[#070b13] shadow-md shadow-[#38bdf8]/10" : "text-[#94a3b8] hover:text-[#f8fafc]"
                  }`}
                >
                  {t("uploadModeIndividual")}
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-6">
              {/* Multi-file drop notice */}
              {multiDropNotice && (
                <p className="flex items-center gap-1.5 text-xs text-[#f59e0b]">
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
                        filledCount === 0 ? "min-h-[140px] flex flex-col items-center justify-center gap-3 p-6 select-none" : "p-4"
                      } ${
                        isContainerDragging
                          ? "border-[#38bdf8] bg-[#38bdf8]/10"
                          : filledCount === 0
                            ? `border-[#1e293b] bg-[#0d1527] ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-[#38bdf8]/50 hover:bg-[#38bdf8]/5"}`
                            : "border-[#1e293b]"
                      }`}
                    >
                      {filledCount === 0 ? (
                        <>
                          <Upload className="w-8 h-8 text-[#38bdf8]" />
                          <span className="text-sm text-center leading-snug text-[#94a3b8]">
                            {t("dropZoneBulk")}
                          </span>
                        </>
                      ) : (
                        <div className="space-y-2">
                          {slots.map((slot, i) => slot.file && (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[#070b13] border border-[#1e293b]">
                              <FileText className="w-5 h-5 text-[#10b981] shrink-0" />
                              <div className="min-w-0 shrink-0 w-40 sm:w-56">
                                <p className="text-sm text-[#f8fafc] truncate">{slot.file.name}</p>
                                <p className="text-xs text-[#94a3b8]">{(slot.file.size / 1024 / 1024).toFixed(2)} MB</p>
                              </div>
                              <input
                                type="text"
                                value={slot.label}
                                onChange={(e) => handleLabelChange(i, e.target.value)}
                                placeholder={slotLabel(i)}
                                aria-label={slotLabel(i)}
                                disabled={loading}
                                className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-[#131e35] border border-[#1e293b] text-sm text-[#f8fafc] placeholder-[#4b5c75]
                                           focus:outline-none focus:ring-2 focus:ring-[#38bdf8]/50 focus:border-[#38bdf8]/60 transition-colors disabled:opacity-50"
                              />
                              {filledCount > MIN_SLOTS && (
                                <button
                                  type="button"
                                  aria-label={`${t("removeDocument")} ${i + 1}`}
                                  disabled={loading}
                                  onClick={() => handleRemoveSlot(i)}
                                  className="shrink-0 w-7 h-7 rounded-full bg-[#1e293b] hover:bg-[#334155] border border-[#334155] flex items-center justify-center text-[#94a3b8] hover:text-[#f8fafc] transition-all disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
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
                            className="w-full py-2.5 rounded-xl border border-dashed border-[#1e293b] text-xs font-semibold text-[#94a3b8] hover:text-[#38bdf8] hover:border-[#38bdf8]/40 transition-all duration-200 flex items-center justify-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-50"
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
                      isContainerDragging ? "border-[#38bdf8]/60 bg-[#38bdf8]/5" : "border-transparent"
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
                              className="absolute -top-2 -right-2 z-10 w-6 h-6 rounded-full bg-[#1e293b] hover:bg-[#334155] border border-[#334155] flex items-center justify-center text-[#94a3b8] hover:text-[#f8fafc] transition-all disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
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
                            className="mt-1.5 w-full px-3 py-2 rounded-lg bg-[#131e35] border border-[#1e293b] text-sm text-[#f8fafc] placeholder-[#4b5c75]
                                       focus:outline-none focus:ring-2 focus:ring-[#38bdf8]/50 focus:border-[#38bdf8]/60 transition-colors"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={loading || slots.length >= MAX_SLOTS}
                    onClick={handleAddSlot}
                    className="w-full py-2.5 rounded-xl border border-dashed border-[#1e293b] text-xs font-semibold text-[#94a3b8] hover:text-[#38bdf8] hover:border-[#38bdf8]/40 transition-all duration-200 flex items-center justify-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {t("addDocument")}
                  </button>
                </div>
              )}

              {/* Size error */}
              {sizeError && (
                <p className="flex items-center gap-1.5 text-xs text-[#f59e0b]">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {sizeError}
                </p>
              )}

              {/* Submit error */}
              {submitError && (
                <div className="p-3 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/25 text-sm text-[#f87171] space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{submitError}</span>
                  </div>
                  {errorReport && (
                    <>
                      <pre className="max-h-48 overflow-auto p-2 rounded bg-[#070b13] border border-[#1e293b] text-xs text-[#94a3b8] whitespace-pre-wrap break-all">
                        {errorReport}
                      </pre>
                      <button
                        type="button"
                        onClick={handleCopyReport}
                        className="px-3 py-1.5 rounded-md text-xs font-semibold bg-[#1e293b] text-[#f8fafc] hover:bg-[#334155] transition-colors"
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
                  w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200
                  flex items-center justify-center gap-2
                  ${canSubmit
                    ? "bg-[#38bdf8] text-[#070b13] hover:bg-[#38bdf8]/90 shadow-md shadow-[#38bdf8]/20 cursor-pointer"
                    : "bg-[#1e293b] text-[#4b5c75] cursor-not-allowed"
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
