# Technical Plan: Enforcement Timeline, Fleet Profile Filtering & Legal Audit Memo Export

**Date**: 2026-08-20  
**Branch**: `feature/regulatory-catalog-conflict-inspector`  
**Status**: Ready for Implementation  

---

## 1. Problem Frame & Objectives

While the application accurately parses citations and flags modality conflicts between regulatory documents, executive leadership and fisheries caseworkers require three operational capabilities to make the analysis actionable:

1. **Enforcement Timeline & Milestone Staggering**: Understanding when new EU and national control mandates (e.g. VMS for `<12m` in 2026, e-logbooks in 2028, REM CCTV) take legal effect.
2. **Fleet & Scenario Profiling**: Filtering requirements, citations, and conflicts by vessel length (`<8m`, `8-12m`, `12-18m`, `>18m`), gear type (passive vs active), and sea area (Nordsøen, Kattegat, Østersøen).
3. **1-Click Exportable Legal Audit Memo**: Generating a formal, print-ready and downloadable compliance memo with official authority headers, structured conflict findings, and caseworker sign-off blocks.

---

## 2. Requirements & Architecture

### Unit 1: Fleet & Scenario Profiler (`src/lib/fleetFilter.ts`, `src/components/FleetFilterBar.tsx`)
- **Profile Dimensions**:
  - `vesselLength`: `"all" | "under_8m" | "8_12m" | "12_18m" | "over_18m"`
  - `gearType`: `"all" | "passive_nets" | "active_trawl" | "seine" | "traps"`
  - `seaArea`: `"all" | "north_sea" | "kattegat" | "baltic" | "inshore"`
- **Matching Engine**: Evaluates section body text, titles, and citations against domain lexicons (e.g. "8 m", "12 meter", "garn", "trawl", "Skagerrak", "Østersøen").
- **Integration**: Filter applies across Dashboard metrics, Overlaps, Conflicts, Timeline, and Audit Memo.

### Unit 2: Enforcement Timeline (`src/lib/timelineData.ts`, `src/components/EnforcementTimelineView.tsx`)
- **Milestone Engine**: Parses dates, transitional arrangements (*overgangsordninger*), and enforcement deadlines from EU 2023/2842, EU 1224/2009, BEK 1197/2025, and BEK 1144/2025.
- **UI Components**:
  - Chronological interactive milestone roadmap with status indicators (`Aktiv / I kraft`, `Kommende frist`, `Overgangsordning`).
  - Filtering by selected document and fleet segment.
  - Direct connection to inspect relevant statutory articles.

### Unit 3: 1-Click Exportable Legal Audit Memo (`src/lib/generateAuditMemo.ts`, `src/components/AuditMemoModal.tsx`)
- **Output Formats**:
  - Direct Print / Save to PDF (`window.print()` with dedicated `@media print` clean layout).
  - Copy as Markdown (`.md`) to clipboard.
  - Download formal Markdown report.
- **Structure**:
  - Formal authority header (*Fiskerikontrol & Lovoverholdelse Notat*).
  - Executive summary and active fleet profile.
  - Verified cross-reference table.
  - Detailed conflict findings with statutory excerpts.
  - Caseworker sign-off & date block.

---

## 3. Implementation Units & File Map

| Unit | File Paths | Purpose |
|------|------------|---------|
| **1. Fleet Filter Engine** | `src/lib/fleetFilter.ts`<br>`src/lib/fleetFilter.test.ts`<br>`src/components/FleetFilterBar.tsx` | Domain matching logic & sleek UI filter bar |
| **2. Timeline Engine** | `src/lib/timelineData.ts`<br>`src/lib/timelineData.test.ts`<br>`src/components/EnforcementTimelineView.tsx` | Timeline milestone dataset, status calculator, & interactive view |
| **3. Audit Memo Generator** | `src/lib/generateAuditMemo.ts`<br>`src/lib/generateAuditMemo.test.ts`<br>`src/components/AuditMemoModal.tsx` | Report builder, print stylesheet, & export modal |
| **4. Integration & Navigation** | `src/app/page.tsx`<br>`src/lib/i18n.ts` | Connect timeline tab, fleet bar in top nav, & audit modal trigger |

---

## 4. Test Scenarios

1. `fleetFilter.test.ts`:
   - Matches vessel lengths `<8m`, `8-12m`, `>12m` correctly from statutory Danish text.
   - Matches gear types (garn, bundtrawl, snurrevod) and areas (Kattegat, Østersøen).
   - "All" filter passes all sections without exclusion.
2. `timelineData.test.ts`:
   - Computes correct milestone status based on target date (past vs future).
   - Extracts relevant milestones for EU 2023/2842 and BEK 1197/2025.
3. `generateAuditMemo.test.ts`:
   - Generates valid markdown document with all conflict sections, citations, and authority headers.
4. UI Tests:
   - Verify modal opening, print triggers, timeline rendering, and tab switching.
