"use client";

import React from "react";
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

const content: AboutContent = {
  tagline: "Dokumentcitations- og konfliktanalyse",
  whatTitle: "Hvad er LexGraph?",
  whatBody: [
    "LexGraph er et værktøj til at kortlægge, hvordan to juridiske eller regulatoriske dokumenter, for eksempel en rammeforordning og den tilhørende gennemførelsesforordning, henviser til hinanden.",
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
      body: "Giv hvert dokument et kort, letgenkendeligt navn. Det bruges i grafen og i alle labels.",
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
      body: "Ingen manuel krydstjek af artikel- og paragrafhenvisninger. LexGraph finder dem alle, inklusive nedarvede stk.- og litra-referencer.",
    },
    {
      icon: "shield",
      title: "Konfliktdetektion",
      body: "Opdager når én sektion skaber en undtagelse, mens en anden sektion i det andet dokument pålægger en forpligtelse eller et forbud på samme sted. Det er den slags modsigelser, der er lette at overse ved separat læsning.",
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
};

const icons = {
  shield: ShieldCheck,
  layers: Layers,
  search: Search,
  alert: AlertTriangle,
};

export default function AboutPage() {
  const c = content;

  return (
    <div className="flex flex-col min-h-screen bg-[#fafaf9] text-slate-900 font-sans antialiased">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shadow-xs">
        <Link href="/" className="flex items-center gap-3">
          <Database className="w-5 h-5 text-sky-700" />
          <h1 className="text-base font-bold tracking-tight text-slate-900">
            LexGraph
          </h1>
        </Link>
      </header>

      <main className="flex-1 px-6 py-12">
        <div className="max-w-3xl mx-auto space-y-12">
          {/* Intro */}
          <div className="text-center space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-sky-800">{c.tagline}</p>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">{c.whatTitle}</h2>
            <div className="space-y-4 text-left sm:text-center">
              {c.whatBody.map((p, i) => (
                <p key={i} className="text-sm text-slate-600 leading-relaxed max-w-2xl mx-auto">
                  {p}
                </p>
              ))}
            </div>
          </div>

          {/* How to use it */}
          <section>
            <h3 className="text-lg font-bold mb-5 flex items-center gap-2 text-slate-900">
              <Upload className="w-4 h-4 text-sky-700" />
              {c.howTitle}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {c.steps.map((step) => (
                <div
                  key={step.title}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs"
                >
                  <h4 className="text-sm font-bold text-slate-900 mb-1.5">{step.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">{step.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Value */}
          <section>
            <h3 className="text-lg font-bold mb-5 flex items-center gap-2 text-slate-900">
              <GitBranch className="w-4 h-4 text-sky-700" />
              {c.valueTitle}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {c.valueItems.map((item) => {
                const Icon = icons[item.icon];
                return (
                  <div
                    key={item.title}
                    className="bg-white border border-slate-200 rounded-2xl p-5 flex gap-3.5 shadow-xs"
                  >
                    <Icon className="w-5 h-5 text-sky-700 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 mb-1.5">{item.title}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed font-normal">{item.body}</p>
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
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-xs bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all duration-200"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {c.cta}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
