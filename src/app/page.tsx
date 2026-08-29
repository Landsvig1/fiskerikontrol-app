"use client";

import React, { Suspense, useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Database,
  RefreshCw,
  FileText,
  Calendar,
  Info,
} from "lucide-react";
import { CitationGraphView } from "@/components/CitationGraphView";
import { UploadScreen } from "@/components/UploadScreen";
import { ConflictInspectorModal } from "@/components/ConflictInspectorModal";
import { EnforcementTimelineView } from "@/components/EnforcementTimelineView";
import { DashboardView } from "@/components/views/DashboardView";
import { ConsolidationView } from "@/components/views/ConsolidationView";
import { InteractiveGraphView } from "@/components/views/InteractiveGraphView";
import { OverlapsView } from "@/components/views/OverlapsView";
import { ConflictsView } from "@/components/views/ConflictsView";
import { BrowseView } from "@/components/views/BrowseView";
import { AuditMemoModal } from "@/components/AuditMemoModal";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { FleetFilterCriteria } from "@/lib/fleetFilter";
import { getT } from "@/lib/i18n";
import { DocRef } from "@/lib/docDisplay";
import {
  AppUrlState,
  DEFAULT_URL_STATE,
  TAB_TYPES,
  TabType,
  parseAppUrlState,
  toQueryString,
} from "@/lib/urlState";
import {
  GraphNode,
  GraphLink,
  OverlapRecord,
  ConflictRecord,
  GraphData,
} from "@/lib/types";

export type {
  DocRef,
  GraphNode,
  GraphLink,
  OverlapRecord,
  ConflictRecord,
  GraphData,
};

// Re-exported so the views keep importing it from here, where it has always lived. The
// canonical list moved to lib/urlState because the URL schema and the tab set are the same
// thing now: a tab that cannot be named in a URL is not an addressable screen.
export type { TabType };

// Upper bound on the URL-driven corpus restore. Sized well above a cold parse of the full
// preset corpus while staying far below the platform's function timeout.
const RESTORE_TIMEOUT_MS = 60_000;

export default function Home() {
  // useSearchParams suspends during prerender, and without a boundary that would take the
  // whole route out of static generation.
  return (
    <Suspense fallback={<LoadingScreen />}>
      <LexGraphApp />
    </Suspense>
  );
}

function LoadingScreen() {
  const t = getT();
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#fafaf9] text-slate-900 font-sans">
      <RefreshCw className="w-10 h-10 text-sky-700 animate-spin mb-4" />
      <h2 className="text-base font-semibold text-slate-800">{t("loadingGraph")}</h2>
    </div>
  );
}

function LexGraphApp() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // The URL is the source of truth for everything that names a screen. Reading it on every
  // render (rather than seeding component state from it once) is what keeps the back button,
  // a pasted link and a link built by an agent all landing on the same view.
  //
  // Memoised on the serialised query rather than on the params object: the object identity
  // is not guaranteed to be stable across renders, and an unstable urlState hands a fresh
  // `docs` array to the restore effect below on every render, which then cancels its own
  // in-flight request forever.
  const searchString = searchParams.toString();
  const urlState = useMemo(
    () => parseAppUrlState(new URLSearchParams(searchString)),
    [searchString]
  );

  const [data, setData] = useState<GraphData | null>(null);
  // Preset ids for the loaded corpus, empty for a hand-uploaded one. Held separately from
  // the URL so that clearing filters cannot accidentally drop the corpus out of the link.
  const [corpusDocIds, setCorpusDocIds] = useState<string[]>([]);
  const [restoreState, setRestoreState] = useState<"idle" | "loading" | "failed">("idle");
  const [inspectingConflict, setInspectingConflict] = useState<ConflictRecord | null>(null);
  const [isAuditMemoOpen, setIsAuditMemoOpen] = useState(false);

  // The URL-state setters are passed to the two d3 canvases, whose teardown-and-rebuild
  // effects list them as dependencies. A setter whose identity changes on every navigation
  // therefore re-fires that effect on the very click that selected a node: the SVG is torn
  // down, the simulation rebuilt, and d3.zoom() recreated, which throws away the user's pan
  // and zoom mid-interaction. Before this file moved to URL state these were raw useState
  // setters, which React keeps referentially stable forever.
  //
  // So the setter closes over refs rather than over the values themselves and depends only
  // on `router` (stable in the App Router), keeping one identity for the component's life.
  // The refs are assigned during render so a setter called before effects flush still reads
  // the current state rather than the previous one.
  const urlStateRef = useRef(urlState);
  urlStateRef.current = urlState;
  const corpusDocIdsRef = useRef(corpusDocIds);
  corpusDocIdsRef.current = corpusDocIds;

  const setUrlState = useCallback(
    (patch: Partial<AppUrlState>) => {
      const next: AppUrlState = {
        ...urlStateRef.current,
        ...patch,
        docs: patch.docs ?? corpusDocIdsRef.current,
      };
      // replace, not push: changing a tab or a filter is not a navigation a user wants to
      // undo one step at a time, and pushing would bury the previous page under a filter
      // history several dozen entries deep.
      router.replace(`/${toQueryString(next)}`, { scroll: false });
    },
    [router]
  );

  const activeTab = urlState.view;
  const searchQuery = urlState.search;
  const activeDocFilter = urlState.activeDocFilter;
  const activeCategoryFilter = urlState.activeCategoryFilter;
  const fleetCriteria = urlState.fleet;

  // The URL carries a provision id; the views need the node. An id that no longer resolves
  // (a link built against a different corpus, or a stale one) selects nothing rather than
  // throwing, and the rest of the screen still comes up.
  const selectedNode = useMemo(() => {
    if (!data || !urlState.provision) return null;
    return data.nodes.find(n => n.id === urlState.provision) ?? null;
  }, [data, urlState.provision]);

  const setSelectedNode = useCallback(
    (node: GraphNode | null) => setUrlState({ provision: node?.id ?? null }),
    [setUrlState]
  );
  const setActiveTab = useCallback((tab: TabType) => setUrlState({ view: tab }), [setUrlState]);
  const setSearchQuery = useCallback((search: string) => setUrlState({ search }), [setUrlState]);
  const setActiveDocFilter = useCallback(
    (activeDocFilter: string) => setUrlState({ activeDocFilter }),
    [setUrlState]
  );
  const setActiveCategoryFilter = useCallback(
    (activeCategoryFilter: string) => setUrlState({ activeCategoryFilter }),
    [setUrlState]
  );
  const setFleetCriteria = useCallback(
    (fleet: FleetFilterCriteria) => setUrlState({ fleet }),
    [setUrlState]
  );

  // Restoring a corpus named in the URL. This is the step that makes any of the rest
  // addressable: without it a link would arrive at the upload screen with its view and
  // provision parameters describing a corpus that was never loaded.
  const restoreAttemptedRef = useRef<string | null>(null);
  // A string, not the array: the effect must not re-run (and cancel itself) merely because
  // a re-render produced an equal-but-new array.
  const docsKey = urlState.docs.join(",");
  useEffect(() => {
    const docIds = docsKey ? docsKey.split(",") : [];
    if (data || docIds.length < 2) return;
    if (restoreAttemptedRef.current === docsKey) return;
    restoreAttemptedRef.current = docsKey;

    let cancelled = false;
    setRestoreState("loading");
    // The restore screen has no controls, so a hung request would strand the user on a
    // spinner with no way forward. Bound it and let the failure banner take over instead.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), RESTORE_TIMEOUT_MS);
    (async () => {
      try {
        const res = await fetch("/api/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ presetIds: docIds }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const graphData = (await res.json()) as GraphData;
        if (cancelled) return;
        setData(graphData);
        setCorpusDocIds(docIds);
        setRestoreState("idle");
      } catch (e) {
        console.error("Kunne ikke genskabe korpus fra URL:", e);
        if (!cancelled) setRestoreState("failed");
      } finally {
        clearTimeout(timeout);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [docsKey, data]);

  // Listen for Escape key to unfocus/close selected node details.
  // Modals register their own Escape handler, so this one stands down while one is open;
  // otherwise a single Escape both closes the modal and clears the selection behind it.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (inspectingConflict || isAuditMemoOpen) return;
        setSelectedNode(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [inspectingConflict, isAuditMemoOpen, setSelectedNode]);

  // Memoized: a fresh `t` on every render defeats React.memo on the graph canvases and
  // re-fires their teardown-and-rebuild effects, which include 280 synchronous force ticks.
  const t = useMemo(() => getT(), []);

  if (restoreState === "loading") {
    return <LoadingScreen />;
  }

  if (!data) {
    return (
      <ErrorBoundary t={t}>
        {restoreState === "failed" && (
          <div
            role="alert"
            className="px-6 py-3 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 font-medium flex items-center justify-between gap-4 flex-wrap"
          >
            <span>
              {"Korpusset i linket kunne ikke indlæses. Prøv igen, eller vælg dokumenterne herunder."}
            </span>
            {/* Without this the failure is terminal for the session: the attempt guard is
                keyed on the document set and is otherwise only cleared by "Ny analyse",
                which discards the very corpus the link named. */}
            <button
              type="button"
              onClick={() => {
                restoreAttemptedRef.current = null;
                setRestoreState("idle");
              }}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-amber-100 border border-amber-300 text-xs font-medium text-amber-900 transition-all cursor-pointer shrink-0"
            >
              {"Prøv igen"}
            </button>
          </div>
        )}
        <UploadScreen
          onSuccess={(parsedData, presetIds) => {
            setData(parsedData);
            setCorpusDocIds(presetIds ?? []);
            router.replace(
              `/${toQueryString({ ...DEFAULT_URL_STATE, docs: presetIds ?? [] })}`,
              { scroll: false }
            );
          }}
          t={t}
        />
      </ErrorBoundary>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#fafaf9] text-slate-900 font-sans antialiased">
      {/* Top Header Navigation */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-4 bg-white border-b border-slate-200 z-25 shadow-xs">
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5 text-sky-700" />
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-900">
              {t("appTitle")}
            </h1>
            <p className="text-xs text-slate-500">
              {t("appTagline")}
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 flex-wrap">
          {TAB_TYPES.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
                activeTab === tab
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200/80 font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              {tab === "dashboard" && t("dashboard")}
              {tab === "consolidation" && t("consolidation")}
              {tab === "timeline" && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-sky-700" />
                  {t("timeline")}
                </span>
              )}
              {tab === "citation" && t("citationGraph")}
              {tab === "graph" && t("nodeGraph")}
              {tab === "overlaps" && `${t("overlaps")} (${data.overlaps.length})`}
              {tab === "conflicts" && `${t("conflicts")} (${data.conflicts.length})`}
              {tab === "browse" && t("browse")}
            </button>
          ))}
        </nav>

        {/* Right side controls: About, Audit Memo, and Reset */}
        <div className="flex items-center gap-2.5">
          {/* Explainer link. Opened in a new tab: a hand-uploaded corpus lives only in
              component state, so an in-page navigation away from "/" would discard it. */}
          <Link
            href="/about"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Info className="w-3.5 h-3.5 text-sky-700" />
            {t("aboutButton")}
          </Link>

          {/* Export Legal Audit Memo button */}
          <button
            type="button"
            onClick={() => setIsAuditMemoOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
          >
            <FileText className="w-3.5 h-3.5 text-sky-300" />
            {t("exportAuditMemo")}
          </button>

          {/* New Analysis button */}
          <button
            onClick={() => {
              setData(null);
              setCorpusDocIds([]);
              restoreAttemptedRef.current = null;
              router.replace("/", { scroll: false });
            }}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            {t("newAnalysis")}
          </button>
        </div>
      </header>

      {/* Main Application Container. Each view is wrapped in its own boundary: the whole
          app is one client tree over sections parsed from arbitrary user PDFs, and without
          a boundary a single throw in any view blanks the page rather than one panel.
          Route-level error.tsx cannot do this, the views are query state, not routes.
          The modals below and the upload screen are wrapped for the same reason: they are
          siblings of <main>, so the boundaries in here do not cover them. */}
      <main className="flex-1 flex overflow-hidden">
        {activeTab === "dashboard" && (
          <ErrorBoundary t={t} onReset={() => setSelectedNode(null)}>
            <DashboardView
              data={data}
              setActiveTab={setActiveTab}
              fleetCriteria={fleetCriteria}
              setFleetCriteria={setFleetCriteria}
              t={t}
            />
          </ErrorBoundary>
        )}
        {activeTab === "consolidation" && (
          <ErrorBoundary t={t} onReset={() => setSelectedNode(null)}>
            <ConsolidationView
              data={data}
              selectedNode={selectedNode}
              setSelectedNode={setSelectedNode}
              t={t}
            />
          </ErrorBoundary>
        )}
        {activeTab === "timeline" && (
          <ErrorBoundary t={t} onReset={() => setSelectedNode(null)}>
            <EnforcementTimelineView
              data={data}
              t={t}
              onInspectNode={(nodeLabel) => {
                const found = data.nodes.find(n => n.label.toLowerCase().includes(nodeLabel.toLowerCase()));
                if (found) {
                  setUrlState({ provision: found.id, view: "citation" });
                }
              }}
            />
          </ErrorBoundary>
        )}
        {activeTab === "citation" && (
          <ErrorBoundary t={t} onReset={() => setSelectedNode(null)}>
            <CitationGraphView
              data={data}
              selectedNode={selectedNode}
              activeDocFilter={activeDocFilter}
              activeCategoryFilter={activeCategoryFilter}
              searchQuery={searchQuery}
              fleetCriteria={fleetCriteria}
              setSelectedNode={setSelectedNode}
              t={t}
            />
          </ErrorBoundary>
        )}
        {activeTab === "graph" && (
          <ErrorBoundary t={t} onReset={() => setSelectedNode(null)}>
            <InteractiveGraphView
              data={data}
              selectedNode={selectedNode}
              setSelectedNode={setSelectedNode}
              activeDocFilter={activeDocFilter}
              setActiveDocFilter={setActiveDocFilter}
              activeCategoryFilter={activeCategoryFilter}
              setActiveCategoryFilter={setActiveCategoryFilter}
              fleetCriteria={fleetCriteria}
              t={t}
            />
          </ErrorBoundary>
        )}
        {activeTab === "overlaps" && (
          <ErrorBoundary t={t} onReset={() => setSelectedNode(null)}>
            <OverlapsView
              data={data}
              setSelectedNode={setSelectedNode}
              setActiveTab={setActiveTab}
              t={t}
            />
          </ErrorBoundary>
        )}
        {activeTab === "conflicts" && (
          <ErrorBoundary t={t} onReset={() => setSelectedNode(null)}>
            <ConflictsView
              data={data}
              setSelectedNode={setSelectedNode}
              setActiveTab={setActiveTab}
              onInspectConflict={setInspectingConflict}
              t={t}
            />
          </ErrorBoundary>
        )}
        {activeTab === "browse" && (
          <ErrorBoundary t={t} onReset={() => setSelectedNode(null)}>
            <BrowseView
              data={data}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              setSelectedNode={setSelectedNode}
              setActiveTab={setActiveTab}
              t={t}
            />
          </ErrorBoundary>
        )}
      </main>

      {/* Side-by-Side Legal Conflict Inspector Modal */}
      {inspectingConflict && (
        <ErrorBoundary t={t} onReset={() => setInspectingConflict(null)}>
          <ConflictInspectorModal
            conflict={inspectingConflict}
            data={data}
            onClose={() => setInspectingConflict(null)}
            onSelectNode={(node) => {
              setUrlState({ provision: node.id, view: "citation" });
            }}
            t={t}
          />
        </ErrorBoundary>
      )}

      {/* 1-Click Exportable Legal Audit Memo Modal */}
      {isAuditMemoOpen && (
        <ErrorBoundary t={t} onReset={() => setIsAuditMemoOpen(false)}>
          <AuditMemoModal
            isOpen={isAuditMemoOpen}
            onClose={() => setIsAuditMemoOpen(false)}
            data={data}
            criteria={fleetCriteria}
            t={t}
          />
        </ErrorBoundary>
      )}
    </div>
  );
}
