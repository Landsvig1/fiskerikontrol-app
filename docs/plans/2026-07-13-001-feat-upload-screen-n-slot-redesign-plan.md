# feat: Upload screen bulk/individual N-slot redesign

**Target repo:** fiskerikontrol-app (LexGraph)

## Summary

LexGraph's citation-graph engine, API contract, and rendering pipeline were already generalized from exactly 2 documents to an arbitrary N (N≥2) in two prior stages, currently uncommitted on `main`. `src/components/UploadScreen.tsx` is the one remaining piece still hardcoded to a fixed 2-slot form (`fileA`/`fileB`). This plan redesigns the upload screen into two toggle-able modes — a default "Bulk" drop zone that accepts any number of PDFs at once, and an "Individual" mode with per-document slots and a "+" button to add more — so the UI finally exposes the N-document capability the backend already supports.

---

## Problem Frame

The frontpage upload flow still reads and behaves as a 2-document tool: two named slots, two label inputs, copy that says "Upload two PDF documents." Nothing in the UI lets a user compare 3+ regulatory documents, even though `/api/parse/route.ts` already accepts indexed `pdf0..pdfN`/`label0..labelN` fields and `analyzeCitationsAndBuildGraph` already resolves citations across an arbitrary document set. This plan closes that gap on the frontend only — no backend or rendering-pipeline changes are needed (both already merged in prior stages).

---

## Requirements

- R1: A "Bulk" drop mode (default) accepts any number of PDFs dropped together, assigns each to a slot in drop order, auto-derives each slot's label from its filename (via the existing `deriveLabelFromFilename`), and auto-fires analysis once ≥2 slots hold a valid file and non-empty label — mirroring today's auto-fire behavior, generalized from 2 slots to N.
- R2: An "Individual" drop mode shows one labeled drop slot per document (starting at 2, matching today's layout) plus a "+ Add document" control that appends another empty slot, up to a soft cap of 12.
- R3: In Individual mode, a slot can be removed via a "×" affordance once slot count exceeds 2; the minimum of 2 slots (matching the backend's `docs.length >= 2` requirement) can never be removed below.
- R4: Switching between Bulk and Individual is non-destructive — both modes render the same underlying slot array, so already-dropped files and labels survive a toggle in either direction, and toggling to Individual always shows the full current slot count (not a reset to 2) when more than 2 slots already exist.
- R5: All existing safeguards generalize to N slots: the 10MB combined-size cap, the in-flight (`loading`) guard that blocks new drops/removals/mode-switches/adds during an active submit, the manual-label-edit-disarms-auto-fire behavior, and the same-file-redrop-preserves-manual-label behavior.
- R6: A bulk drop of non-PDF files alongside valid PDFs still assigns the PDFs and shows a "non-PDF files were ignored" notice; a bulk drop that would exceed the 12-slot soft cap truncates to 12 and shows a "only the first N were used" notice.
- R7: i18n copy (`uploadSubtitle`, the extra-files notice, slot labels/placeholders) no longer hardcodes "two" and generalizes to N via a parameterized fallback pattern, consistent with `docFallback` already introduced for the rendering pipeline.

---

## Key Technical Decisions

**KTD1 — Slot state as a single array of objects, not parallel arrays.** Model each slot as `{ file: File | null, label: string, labelTouched: boolean, error: string | null }` in one `SlotState[]` array, and remove a slot via splice (not null-out). Parallel arrays keyed by index would let a removed-and-reused index silently inherit a stale `labelTouched` flag from whatever previously sat at a higher index; a single array of objects makes that impossible by construction, and splice-on-remove keeps `slots.length` the single source of truth for both the soft cap and the ≥2 floor.

**KTD2 — Label state moves from `page.tsx` into `UploadScreen`.** `page.tsx` currently lifts `labelAInput`/`labelBInput` as props purely to pass them through to `UploadScreen` — nothing else in `page.tsx` reads them (confirmed by direct grep). With N slots, two named string props can't represent the array. Fold this state entirely into `UploadScreen` as local `slots` state; drop the four lifted props (`labelAInput`, `setLabelAInput`, `labelBInput`, `setLabelBInput`) from `UploadScreenProps` and from the `page.tsx` call site.

**KTD3 — `onSuccess` drops its unused `labelA`/`labelB` args.** `page.tsx`'s current `onSuccess={(parsedData) => {...}}` already ignores the 2nd/3rd arguments the callback receives today. Since `GraphData.docs: DocRef[]` (from the prior stage) already carries every document's label, the new signature is simply `onSuccess: (data: GraphData) => void` — no replacement array argument needed.

**KTD4 — Bulk-mode drop semantics: fill empty slots first, then append.** On a Bulk-zone drop of files `[f1..fn]`: filter to PDFs, walk the existing slot array left-to-right filling empty slots first, then append any remaining PDFs as new slots (respecting the 12-slot cap). Existing filled slots are never overwritten or reordered by a bulk drop. This makes Bulk and Individual genuinely two views over the same array (per R4) rather than two divergent data flows — dropping 2 more files in Bulk mode after having 4 slots from Individual mode just appends slots 5 and 6.

**KTD5 — One shared `autoTriggerArmedRef`, arm/disarm rules generalized.** Arm after any drop event that leaves ≥2 slots filled (not only the drop that completes the very last empty slot — re-arms on a 3rd+ drop too, matching today's re-derivation-on-redrop precedent). Disarm on: manual label edit on any slot (existing rule, generalized from per-slot to array-wide), slot removal, and mode toggle. Removal and mode-toggle disarm because both are deliberate structural edits, not data-entry actions — auto-firing immediately after either would surprise the user.

**KTD6 — `canSubmit` requires every slot filled, not just enough slots.** `slots.length >= 2 && slots.every(s => s.file !== null && s.label.trim().length >= 1) && !sizeError && !loading`. A partially-filled added slot blocks submit rather than being silently excluded — matches today's existing "both slots must be filled" semantics, just generalized to N. An Individual-mode user who clicks "+" but doesn't fill the new slot must remove it or fill it before submitting.

**KTD7 — i18n: index-parameterized fallback strings instead of new fixed A–Z keys.** Slot placeholder/label copy is built client-side as `` `${t("docFallback")} ${i + 1}` `` — mirroring the pattern `docDisplay.ts`'s `docLabel()` already established for the rendering pipeline — rather than adding `dropZoneC`, `dropZoneD`, etc. `dropZoneA`/`dropZoneB`/`labelA`/`labelB` are removed from `TranslationKey` in favor of one generic `dropZoneSlot` key reused for every slot. `uploadSubtitle` and the extra-files notice are reworded to drop the hardcoded "two."

---

## Implementation Units

### U1. Generalize `UploadScreen` state to an N-length slot array

**Goal:** Replace the fixed `fileA`/`fileB`/`errorA`/`errorB`/`labelATouched`/`labelBTouched` state with a single `SlotState[]` array (KTD1), and fold label state out of `page.tsx` into `UploadScreen` (KTD2, KTD3).

**Requirements:** R1, R5; KTD1, KTD2, KTD3

**Dependencies:** none

**Files:**
- `src/components/UploadScreen.tsx` (modify)
- `src/app/page.tsx` (modify — drop `labelAInput`/`labelBInput`/setters and the corresponding `UploadScreen` props)
- `src/components/UploadScreen.test.tsx` (modify — update `renderUploadScreen`/`Wrapper` to the smaller prop surface)

**Approach:**
- Define `interface SlotState { file: File | null; label: string; labelTouched: boolean; error: string | null }`, initialize `useState<SlotState[]>([emptySlot(), emptySlot()])`.
- Replace `combinedSize`/`sizeError` with a `.reduce()` over `slots`.
- Replace `canSubmit` per KTD6.
- Keep `FileSlot` unchanged — it already takes `{file, error, label, dropZoneText, onFile, inputRef, disabled, onDropExtras}` per-slot and is reused unmodified, just called once per array entry instead of twice by name.
- `isSameFile` logic stays, applied per-index.
- `runAnalysis` builds `FormData` via `slots.forEach((s, i) => { fd.append(`pdf${i}`, s.file); fd.append(`label${i}`, s.label.trim()); })`; `buildReport`'s embedded file descriptors become an array.
- `onSuccess` signature becomes `(data: GraphData) => void` (KTD3); `page.tsx`'s call site drops the now-removed props.

**Patterns to follow:** existing `isSameFile`, `deriveLabelFromFilename` usage, and the existing `autoTriggerArmedRef` comment explaining why `runAnalysis` is excluded from the effect's dependency array — preserve that reasoning when the effect's deps become array-based.

**Test scenarios:**
- Happy path: dropping into slot 0 then slot 1 individually still derives labels and enables submit once both are filled (port of "auto-fires on sequential slot drop").
- Edge case: re-dropping the identical file into the same slot index preserves a manually-edited label (port of "does not overwrite a manually-edited label").
- Edge case: dropping a different file into the same slot index after a manual edit re-derives the label (port of "re-derives the label when a different file replaces the slot").
- Error path: dropping a non-PDF into a slot shows the per-slot error and does not populate `file`.
- Integration: `onSuccess` is called with only the `GraphData` argument (no labels) once submit succeeds — assert the mock's call arity/shape, not just that it was called.

**Verification:** Existing 2-slot test scenarios pass unmodified in behavior (just adapted to the new prop surface); `npx tsc --noEmit` and `npx next build` clean.

---

### U2. Bulk mode: uncapped multi-file drop with fill-then-append semantics

**Goal:** Generalize `handleContainerDrop` from "assign first two, truncate the rest" to KTD4's fill-empty-then-append semantics, with a 12-slot soft cap and generalized notices.

**Requirements:** R1, R6; KTD4

**Dependencies:** U1

**Files:**
- `src/components/UploadScreen.tsx` (modify)
- `src/components/UploadScreen.test.tsx` (modify/add)

**Approach:**
- On drop: filter dropped files to `application/pdf`; walk the current `slots` array left-to-right, filling each empty slot with the next PDF in order; append any remaining PDFs as new slot objects, truncating at 12 total slots.
- Notice logic: fire the "non-PDF files were ignored" notice whenever `pdfFiles.length < files.length`, independent of fill state. Fire the "only the first N were used" notice whenever the drop would have exceeded the 12-slot cap (state the actual count used, not a hardcoded "two").
- Re-arm `autoTriggerArmedRef` whenever the resulting slot count is ≥2 and all filled slots are valid (KTD5) — including a 3rd+ file dropped into an already-≥2-filled array.

**Patterns to follow:** existing `handleContainerDrop`'s PDF-filtering and notice-setting structure — same shape, generalized loop instead of `[first, second]` destructuring.

**Test scenarios:**
- Happy path: dropping 4 PDFs at once in Bulk mode assigns all 4 to new slots and auto-fires once labels are non-empty (port of "assigns two dropped PDFs... auto-triggers," generalized to N).
- Edge case: dropping 13 PDFs truncates to 12 and shows the "only the first 12 were used" notice with the correct count.
- Edge case: with 4 slots already filled (e.g., from prior Individual-mode use), dropping 2 more PDFs in Bulk mode appends them as slots 5 and 6 without touching slots 1-4.
- Error/mixed path: dropping 2 PDFs and 1 non-PDF together assigns the 2 PDFs and shows the non-PDF-ignored notice.
- Edge case: a bulk drop of zero valid PDFs shows the invalid-file notice, not the extra-files notice (port of existing "zero valid PDFs" test).
- Integration: dropping into the bulk zone while `loading` is a no-op (port of the existing in-flight guard test, generalized).

**Verification:** New and ported tests pass; manual drag of 3+ files in a running dev server confirms slot count and auto-fire.

---

### U3. Individual mode: per-slot rendering, "+ Add document", and "×" remove

**Goal:** Render one `FileSlot` per array entry with always-visible label inputs, a "+ Add document" control (soft-capped at 12, disabled while `loading`), and a "×" remove control that appears only once `slots.length > 2` (R2, R3).

**Requirements:** R2, R3, R5; KTD1, KTD5, KTD6

**Dependencies:** U1

**Files:**
- `src/components/UploadScreen.tsx` (modify)
- `src/components/UploadScreen.test.tsx` (modify/add)

**Approach:**
- Map `slots` to a list of `FileSlot` + label `<input>` pairs, each wired to its index (reusing `FileSlot` unmodified per the research findings).
- "+ Add document": a plain `<button type="button" disabled={loading || slots.length >= 12}>` that appends an empty `SlotState`; disarm `autoTriggerArmedRef` on click (KTD5); focus the newly-added slot's label input after render so keyboard users don't lose their place.
- "×" remove: a plain `<button aria-label={...naming the slot...}>`, rendered only when `slots.length > 2`, disabled while `loading`; splices the slot out (KTD1) and disarms `autoTriggerArmedRef` (KTD5).
- No custom keydown handling needed for either button (real `<button>` elements, unlike `FileSlot`'s `div[role=button]`).

**Patterns to follow:** the existing DA/EN language-toggle button styling for control affordances; `FileSlot`'s existing `aria-label`/`aria-disabled` conventions for the remove button's accessible name.

**Test scenarios:**
- Happy path: clicking "+" adds a 3rd empty slot; dropping a file into it and filling its label makes `canSubmit` true alongside the original 2.
- Edge case: "×" is not rendered at exactly 2 slots; rendered and functional at 3+, removing the correct slot (verify by filename, not just count) and shifting subsequent slots down without losing their `labelTouched` state.
- Edge case: "+ Add document" is disabled once 12 slots exist.
- Integration: manually editing a label on any slot disarms auto-fire even if the array already satisfies `canSubmit` after the edit (port of "does not auto-fire when an unrelated label edit happens to satisfy canSubmit").
- Integration: "+", "×", and per-slot drop are all disabled/no-op while `loading` (in-flight guard, generalized).

**Verification:** New tests pass; manual keyboard-only pass (Tab to "+", Enter to add, Tab to new label input, Tab to "×", Enter to remove) confirms no drag-and-drop dependency for basic slot management.

---

### U4. Mode toggle: Bulk/Individual segmented control

**Goal:** Add a Bulk/Individual segmented-control toggle to the upload card header, defaulting to Bulk, non-destructive across switches (R4).

**Requirements:** R4; KTD4

**Dependencies:** U2, U3

**Files:**
- `src/components/UploadScreen.tsx` (modify)
- `src/components/UploadScreen.test.tsx` (modify/add)

**Approach:**
- `const [mode, setMode] = useState<"bulk" | "individual">("bulk")`, rendered as a two-button pill matching the existing DA/EN language-toggle styling and structure (`bg-[#131e35] p-1 rounded-lg border`, active `bg-[#38bdf8] text-[#070b13] shadow-md`, inactive `text-[#94a3b8]`) already present twice in the codebase.
- Both modes render from the same `slots` state — no `useEffect` syncing two separate shapes; the mode flag only selects which JSX branch renders (Bulk's single drop zone vs. Individual's per-slot list + "+"/"×").
- Toggling to Individual with more than 2 existing slots (e.g., after a large Bulk drop) shows the full current slot count, not a reset to 2 (R4) — this falls out naturally from KTD1's single-array design, no special-casing needed.
- Disable the toggle buttons while `loading`.

**Patterns to follow:** the existing DA/EN toggle exactly, for visual consistency (two instances already exist in `UploadScreen.tsx`'s header and `page.tsx`'s main header).

**Test scenarios:**
- Happy path: drop 3 files in Bulk mode, toggle to Individual, assert all 3 slots render with the same filenames/labels; toggle back to Bulk, assert state unchanged.
- Edge case: toggling modes disarms auto-fire even when the array already satisfies `canSubmit` post-toggle — no auto-submit fires merely from switching views.
- Integration: mode toggle buttons are disabled while `loading`.

**Verification:** New tests pass; manual toggle during a running dev server confirms no data loss in either direction.

---

### U5. i18n: generalize upload copy away from fixed A/B keys

**Goal:** Replace `dropZoneA`/`dropZoneB`/`labelA`/`labelB` with a single generic `dropZoneSlot`/index-parameterized pattern (KTD7); reword `uploadSubtitle` and the extra-files notice to drop hardcoded "two"; add mode-toggle and add/remove-button copy.

**Requirements:** R7; KTD7

**Dependencies:** U1, U2, U3, U4 (copy keys are consumed by all of them; land last so the exact keys needed are known)

**Files:**
- `src/lib/i18n.ts` (modify)
- `src/components/UploadScreen.test.tsx` (modify — update `/only the first two/i` regex assertions to match the reworded copy)

**Approach:**
- Remove `dropZoneA`, `dropZoneB`, `labelA`, `labelB` from `TranslationKey` and both DA/EN dictionaries. Grep for `docA`/`docB` usage first — per research findings these already appear unused in code; remove them too if confirmed dead, otherwise leave in place.
- Add `dropZoneSlot` (generic per-slot placeholder text), reuse the existing `docFallback` key (already added in the prior stage) for slot-number fallback labels via `` `${t("docFallback")} ${i + 1}` ``, matching `docDisplay.ts`'s established pattern exactly.
- Add `uploadModeBulk`, `uploadModeIndividual`, `addDocument`, `removeDocument` (aria-label text), `minDocumentsError` keys (DA + EN).
- Reword `uploadSubtitle` (drop "two"/"to") and rename/reword `multiDropExtraFilesIgnored` → generalized non-PDF-ignored / cap-truncation copy (split into two distinct messages per KTD4/U2's two distinct notice triggers, or keep one parameterized message — implementer's call based on which reads more naturally once both are in place).

**Patterns to follow:** `docFallback`'s existing index-parameterized usage in `src/lib/docDisplay.ts`'s `docLabel()`.

**Test scenarios:**
- Test expectation: none for the translation dictionary itself (pure data) — but every existing test asserting against removed/renamed keys (`t("labelA")`, `t("dropZoneA")`, `/only the first two/i` regex) must be updated in the same change, and this is the concrete completion signal for this unit: `npx vitest run` has zero failures referencing stale copy.

**Verification:** `npx tsc --noEmit` confirms no remaining references to removed `TranslationKey` members; full test suite green.

---

## Scope Boundaries

**In scope:** `UploadScreen.tsx` redesign, its test file, `page.tsx`'s prop-passing to `UploadScreen`, and the i18n keys the redesign consumes.

**Out of scope (already done in prior stages, not touched here):** `src/lib/parser.ts`'s N-way citation heuristic, `/api/parse/route.ts`'s indexed FormData contract, `page.tsx`/`CitationGraphView.tsx`'s N-document rendering (dashboard cards, graph columns, doc-colored badges), `src/lib/graphColors.ts`/`src/lib/docDisplay.ts`.

### Deferred to Follow-Up Work

- A true "ambiguous citation" UI state (flagging when the parser's structural fallback couldn't uniquely resolve a citation target) — noted as an explicit non-goal in the prior backend stage, still deferred here.
- Per-document size-budget UI feedback as slots are added (currently only a combined 10MB cap with a single error message) — nice-to-have, not requested.
- Persisting upload-in-progress state across a page reload — out of scope, no existing precedent for this in the app.

---

## Sources & Research

- `ce-repo-research-analyst` pass over `UploadScreen.tsx`, `UploadScreen.test.tsx`, `labels.ts`, `i18n.ts`, `docDisplay.ts`, `page.tsx`, `route.ts` — confirmed current signatures, the reusable DA/EN toggle pattern, and that `labelAInput`/`labelBInput` are dead props in `page.tsx` beyond pass-through.
- `ce-spec-flow-analyzer` pass over the bulk/individual/toggle flow — resolved auto-trigger arm/disarm rules, bulk-drop-onto-non-empty-array semantics, slot-removal state-integrity requirements, the minimum-slot-floor UI treatment, and accessibility requirements for the new controls; findings are folded into KTD1, KTD4, KTD5, KTD6 and the U1-U4 test scenarios above. Two open questions it raised (mode-toggle truncation behavior; `onSuccess` signature) are resolved in KTD3 and U4's approach (full array shown, no truncation on toggle) since this plan runs in a non-interactive pipeline context.
- No `docs/solutions/` institutional-learnings corpus exists in this repo; no external research was warranted (well-understood in-repo UI pattern, no security/payments/external-API surface).
