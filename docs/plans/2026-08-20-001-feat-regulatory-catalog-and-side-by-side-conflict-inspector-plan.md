# feat: Preset Regulatory Document Catalog & Side-by-Side Legal Conflict Inspector

**Date:** 2026-08-20  
**Target repo:** fiskerikontrol-app (LexGraph)  
**Origin:** `docs/brainstorms/2026-08-20-regulatory-catalog-and-side-by-side-conflict-inspector-requirements.md`

---

## 1. Summary

This plan implements two major capabilities in LexGraph (`fiskerikontrol-app`) to prepare the application for domain stakeholders and leadership at Fiskeristyrelsen:
1. **Preset Regulatory Document Catalog on the Upload Screen:** A quick-select grid of pre-bundled, authentic fisheries control regulations (EU 2023/2842, BEK 1197/2025, BEK 1144/2025, Fiskeriloven LBK 205/2023) with 1-click multi-selection and an instant **"Analysér valgte (N)"** trigger, eliminating live PDF upload drag-and-drop friction while preserving custom PDF upload capabilities.
2. **Side-by-Side Legal Text Comparison & Diff Inspector:** A dedicated dual-pane comparison modal triggered from the Conflicts view and Citation Graph that presents full statutory text of both the Base Regulation article and the Derogating/Conflicting article side-by-side, complete with color-coded in-text modal keyword highlighting and an executive plain-language conflict explanation banner.

---

## 2. Problem Frame & Scope

### Current Limitations
- **Presentation Latency & Friction:** A presenter must manually locate and drag 2+ local PDF files into the browser. In live executive or stakeholder demos, this introduces upload latency, missing file risks, and awkward silence.
- **Verification Gap:** The current Conflicts tab (`ConflictsView`) only displays short, 120-character citation context snippets (`...context...`). Legal officers and inspection authorities cannot see the full text of the conflicting provisions side-by-side to verify the statutory friction immediately.

### Scope Boundaries
- **In Scope:**
  - Curated preset regulatory PDF/text assets in `public/corpus/` and registry metadata in `src/lib/presetCorpus.ts`.
  - Quick-select catalog cards on `src/components/UploadScreen.tsx` with instant 1-click analysis.
  - Dedicated dual-pane `ConflictInspectorModal` component with in-text modal keyword highlighting and copyable legal summary.
  - Integration of the inspector into `ConflictsView` (in `src/app/page.tsx`) and `CitationGraphView.tsx`.
  - Bilingual localization (`src/lib/i18n.ts`) in Danish and English.
  - Full unit, component, and integration tests in Vitest.
- **Out of Scope:**
  - Live AI/LLM API calls during parsing (all processing remains deterministic in TypeScript for instant speed and offline reliability).
  - Database persistence (remains in-memory / zero data retention).

---

## 3. Key Technical Decisions (KTDs)

**KTD1: Preset Corpus Bundling via Static Asset Endpoint & In-Memory Deserialization**
- Store pre-bundled PDFs in `public/corpus/` and export a typed registry `PRESET_DOCUMENTS: PresetDoc[]` from `src/lib/presetCorpus.ts`.
- When a user selects preset documents and clicks "Analysér valgte (N)", `UploadScreen` fetches the static files as `Blob`s and passes them directly to `runAnalysis` using the existing `/api/parse` multipart form contract (`pdf0..pdfN`, `label0..labelN`). This guarantees 100% architectural parity between preset analysis and custom upload analysis.

**KTD2: Highlight Tokenizer for In-Text Modal Highlighting**
- Create `src/lib/highlightText.tsx` export `highlightModalKeywords(text: string, lang: Lang): React.ReactNode`.
- Uses regex tokenization on known Danish and English modal keywords (`skal`, `must`, `pligtig` $\rightarrow$ blue; `fritages`, `undtagen`, `uanset`, `dispensation`, `derogation` $\rightarrow$ red/amber; `forbudt`, `må ikke`, `shall not` $\rightarrow$ dark red; `kan`, `tilladt`, `may` $\rightarrow$ green) to wrap occurrences in styled `<span>` highlights without modifying the underlying text.

**KTD3: Standalone `ConflictInspectorModal` with Full Node Text Access**
- Create `src/components/ConflictInspectorModal.tsx` as a focused modal component.
- Accepts `conflict: ConflictRecord`, `data: GraphData`, `onClose: () => void`, `onSelectNode: (node: GraphNode) => void`, `t: TranslateFn`, and `lang: Lang`.
- Resolves both `targetNode` (base provision) and `sourceNode` (derogating/conflicting provision) from `data.nodes`, rendering their full `.body` side-by-side with sticky headers and highlighted keywords.

**KTD4: Seamless Integration into `ConflictsView` and `CitationGraphView`**
- Replace the simple snippet cards in `ConflictsView` with an enhanced card that features an **"Inspicer modstrid"** primary action button.
- Clicking the button opens the `ConflictInspectorModal`.
- Support `Escape` key and click-outside backdrop dismiss.

---

## 4. Implementation Units

### U1: Preset Corpus Registry & Static Assets
**Goal:** Supply authentic Danish fisheries regulatory documents in `public/corpus/` and define the preset catalog metadata.
**Files:**
- `public/corpus/eu-2023-2842-kontrolrevision.pdf` (copied from adjacent corpus `OJ_L_202302842_DA_TXT.pdf`)
- `public/corpus/bek-1197-2025-logbog.pdf` (copied from `BEK-1197-2025_foering-af-logbog.pdf`)
- `public/corpus/bek-1144-2025-landingskontrol.pdf` (copied from `BEK-1144-2025_registrering-kontrol-landet-importeret-fisk.pdf`)
- `public/corpus/lbk-205-2023-fiskeriloven.pdf` (copied from `fiskeriloven_LBK-205-2023.pdf`)
- `src/lib/presetCorpus.ts` (new)
- `src/lib/presetCorpus.test.ts` (new)

**Approach:**
- Define `interface PresetDoc { id: string; filename: string; titleDa: string; titleEn: string; code: string; type: "eu" | "bek" | "lov"; descriptionDa: string; descriptionEn: string; path: string; }`.
- Export `PRESET_DOCUMENTS: PresetDoc[]`.
- Provide helper function `fetchPresetFiles(presetIds: string[]): Promise<Array<{ file: File; label: string }>>`.

---

### U2: Quick-Select Document Catalog in `UploadScreen`
**Goal:** Add the preset document picker cards to `UploadScreen` with toggle selection and instant "Analysér valgte" action.
**Files:**
- `src/components/UploadScreen.tsx`
- `src/lib/i18n.ts`
- `src/components/UploadScreen.test.tsx`

**Approach:**
- Render a "Vælg fra reguleringsarkiv" / "Preset Regulatory Library" section at the top of the upload form.
- Clicking a preset card toggles its inclusion in `selectedPresetIds`.
- Display a prominent action button: `Analysér valgte (${selectedPresetIds.length} dokumenter)` when $\ge 2$ presets are selected.
- Clicking the button loads the preset files, populates slots (or directly submits), and invokes `runAnalysis`.
- Keep existing Bulk and Individual drop zones fully functional for custom files.

---

### U3: Modal Keyword Highlighter Helper
**Goal:** Create a pure, reusable React text highlighter for modal legal keywords.
**Files:**
- `src/lib/highlightText.tsx` (new)
- `src/lib/highlightText.test.tsx` (new)

**Approach:**
- Tokenize string with regex matching `EXCEPTION_RE`, `PROHIBITION_RE`, `PERMISSION_RE`, `OBLIGATION_RE`.
- Wrap matched terms with semantic Tailwind classes and tooltips.
- Non-matching text rendered as plain strings to prevent DOM overhead.

---

### U4: Dual-Pane `ConflictInspectorModal` Component
**Goal:** Create the side-by-side legal text comparison modal.
**Files:**
- `src/components/ConflictInspectorModal.tsx` (new)
- `src/components/ConflictInspectorModal.test.tsx` (new)

**Approach:**
- Top header: Conflict title, doc badges, close button.
- Top banner: Plain-language summary explaining the legal friction (which rule mandates vs which exempts).
- Split dual-pane grid:
  - Left: Base article (e.g. EU 2023/2842 Art. 14) with full text and highlighted keywords.
  - Right: Derogating article (e.g. BEK 1197/2025 § 4) with full text and highlighted keywords.
- Bottom actions: "Vis i graf" (jump to node), "Kopier sammendrag" (copy conflict brief to clipboard).

---

### U5: View Integration & Bilingual Localization
**Goal:** Wire `ConflictInspectorModal` into `ConflictsView`, `OverlapsView`, and `CitationGraphView`, and add all DA/EN strings.
**Files:**
- `src/app/page.tsx`
- `src/components/CitationGraphView.tsx`
- `src/lib/i18n.ts`

**Approach:**
- Add `inspectingConflict: ConflictRecord | null` state to `Home` / `ConflictsView`.
- Wire "Inspicer modstrid" button on each conflict card in `ConflictsView`.
- Add all new translation keys (`presetLibraryTitle`, `presetLibrarySubtitle`, `analyzePresets`, `inspectConflict`, `conflictSummaryBanner`, `baseProvision`, `derogatingProvision`, `copyConflictBrief`, `copiedToClipboard`, etc.).

---

## 5. Verification & Test Plan

1. **Unit & Component Tests (Vitest):**
   - `src/lib/presetCorpus.test.ts`: Verify all preset metadata and file paths are valid.
   - `src/lib/highlightText.test.tsx`: Verify keyword matching and color class assignments in Danish & English.
   - `src/components/ConflictInspectorModal.test.tsx`: Test rendering, dual-pane layout, keyword highlights, copy button, and Escape key dismissal.
   - `src/components/UploadScreen.test.tsx`: Test preset selection, "Analysér valgte" execution, and coexistence with custom PDF drop.
2. **End-to-End Build & Validation:**
   - `npm test` passes 100% with all existing 62 tests + new tests.
   - `npx next build` succeeds cleanly with zero TypeScript errors.
