"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Database,
  ArrowLeft,
  Upload,
  Search,
  GitBranch,
  AlertTriangle,
  ShieldCheck,
  Layers,
} from "lucide-react";
import { Lang } from "@/lib/i18n";

interface AboutContent {
  tagline: string;
  whatTitle: string;
  whatBody: string[];
  howTitle: string;
  steps: { title: string; body: string }[];
  valueTitle: string;
  valueItems: { icon: "shield" | "layers" | "search" | "alert"; title: string; body: string }[];
  cta: string;
}

const content: Record<Lang, AboutContent> = {
  da: {
    tagline: "Dokumentcitations- og konfliktanalyse",
    whatTitle: "Hvad er LexGraph?",
    whatBody: [
      "LexGraph er et værktøj til at kortlægge, hvordan to juridiske eller regulatoriske dokumenter — for eksempel en rammeforordning og den tilhørende gennemførelsesforordning — henviser til hinanden.",
      "Du uploader begge dokumenter som PDF. LexGraph genkender artikel-, paragraf- og kapiteloverskrifter, finder alle krydshenvisninger mellem dokumenterne, og bygger en interaktiv graf, hvor hver node er en sektion og hver forbindelse er en citation.",
    ],
    howTitle: "Sådan bruger du det",
    steps: [
      {
        title: "1. Upload to dokumenter",
        body: "Træk begge PDF-filer ind, eller klik for at vælge dem. Filerne behandles kun i hukommelsen og gemmes ikke.",
      },
      {
        title: "2. Navngiv dem",
        body: "Giv hvert dokument et kort, letgenkendeligt navn — det bruges i grafen og i alle labels.",
      },
      {
        title: "3. Analysér",
        body: "LexGraph parser strukturen og citationerne på få sekunder og bygger grafen automatisk.",
      },
      {
        title: "4. Udforsk resultatet",
        body: "Brug Oversigt, Citation Graf, Node Graf, Overlap, Konflikter og Søg & Slå Op til at undersøge sammenhængene fra forskellige vinkler.",
      },
    ],
    valueTitle: "Hvorfor det er nyttigt",
    valueItems: [
      {
        icon: "search",
        title: "Automatisk citationsudtræk",
        body: "Ingen manuel krydstjek af artikel- og paragrafhenvisninger — LexGraph finder dem alle, inklusive nedarvede stk.- og litra-referencer.",
      },
      {
        icon: "shield",
        title: "Konfliktdetektion",
        body: "Opdager når én sektion skaber en undtagelse, mens en anden sektion i det andet dokument pålægger en forpligtelse eller et forbud på samme sted — den slags modsigelser, der er lette at overse ved separat læsning.",
      },
      {
        icon: "layers",
        title: "Visuel udforskning",
        body: "Interaktiv graf med zoom, filtrering på dokument og kategori, samt en fysikbaseret nodegraf til at se forbindelsesmønstre på tværs af hele dokumentsættet.",
      },
      {
        icon: "alert",
        title: "Ingen datalagring",
        body: "Analysen kører i hukommelsen for den enkelte session. Der gemmes ikke dokumenter eller resultater på serveren.",
      },
    ],
    cta: "Start din egen analyse",
  },
  en: {
    tagline: "Document Citation & Conflict Analysis",
    whatTitle: "What is LexGraph?",
    whatBody: [
      "LexGraph is a tool for mapping how two legal or regulatory documents — for example a base regulation and its implementing regulation — reference each other.",
      "You upload both documents as PDFs. LexGraph detects article, section, and chapter headings, finds every cross-reference between the two documents, and builds an interactive graph where each node is a section and each connection is a citation.",
    ],
    howTitle: "How to use it",
    steps: [
      {
        title: "1. Upload two documents",
        body: "Drag in both PDF files, or click to select them. Files are processed in memory only and never stored.",
      },
      {
        title: "2. Name them",
        body: "Give each document a short, recognisable name — used throughout the graph and every label.",
      },
      {
        title: "3. Analyse",
        body: "LexGraph parses the structure and citations in seconds and builds the graph automatically.",
      },
      {
        title: "4. Explore the result",
        body: "Use Dashboard, Citation Graph, Node Graph, Overlaps, Conflicts, and Search & Browse to examine the relationships from different angles.",
      },
    ],
    valueTitle: "Why it's useful",
    valueItems: [
      {
        icon: "search",
        title: "Automatic citation extraction",
        body: "No manual cross-checking of article and section references — LexGraph finds them all, including nested paragraph and litra sub-references.",
      },
      {
        icon: "shield",
        title: "Conflict detection",
        body: "Detects when one section creates an exception while another section in the other document imposes an obligation or prohibition on the same target — the kind of contradiction that's easy to miss when reading each document separately.",
      },
      {
        icon: "layers",
        title: "Visual exploration",
        body: "Interactive graph with zoom, document and category filtering, plus a physics-based node graph for spotting connection patterns across the whole document set.",
      },
      {
        icon: "alert",
        title: "No data retention",
        body: "Analysis runs in memory for your session only. No documents or results are stored server-side.",
      },
    ],
    cta: "Start your own analysis",
  },
};

const icons = {
  shield: ShieldCheck,
  layers: Layers,
  search: Search,
  alert: AlertTriangle,
};

export default function AboutPage() {
  const [lang, setLang] = useState<Lang>("da");

  useEffect(() => {
    const savedLang = localStorage.getItem("lexgraph-lang") as Lang | null;
    if (savedLang === "da" || savedLang === "en") {
      setLang(savedLang);
    }
  }, []);

  const changeLang = (newLang: Lang) => {
    setLang(newLang);
    localStorage.setItem("lexgraph-lang", newLang);
  };

  const c = content[lang];

  return (
    <div className="flex flex-col min-h-screen bg-[#070b13] text-[#f8fafc] font-sans antialiased">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-[#0d1527] border-b border-[#1e293b]">
        <Link href="/" className="flex items-center gap-3">
          <Database className="w-6 h-6 text-[#38bdf8]" />
          <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-[#38bdf8] to-[#818cf8] bg-clip-text text-transparent">
            LexGraph
          </h1>
        </Link>

        <div className="flex items-center gap-1 bg-[#131e35] p-1 rounded-lg border border-[#1e293b]">
          <button
            type="button"
            onClick={() => changeLang("da")}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all duration-200 ${
              lang === "da" ? "bg-[#38bdf8] text-[#070b13] shadow-md shadow-[#38bdf8]/10" : "text-[#94a3b8] hover:text-[#f8fafc]"
            }`}
          >
            DA
          </button>
          <button
            type="button"
            onClick={() => changeLang("en")}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all duration-200 ${
              lang === "en" ? "bg-[#38bdf8] text-[#070b13] shadow-md shadow-[#38bdf8]/10" : "text-[#94a3b8] hover:text-[#f8fafc]"
            }`}
          >
            EN
          </button>
        </div>
      </header>

      <main className="flex-1 px-6 py-12">
        <div className="max-w-3xl mx-auto space-y-12">
          {/* Intro */}
          <div className="text-center space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#38bdf8]">{c.tagline}</p>
            <h2 className="text-3xl font-extrabold tracking-tight">{c.whatTitle}</h2>
            <div className="space-y-4 text-left sm:text-center">
              {c.whatBody.map((p, i) => (
                <p key={i} className="text-sm text-[#94a3b8] leading-relaxed">
                  {p}
                </p>
              ))}
            </div>
          </div>

          {/* How to use it */}
          <section>
            <h3 className="text-xl font-bold mb-5 flex items-center gap-2">
              <Upload className="w-5 h-5 text-[#38bdf8]" />
              {c.howTitle}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {c.steps.map((step) => (
                <div
                  key={step.title}
                  className="bg-[#0d1527] border border-[#1e293b] rounded-xl p-5"
                >
                  <h4 className="text-sm font-bold text-[#f8fafc] mb-1.5">{step.title}</h4>
                  <p className="text-sm text-[#94a3b8] leading-relaxed">{step.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Value */}
          <section>
            <h3 className="text-xl font-bold mb-5 flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-[#38bdf8]" />
              {c.valueTitle}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {c.valueItems.map((item) => {
                const Icon = icons[item.icon];
                return (
                  <div
                    key={item.title}
                    className="bg-[#0d1527] border border-[#1e293b] rounded-xl p-5 flex gap-3"
                  >
                    <Icon className="w-5 h-5 text-[#38bdf8] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-[#f8fafc] mb-1.5">{item.title}</h4>
                      <p className="text-sm text-[#94a3b8] leading-relaxed">{item.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* CTA */}
          <div className="text-center pt-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-[#38bdf8] text-[#070b13] hover:bg-[#38bdf8]/90 shadow-md shadow-[#38bdf8]/20 transition-all duration-200"
            >
              <ArrowLeft className="w-4 h-4" />
              {c.cta}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
