# Requirements Document: Preset Regulatory Document Catalog & Side-by-Side Legal Conflict Inspector

**Date:** 2026-08-20  
**Project:** LexGraph (`fiskerikontrol-app`)  
**Target Audience:** Internal Stakeholder / Fiskeristyrelsen Leadership Demo  
**Status:** Ready for Planning (`/ce-plan`)

---

## 1. Executive Summary & Problem Frame

LexGraph is being prepared for an internal demonstration for leadership and legal/inspection specialists at Fiskeristyrelsen (the Danish Fisheries Agency). 

Today, two core operational hurdles limit demo impact:
1. **Upload Friction:** The app requires manual drag-and-drop of local PDF files before any visualization appears. In a live presentation, finding, uploading, and naming files creates latency and risk of presentation friction.
2. **Legal Text Verification Gap:** While the system detects conflicts and displays citation snippets, legal professionals require a direct, side-by-side comparison of the full statutory provisions with visual highlight on contradictory modal keywords (obligations vs. exceptions) to verify and trust the finding immediately.

This specification defines two high-impact features to make the application immediately convincing and seamless:
- **Preset Regulatory Document Catalog**: A curated quick-select picker on the upload screen allowing 1-click selection of bundled fisheries regulations (and combining them with custom uploads).
- **Side-by-Side Legal Text Comparison & Diff Inspector**: A dedicated dual-pane comparison modal displaying full statutory text side-by-side with color-coded modal keywords and plain-language legal conflict explanations.

---

## 2. Target User & Demo Flow

### Primary Persona
- **Domain Leader / Inspection Officer / Legal Counsel (Fiskeristyrelsen):** Needs to verify regulatory consistency across EU base regulations, implementing acts, and national executive orders (*bekendtgørelser*), quickly identifying where exceptions dilute or contradict base control requirements.

### Target 2-Minute Demo Journey
1. **Instant Launch:** Open the app → see a clean "Vælg fra reguleringsarkiv" catalog of pre-bundled fisheries regulations (e.g. EU 1224/2009, EU 404/2011, National Executive Orders).
2. **1-Click Analysis:** Click 2 or more cards (or "Analysér valgte (2)") → the entire graph and conflict engine populates instantly.
3. **Deep Dive on Conflicts:** Switch to the **Modstrid** (Conflicts) tab → click **"Inspicer modstrid"** on a flagged collision.
4. **Interactive Dual-Pane Inspector:** A full side-by-side comparison modal opens showing the Base Article on the left and the Derogating Article on the right with highlighted keywords (e.g. *"skal føre"* vs. *"fritages for"*), proving the practical, time-saving value of the tool.

---

## 3. Scope & Requirements

### 3.1 Feature A: Preset Regulatory Document Catalog (Upload Screen)

- **R1.1 - Document Catalog Cards:** The upload screen (`src/components/UploadScreen.tsx`) displays a visual grid of pre-bundled regulatory documents with clear badges (e.g., EU Forordning, Gennemførelsesretsakt, National Bekendtgørelse), title, and short code.
- **R1.2 - Multi-Select Toggle:** Users can toggle documents on/off with single clicks. Active selections are clearly highlighted with active borders and count indicators.
- **R1.3 - 1-Click "Analysér valgte (N)":** A prominent primary button becomes active whenever $\ge 2$ documents are selected, immediately launching the parsing and graph construction pipeline.
- **R1.4 - Hybrid Custom Uploads:** Users can still drop custom PDFs via the existing Bulk or Individual drop zones, either alongside preset documents or independently.
- **R1.5 - Pre-bundled Data Assets:** Bundled regulatory documents are stored in the repo (as raw text / pre-parsed clean buffers in `public/corpus/` or static data modules) ensuring zero network latency and 100% offline reliability during live demos.

### 3.2 Feature B: Side-by-Side Legal Text Comparison & Diff Inspector

- **R2.1 - Dedicated Dual-Pane Modal:** An interactive modal accessible from `ConflictsView`, `OverlapsView`, and the `CitationGraphView` node details drawer via an **"Inspicer modstrid" / "Inspect Conflict"** button.
- **R2.2 - Plain-Language Conflict Summary Banner:** Top of modal displays an executive synthesis of the specific conflict (e.g., explaining which article imposes the obligation and which creates the derogation/exemption).
- **R2.3 - Dual-Pane Layout:**
  - **Left Pane (Referenced / Base Provision):** Displays document badge, section heading, title, and the full paragraph text of the target section.
  - **Right Pane (Derogating / Sourcing Provision):** Displays document badge, section heading, title, and the full paragraph text of the source section.
- **R2.4 - Modal Keyword Highlighting:** In-text highlighting of modal triggers using semantic colors:
  - `Obligation`: Blue highlight / badge (`skal`, `must`, `pligtig`)
  - `Exception`: Red/Amber highlight / badge (`fritaget`, `undtagen`, `uanset`, `derogation`)
  - `Prohibition`: Dark red / rose highlight (`forbudt`, `må ikke`, `shall not`)
  - `Permission`: Green / emerald highlight (`kan`, `tilladt`, `may`)
- **R2.5 - Quick Navigation & Actions:**
  - "Vis i graf" shortcut button to jump directly to the nodes in the Citation Graph.
  - "Kopier sammendrag" action to copy the side-by-side legal conflict summary to the clipboard.
  - Keyboard accessible: `Escape` key closes the modal immediately.

### 3.3 Feature C: Bilingual Localization & Accessibility

- **R3.1 - Complete i18n:** All new UI elements, catalog titles, modal labels, and help texts are fully translated in both Danish (`da`) and English (`en`) via `src/lib/i18n.ts`.
- **R3.2 - Responsive & Accessible:** High contrast dark-mode theme matching LexGraph design system, mobile/desktop responsive, and ARIA modal dialog properties.

---

## 4. Non-Goals & Scope Boundaries

- **Out of Scope for this iteration:**
  - Real-time LLM commentary generation (keep parsing 100% deterministic and regex/NLP based in TypeScript for speed and offline reliability).
  - External database integration (maintain existing in-memory / zero-retention architecture).
  - Complex legal drafting editors (this is an inspection and audit viewer, not an editing tool).

---

## 5. Success Criteria & Verification

1. **Zero-Click Demo Readiness:** A user can land on the home page and reach a fully populated, interactive network graph with 0 drag-and-drop operations in $< 2$ seconds.
2. **Inspector Depth:** Clicking any conflict immediately displays both the base section text and the derogating section text side-by-side with keyword highlights clearly visible.
3. **Robustness:** 100% test pass rate across existing 62 Vitest tests plus new unit tests for the catalog selector and comparison inspector modal.
