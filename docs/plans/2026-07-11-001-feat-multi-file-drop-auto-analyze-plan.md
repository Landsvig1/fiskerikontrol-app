# feat: Multi-file drag-and-drop with auto-naming and auto-analyze

---

## Summary

`UploadScreen` (`src/components/UploadScreen.tsx`) currently requires the user to drop exactly one file per slot, manually type a name for each document, and click "Analyse" to run the comparison. This plan adds a single outer drop zone that accepts both PDFs dropped together, auto-assigns them to the existing A/B slots in drop order, auto-derives each document's display name from its filename, and auto-triggers the analysis/graph request as soon as both slots hold a valid file — removing manual steps for the common case while keeping the existing per-slot drop/click/label-edit paths as fallback.

---

## Problem Frame

Today a first-time user must: drop file 1 into slot A, drop file 2 into slot B, type a label for A, type a label for B, then click Analyse — five separate interactions before seeing a graph. The request asks for "drag and drop several documents at once ... it should automatically register the documents, name them and make the graph": one drop, no typing, immediate result.

**Assumption (pipeline/autonomous run — no user available to confirm):** The app's data model and API (`src/app/api/parse/route.ts`, `analyzeCitationsAndBuildGraph` in `src/lib/parser.ts`) are hardwired to exactly two documents, classified as `"control"` vs `"impl"`, with legal-modality cross-referencing defined only between those two roles. Generalizing the graph to an arbitrary N-document set would require rebuilding the citation/conflict model and is a separate, much larger effort. This plan keeps the two-document model and interprets "several documents at once" as: the user drops 2 (or more) files in one gesture; the first two valid PDFs populate slot A and slot B in drop order; any additional files are rejected with a clear message. This is called out explicitly so it can be corrected in a follow-up if the two-document constraint turns out to be wrong.

---

## Requirements

- R1: A single outer drop zone accepts a multi-file drop (or multi-file picker selection) in one gesture.
- R2: When 2+ valid PDF files are dropped/selected together, the first is auto-assigned to slot A and the second to slot B (drop/selection order = file list order).
- R3: If more than 2 files are dropped together, the extra files are ignored and a message tells the user only the first two were used.
- R4: If fewer than 2 valid PDFs are present in a multi-file drop (e.g. only 1, or some were non-PDF), assign what's valid and leave the rest of the existing per-slot flow available; non-PDF files produce the existing invalid-file messaging.
- R5: Each slot's label auto-fills from that file's filename (extension stripped, separators normalized to spaces) the moment the file is assigned — no typing required for the common case.
- R6: A label that the user has manually edited is never silently overwritten by auto-naming (applies to both the multi-drop path and the existing single-slot drop/replace path).
- R7: Once both slots hold a valid file, both labels are non-empty, and there's no size error, the analysis request fires automatically without requiring a click on "Analyse".
- R8: The manual "Analyse" button remains functional and visible for retries, edits, or any path where auto-trigger didn't fire (e.g. user edits a label after auto-fill, or drops files one at a time).
- R9: Existing single-slot drag/drop and click-to-browse behavior (`FileSlot`) is preserved unchanged for users who still drop one file into one slot.

---

## Key Technical Decisions

**KTD1: Outer drop zone wraps the existing two `FileSlot`s rather than replacing them.**
A new drop-capable container (the form/card region) handles `onDrop` for multi-file drops and delegates to the same `handleFileA`/`handleFileB` validation logic already in `UploadScreen`. The individual `FileSlot` drop zones keep working exactly as today. This avoids touching `FileSlot`'s internals and keeps the two-document assignment logic in one place (`UploadScreen`), where slot state already lives.

**KTD2: Filename → label derivation is a pure helper, not inlined.**
Add `deriveLabelFromFilename(filename: string): string` to `src/lib/i18n.ts` or a new small `src/lib/labels.ts` (implementer's call — `src/lib/labels.ts` preferred since this isn't translation logic). Strip the `.pdf` extension, replace `_`/`-`/multiple spaces with a single space, trim, and title-case each word. Keep it deterministic and side-effect-free so it's trivially unit-testable.

**KTD3: Track label "touched" state per slot to satisfy R6.**
Add `labelATouched`/`labelBTouched` boolean state (default `false`). Auto-naming only writes to `labelAInput`/`labelBInput` when the corresponding touched flag is `false`. Any manual `onChange` on a label input sets its touched flag to `true` permanently for that document instance. When a *new* file replaces an existing one in a slot (drop or multi-drop), reset that slot's touched flag to `false` so the new file's name auto-fills again — a fresh file is a fresh naming opportunity, but user edits during the current file's lifetime are respected.

**KTD4: Auto-trigger reuses the existing `handleSubmit` logic via a `useEffect`, gated to fire once per completed pair.**
Add a `useEffect` watching `[fileA, fileB, labelAInput, labelBInput, sizeError, loading]`. When `canSubmit` becomes true AND a `autoTriggerArmedRef` flag is set, call the submit logic and clear the flag. The flag is armed only inside the multi-file drop handler (after successfully assigning both slots) and inside the single-slot handlers when assigning a file completes the second slot — i.e., auto-trigger fires the moment both slots become simultaneously valid for the first time, not on every subsequent render or label edit. This satisfies R7 (auto-fire on completion) and R8 (manual button still works for retries — retries don't re-arm the flag, so a failed auto-submit doesn't loop).

**KTD5: Submit logic is extracted from the form's `onSubmit` handler into a plain async function.**
`handleSubmit(e: React.FormEvent)` currently reads `e.preventDefault()` then runs the request. Split into `runAnalysis(): Promise<void>` (the actual fetch/validate logic) and a thin `onSubmit` wrapper that calls `e.preventDefault()` then `runAnalysis()`. The `useEffect` from KTD4 calls `runAnalysis()` directly. This is a small refactor of existing code, not new behavior.

---

## Implementation Units

### U1. Filename-to-label helper

**Goal:** Deterministic function to derive a human-readable label from a PDF filename.

**Requirements:** R5

**Dependencies:** none

**Files:**
- `src/lib/labels.ts` (new)
- `src/lib/labels.test.ts` (new)

**Approach:** Export `deriveLabelFromFilename(filename: string): string`. Strip a trailing `.pdf`/`.PDF` extension, replace `_` and `-` and repeated whitespace with a single space, trim, and title-case each word (uppercase first letter, keep the rest as-is so existing acronyms like "EU" aren't mangled — only touch the first character of each word). Return an empty string for an empty/whitespace-only input so callers can fall back to existing `docA`/`docB` i18n defaults.

**Patterns to follow:** Existing pure-function style in `src/lib/graphFilter.ts` and `src/lib/graphColors.ts` (small, typed, no side effects).

**Test scenarios:**
- `Regulation_2024_1143.pdf` → `Regulation 2024 1143`
- `implementation-decision-2019.pdf` → `Implementation Decision 2019`
- `Doc.PDF` (mixed-case extension) → `Doc`
- `multiple   spaces  and_underscores.pdf` → `Multiple Spaces And Underscores` (collapsed whitespace)
- `.pdf` (empty basename) → `""`
- `no-extension` (no `.pdf` suffix present) → `No Extension` (function only strips the extension if present; doesn't require it)

**Verification:** Unit tests pass; function has no dependency on DOM or React.

---

### U2. Label "touched" tracking in `UploadScreen`

**Goal:** Auto-naming never overwrites a label the user typed themselves, per file instance.

**Requirements:** R6

**Dependencies:** U1

**Files:**
- `src/components/UploadScreen.tsx`

**Approach:** Add `labelATouched`/`labelBTouched` state, both `false` initially. In the label `<input>` `onChange` handlers, set the corresponding touched flag to `true` before updating the label value. In `handleFileA`/`handleFileB` (called whenever a file is assigned to a slot, whether via single-slot drop, click-to-browse, or the new multi-drop path from U3), after validating the file: if the slot's touched flag is `false`, call `setLabelAInput(deriveLabelFromFilename(file.name))` (or B); always reset the touched flag to `false` when a *new* File object replaces the slot's current file (KTD3) — track this by comparing against the previous file reference, not by unconditionally resetting on every call.

**Patterns to follow:** Existing `handleFileA`/`handleFileB` validation shape (type check → set error or set file).

**Test scenarios:**
- Drop file into slot A with an empty label input → label auto-fills from filename.
- Drop file into slot A, then manually edit the label, then drop a *different* file into slot A again → label auto-fills again from the new filename (fresh file resets touched).
- Drop file into slot A, manually edit the label without changing the file → label is not overwritten by any subsequent auto-naming attempt for the same file.
- Multi-drop assigns both slots with untouched labels → both labels auto-fill (Covers R5, R6 together).

**Verification:** Behavior confirmed via component test using `@testing-library/react` (existing devDependency; project has no prior component test file — this is the first, and should follow Vitest + `@testing-library/react` + `@testing-library/jest-dom` conventions already present in `package.json`/`vitest.config.ts`).

---

### U3. Outer multi-file drop zone and first-two-files assignment

**Goal:** A single drop gesture (or file picker with multi-select) carrying 2+ PDFs assigns the first two to slot A/B in order, and surfaces a message when extra files are dropped.

**Requirements:** R1, R2, R3, R4, R9

**Dependencies:** U2

**Files:**
- `src/components/UploadScreen.tsx`
- `src/lib/i18n.ts`

**Approach:** Add `onDragOver`/`onDrop` handlers to the card container (the `<div>` wrapping the `<form>`, or the `<form>` itself) that is currently static. On drop, read `e.dataTransfer.files` (a `FileList`), convert to an array, and only engage the multi-assign path when `files.length > 1` — a single-file drop on the outer zone should still work but doesn't need new messaging beyond what a slot-level drop already provides, so route a single file to whichever slot is empty (A first, then B) using the existing `handleFileA`/`handleFileB`. For `files.length > 1`: filter to `application/pdf`, take the first two valid PDFs (in list order) and assign to slot A and slot B via `handleFileA`/`handleFileB` respectively (overwriting whatever was already there), and if `files.length > 2` or any files were filtered out as non-PDF, set a new `multiDropNotice` state string (new i18n key, e.g. `multiDropExtraFilesIgnored`) shown near the drop zones. Keep existing per-`FileSlot` drop handlers untouched (R9) — the outer handler only needs `stopPropagation`/ordering considerations if event bubbling would double-handle a drop that lands directly on a `FileSlot`; verify during implementation whether `FileSlot`'s own `onDrop` (which calls `e.preventDefault()`) already stops the outer handler from firing for slot-targeted drops, since React's synthetic event system bubbles by default unless `stopPropagation` is called.

**Technical design (directional):**
```
outerDrop(files):
  if files.length == 1:
    assign to first empty slot (A, then B) via existing handleFileX
    return
  pdfFiles = files.filter(f => f.type == "application/pdf")
  [first, second, ...rest] = pdfFiles
  if first:  handleFileA(first)
  if second: handleFileB(second)
  extraCount = files.length - pdfFiles.slice(0,2).length
  if extraCount > 0 or files.length > pdfFiles.length:
    setMultiDropNotice(t("multiDropExtraFilesIgnored"))
  else:
    setMultiDropNotice(null)
```

**Patterns to follow:** `FileSlot`'s existing `handleDrop`/`handleDragOver`/`handleDragLeave` pattern for drag-state styling; `src/lib/i18n.ts`'s existing key/value structure for the new notice string (add to the shared type union, the `da` object, and the `en` object, following the placement of neighboring keys like `sizeLimitError`).

**Test scenarios:**
- Drop 2 valid PDFs together → slot A gets the first, slot B gets the second, no notice shown (Covers R2).
- Drop 3 valid PDFs together → first two assigned, notice shown naming that extra files were ignored (Covers R3).
- Drop 2 files where one is a `.docx` and one is a `.pdf` → the PDF is assigned to slot A, notice indicates a file was ignored (Covers R4).
- Drop 1 valid PDF onto the outer zone with both slots empty → assigned to slot A (existing single-slot UX preserved for the outer zone too).
- Drop 1 valid PDF directly onto `FileSlot` B → only slot B updates, slot A and the outer-zone multi-assign path are unaffected (Covers R9 — no regression in existing per-slot behavior).
- Select 2 files via a multi-select file picker (if implemented) behaves identically to a 2-file drop.

**Verification:** Component test exercises a simulated `drop` event with a multi-file `DataTransfer` mock; assert both slots populate and the notice appears/disappears correctly.

---

### U4. Auto-trigger analysis on slot completion

**Goal:** Once both slots hold a valid file with non-empty labels and no size error, the analysis request fires without a manual click.

**Requirements:** R7, R8

**Dependencies:** U3

**Files:**
- `src/components/UploadScreen.tsx`

**Approach:** Per KTD5, extract the existing `handleSubmit` body (everything after `e.preventDefault()`) into `runAnalysis(): Promise<void>`; the form's `onSubmit` becomes `(e) => { e.preventDefault(); runAnalysis(); }`. Per KTD4, add an `autoTriggerArmedRef = useRef(false)`. Set it to `true` at the end of the outer multi-drop handler (U3) once both slots end up populated after the assignment, and also at the end of `handleFileA`/`handleFileB` when that call causes the *second* previously-empty slot to become filled (covers sequential single-slot drops completing the pair, not just multi-drop). Add a `useEffect` on `[fileA, fileB, labelAInput, labelBInput, sizeError, loading]` that checks: if `autoTriggerArmedRef.current` and `canSubmit` is true, set `autoTriggerArmedRef.current = false` and call `runAnalysis()`. If a labeled auto-trigger fails (network/parse error), `submitError` is set as today and the flag stays cleared — the user retries via the manual button (R8), no re-trigger loop.

**Patterns to follow:** Existing `useEffect` for `sizeError` computation in the same component (same dependency-array style).

**Test scenarios:**
- Multi-drop 2 valid PDFs with auto-filled labels → `fetch` to `/api/parse` is called automatically without a button click (Covers R7).
- Drop file into slot A, then slot B sequentially (not via multi-drop) → analysis still auto-fires once both are valid (sequential completion also arms the trigger).
- Multi-drop 2 valid PDFs, then user edits label A before the request would have fired (if there's any synchronous window) → edited label value is what gets submitted, not a stale one (auto-trigger reads current state at fire time, not a snapshot).
- Auto-triggered request fails (mock a non-OK response) → `submitError` shows exactly as it does for a manual submit today; clicking "Analyse" manually afterward retries successfully without needing another drop.
- Manually editing a label after auto-fill, when the edit does not complete a previously-incomplete pair (e.g. both slots were already filled and it already auto-fired) → does not re-trigger a duplicate request.

**Verification:** Component test mocks `global.fetch`, drops two files, and asserts `fetch` was called with the expected `FormData` keys (`pdfA`, `pdfB`, `labelA`, `labelB`) without simulating a click on the submit button.

---

## Scope Boundaries

**In scope:** Multi-file drop UX, filename-based auto-naming, auto-triggered analysis — all within the existing two-document (`control`/`impl`) model in `src/components/UploadScreen.tsx`, `src/lib/i18n.ts`, and a new `src/lib/labels.ts`.

**Out of scope / not touched:**
- The N-document graph model. `analyzeCitationsAndBuildGraph`, `GraphData`, and the D3/citation graph views (`src/app/page.tsx`, `src/components/CitationGraphView.tsx`) assume exactly two documents (`control` vs `impl`) and are unchanged by this plan.
- Persisting uploaded documents (no Supabase/database in this repo today; out of scope per the original `docs/plans/dynamic_pdf_upload_plan.md` and unchanged here).
- The `/api/parse` route contract (`pdfA`/`pdfB`/`labelA`/`labelB` FormData fields) — unchanged; this plan only changes how those fields get populated client-side.
- OCR or non-text-layer PDF handling.

### Deferred to Follow-Up Work

- True N-document support (arbitrary document count, not just A/B) would require redesigning the citation/conflict data model and is a separate, larger effort — flagged in Problem Frame as an assumption to revisit if this plan's 2-document interpretation is wrong.
- A visible upload progress/queue indicator for the auto-triggered request (today's `loading` spinner state is reused as-is; no new progress UI is added).

---

## Risks & Dependencies

- **Event-bubbling collision (U3):** The outer drop zone and each `FileSlot`'s own drop handler could both fire for the same drop event depending on where exactly the user releases the file, since `FileSlot` is nested inside the outer zone. Verify during implementation (called out in U3's Approach) and add `e.stopPropagation()` at the `FileSlot` level if double-handling occurs.
- **Auto-submit surprise:** Auto-firing the request removes the "review before submit" step users have today. Mitigated by R8 (manual retry always available) and by auto-naming being visible immediately (user sees both files and derived names appear before the request completes, since `loading` state still renders the existing spinner).
- **No new external dependency, no schema/API change** — risk is contained to one component and one small new helper file.

---

## Sources & Research

- Local repo research: `src/components/UploadScreen.tsx`, `src/app/api/parse/route.ts`, `src/lib/parser.ts`, `src/app/page.tsx`, `src/lib/i18n.ts`, `package.json`, `vitest.config.ts`, `docs/plans/dynamic_pdf_upload_plan.md` (prior, already-implemented plan for the base two-document upload flow — read for context, not carried forward as an origin document since it predates and doesn't cover this feature).
- No external research performed — this is a self-contained UI/state change with no new library, security, or infrastructure surface; local patterns (existing drag-and-drop, i18n, and test conventions) were sufficient.
