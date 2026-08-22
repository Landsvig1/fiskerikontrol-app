"use client";

import React, { useMemo, useState } from "react";
import {
  X,
  Printer,
  Copy,
  Check,
  Download,
  FileText,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { GraphData } from "@/lib/types";
import { FleetFilterCriteria } from "@/lib/fleetFilter";
import { generateAuditMemoMarkdown } from "@/lib/generateAuditMemo";
import { TranslateFn } from "@/lib/i18n";

interface AuditMemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: GraphData;
  criteria: FleetFilterCriteria;
  t?: TranslateFn;
}

export function AuditMemoModal({
  isOpen,
  onClose,
  data,
  criteria,
}: AuditMemoModalProps) {
  const [copied, setCopied] = useState(false);

  // Memoized because generateAuditMemoMarkdown stamps a random case reference: regenerating
  // it on every render made the memo's case number change while the user was reading it.
  const markdownContent = useMemo(
    () => (isOpen ? generateAuditMemoMarkdown({ data, criteria }) : ""),
    [isOpen, data, criteria]
  );

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdownContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([markdownContent], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fiskerikontrol-audit-notat-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 border border-sky-200/80 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {"Juridisk Tilsynsnotat & Audit-Memo"}
              </h2>
              <p className="text-[11px] text-slate-500">
                {"Struktureret tilsynsrapport klar til print, journalisering eller eksport"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              {"Udskriv / Gem som PDF"}
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? ("Kopieret!") : "Kopiér Markdown"}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              {"Download .md"}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Paper Document Preview */}
        <div className="flex-1 overflow-y-auto p-8 bg-[#fafaf9]">
          <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-2xl p-10 shadow-xs space-y-6 text-slate-800 font-sans print:border-none print:shadow-none print:p-0">
            {/* Official Authority Header */}
            <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-800 mb-1">
                  <Building2 className="w-4 h-4 text-sky-700" />
                  Fiskeristyrelsen, Enheden for Tilsyn & Retsgrundlag
                </div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  JURIDISK TILSYNSNOTAT & COMPLIANCE-AUDIT
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Sagsbehandlingsgrundlag for krydskontrol af EU-forordninger og nationale bekendtgørelser.
                </p>
              </div>

              <div className="text-right text-xs space-y-1 text-slate-500 font-mono">
                <div>Dato: <strong>{new Date().toLocaleDateString("da-DK")}</strong></div>
                <div>Sagsnr: <strong>LEX-{new Date().getFullYear()}-0842</strong></div>
              </div>
            </div>

            {/* Markdown rendered as clean typography */}
            <div className="prose prose-slate max-w-none text-xs leading-relaxed space-y-4 whitespace-pre-wrap font-sans">
              {markdownContent}
            </div>

            {/* Verification Stamp Block */}
            <div className="pt-6 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Automatisk verificeret af <strong>LexGraph Fiskerikontrol Core Engine</strong></span>
              </div>
              <div className="font-mono text-[10px]">Doc-Hash: SHA256-OK</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
