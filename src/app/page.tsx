"use client";

import React, { Suspense, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MatrixExplorer } from "@/components/MatrixExplorer";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { getT } from "@/lib/i18n";
import { parseAppUrlState, toQueryString } from "@/lib/urlState";
import { TimelineYear } from "@/lib/matrixData";
import type { TabType } from "@/lib/urlState";
import type { DocRef } from "@/lib/docDisplay";
import type {
  GraphNode,
  GraphLink,
  OverlapRecord,
  ConflictRecord,
  GraphData,
} from "@/lib/types";

export type {
  TabType,
  DocRef,
  GraphNode,
  GraphLink,
  OverlapRecord,
  ConflictRecord,
  GraphData,
};

export default function Home() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <MatrixApp />
    </Suspense>
  );
}

function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#070d0a] text-emerald-300 font-sans">
      <div className="w-10 h-10 border-3 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin mb-4" />
      <span className="text-sm font-semibold tracking-wide uppercase">Indlæser Fiskeriets Matrix...</span>
    </div>
  );
}

function MatrixApp() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useMemo(() => getT(), []);

  const searchString = searchParams.toString();
  const urlState = useMemo(
    () => parseAppUrlState(new URLSearchParams(searchString)),
    [searchString]
  );

  const handleSelectNode = useCallback(
    (nodeId: string | null) => {
      const next = { ...urlState, matrixNode: nodeId };
      router.replace(`/${toQueryString(next)}`, { scroll: false });
    },
    [router, urlState]
  );

  const handleSelectYear = useCallback(
    (year: TimelineYear) => {
      const next = { ...urlState, matrixYear: year };
      router.replace(`/${toQueryString(next)}`, { scroll: false });
    },
    [router, urlState]
  );

  return (
    <ErrorBoundary t={t}>
      <MatrixExplorer
        selectedNodeId={urlState.matrixNode}
        selectedYear={urlState.matrixYear}
        onSelectNode={handleSelectNode}
        onSelectYear={handleSelectYear}
      />
    </ErrorBoundary>
  );
}
