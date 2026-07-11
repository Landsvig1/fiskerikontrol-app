"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Database, Upload, FileText, AlertTriangle, RefreshCw, Info } from "lucide-react";
import { GraphData } from "@/app/page";
import { TranslateFn } from "@/lib/i18n";
import { deriveLabelFromFilename } from "@/lib/labels";

import { Lang } from "@/lib/i18n";

interface UploadScreenProps {
  onSuccess: (data: GraphData, labelA: string, labelB: string) => void;
  t: TranslateFn;
  lang: Lang;
  setLang: (lang: Lang) => void;
  labelAInput: string;
  setLabelAInput: (val: string) => void;
  labelBInput: string;
  setLabelBInput: (val: string) => void;
}

interface FileSlotProps {
  file: File | null;
  error: string | null;
  label: string;
  dropZoneText: string;
  onFile: (file: File) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

function FileSlot({ file, error, label, dropZoneText, onFile, inputRef }: FileSlotProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) onFile(dropped);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) onFile(selected);
    // Reset so the same file can be re-selected after an error
    e.target.value = "";
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">
        {label}
      </span>

      <div
        role="button"
        tabIndex={0}
        aria-label={label}
        onClick={handleClick}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleClick(); }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed
          cursor-pointer transition-all duration-200 min-h-[140px] select-none
          ${isDragging
            ? "border-[#38bdf8] bg-[#38bdf8]/10"
            : file && !error
              ? "border-[#10b981]/60 bg-[#10b981]/5"
              : error
                ? "border-[#ef4444]/60 bg-[#ef4444]/5"
                : "border-[#1e293b] bg-[#0d1527] hover:border-[#38bdf8]/50 hover:bg-[#38bdf8]/5"
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
  labelAInput,
  setLabelAInput,
  labelBInput,
  setLabelBInput,
}: UploadScreenProps) {
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [errorA, setErrorA] = useState<string | null>(null);
  const [errorB, setErrorB] = useState<string | null>(null);
  const [sizeError, setSizeError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errorReport, setErrorReport] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [labelATouched, setLabelATouched] = useState(false);
  const [labelBTouched, setLabelBTouched] = useState(false);
  const [multiDropNotice, setMultiDropNotice] = useState<string | null>(null);
  const [isContainerDragging, setIsContainerDragging] = useState(false);

  const inputRefA = useRef<HTMLInputElement | null>(null);
  const inputRefB = useRef<HTMLInputElement | null>(null);
  const autoTriggerArmedRef = useRef(false);

  // Combined size check
  useEffect(() => {
    const combined = (fileA?.size ?? 0) + (fileB?.size ?? 0);
    setSizeError(combined > 10 * 1024 * 1024 ? t("sizeLimitError") : null);
  }, [fileA, fileB, t]);

  const isSameFile = (a: File | null, b: File) =>
    a !== null && a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;

  const handleFileA = (file: File) => {
    if (file.type !== "application/pdf") {
      setErrorA(t("invalidPdfError"));
      setFileA(null);
      return;
    }
    setErrorA(null);
    const isNewFile = !isSameFile(fileA, file);
    setFileA(file);
    if (isNewFile) {
      setLabelATouched(false);
      setLabelAInput(deriveLabelFromFilename(file.name));
    } else if (!labelATouched) {
      setLabelAInput(deriveLabelFromFilename(file.name));
    }
    if (fileB) autoTriggerArmedRef.current = true;
  };

  const handleFileB = (file: File) => {
    if (file.type !== "application/pdf") {
      setErrorB(t("invalidPdfError"));
      setFileB(null);
      return;
    }
    setErrorB(null);
    const isNewFile = !isSameFile(fileB, file);
    setFileB(file);
    if (isNewFile) {
      setLabelBTouched(false);
      setLabelBInput(deriveLabelFromFilename(file.name));
    } else if (!labelBTouched) {
      setLabelBInput(deriveLabelFromFilename(file.name));
    }
    if (fileA) autoTriggerArmedRef.current = true;
  };

  const handleLabelAChange = (value: string) => {
    setLabelATouched(true);
    setLabelAInput(value);
  };

  const handleLabelBChange = (value: string) => {
    setLabelBTouched(true);
    setLabelBInput(value);
  };

  const handleContainerDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsContainerDragging(true);
  };

  const handleContainerDragLeave = () => {
    setIsContainerDragging(false);
  };

  const handleContainerDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsContainerDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    if (files.length === 1) {
      setMultiDropNotice(null);
      if (!fileA) handleFileA(files[0]);
      else if (!fileB) handleFileB(files[0]);
      else handleFileA(files[0]);
      return;
    }

    const pdfFiles = files.filter((f) => f.type === "application/pdf");
    const [first, second] = pdfFiles;
    if (first) handleFileA(first);
    if (second) handleFileB(second);
    if (first && second) autoTriggerArmedRef.current = true;

    const usedCount = pdfFiles.slice(0, 2).length;
    setMultiDropNotice(files.length > usedCount ? t("multiDropExtraFilesIgnored") : null);
  };

  const canSubmit =
    fileA !== null &&
    fileB !== null &&
    labelAInput.trim().length >= 1 &&
    labelBInput.trim().length >= 1 &&
    !sizeError &&
    !loading;

  // Auto-fire the analysis once both slots complete a valid pair for the first time.
  useEffect(() => {
    if (autoTriggerArmedRef.current && canSubmit) {
      autoTriggerArmedRef.current = false;
      void runAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileA, fileB, labelAInput, labelBInput, sizeError, loading]);

  const runAnalysis = async () => {
    if (!canSubmit || !fileA || !fileB) return;

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
          fileA: { name: fileA.name, size: fileA.size, type: fileA.type },
          fileB: { name: fileB.name, size: fileB.size, type: fileB.type },
          ...extra,
        },
        null,
        2
      );

    try {
      const fd = new FormData();
      fd.append("pdfA", fileA);
      fd.append("pdfB", fileB);
      fd.append("labelA", labelAInput.trim());
      fd.append("labelB", labelBInput.trim());

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
      onSuccess(graphData, labelAInput.trim(), labelBInput.trim());
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
          <div
            data-testid="upload-drop-zone"
            onDragOver={handleContainerDragOver}
            onDragLeave={handleContainerDragLeave}
            onDrop={handleContainerDrop}
            className={`bg-[#0d1527] border rounded-2xl p-8 shadow-xl shadow-black/40 transition-colors duration-200 ${
              isContainerDragging ? "border-[#38bdf8]/60" : "border-[#1e293b]"
            }`}
          >
            {/* Title block */}
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-extrabold tracking-tight text-[#f8fafc]">
                {t("uploadTitle")}
              </h2>
              <p className="mt-2 text-sm text-[#94a3b8] leading-relaxed">
                {t("uploadSubtitle")}
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-6">
              {/* Multi-file drop notice */}
              {multiDropNotice && (
                <p className="flex items-center gap-1.5 text-xs text-[#f59e0b]">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {multiDropNotice}
                </p>
              )}

              {/* File slots */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FileSlot
                  file={fileA}
                  error={errorA}
                  label={t("labelA")}
                  dropZoneText={t("dropZoneA")}
                  onFile={handleFileA}
                  inputRef={inputRefA}
                />
                <FileSlot
                  file={fileB}
                  error={errorB}
                  label={t("labelB")}
                  dropZoneText={t("dropZoneB")}
                  onFile={handleFileB}
                  inputRef={inputRefB}
                />
              </div>

              {/* Size error */}
              {sizeError && (
                <p className="flex items-center gap-1.5 text-xs text-[#f59e0b]">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {sizeError}
                </p>
              )}

              {/* Label inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="labelA"
                    className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider"
                  >
                    {t("labelA")}
                  </label>
                  <input
                    id="labelA"
                    type="text"
                    value={labelAInput}
                    onChange={(e) => handleLabelAChange(e.target.value)}
                    placeholder={t("labelA")}
                    className="px-3 py-2 rounded-lg bg-[#131e35] border border-[#1e293b] text-sm text-[#f8fafc] placeholder-[#4b5c75]
                               focus:outline-none focus:ring-2 focus:ring-[#38bdf8]/50 focus:border-[#38bdf8]/60 transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="labelB"
                    className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider"
                  >
                    {t("labelB")}
                  </label>
                  <input
                    id="labelB"
                    type="text"
                    value={labelBInput}
                    onChange={(e) => handleLabelBChange(e.target.value)}
                    placeholder={t("labelB")}
                    className="px-3 py-2 rounded-lg bg-[#131e35] border border-[#1e293b] text-sm text-[#f8fafc] placeholder-[#4b5c75]
                               focus:outline-none focus:ring-2 focus:ring-[#38bdf8]/50 focus:border-[#38bdf8]/60 transition-colors"
                  />
                </div>
              </div>

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
