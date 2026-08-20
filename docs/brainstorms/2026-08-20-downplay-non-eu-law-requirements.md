# Requirements Document: EU Law Prominence & National Law Visual Demotion

**Date**: 2026-08-20  
**Topic**: UI Visual Hierarchy Refinement — EU Fisheries Law First  
**Status**: Approved & Ready for Planning  

---

## 1. Problem Statement & Context

Leadership and inspection management (*Fiskeristyrelsen*) are focusing primarily on **EU fisheries law compliance** (specifically EU 1224/2009, EU 2023/2842 revision, and related delegated/implementing acts) over the coming year.

While Danish national regulations (*bekendtgørelser* and *fiskeriloven*) must remain accessible for cross-reference, having them visually weighted equally with EU regulations clutters the interface and distracts from the core EU legal mandate.

---

## 2. Goals & Non-Goals

### Goals
- **EU Law as Primary Visual Backbone**: Style all EU regulations with high visual prominence (bold typography, crisp blue/sky identity badges, default pre-selections, and hero positioning).
- **Subdued National Law (Visual Demotion)**: Tone down Danish *bekendtgørelser* and acts using muted slate/zinc tones, lower contrast borders, and subtle *"National gennemførelse"* tags.
- **Preserve Full Functional Capability**: Retain all 10 legal documents, parsing, cross-reference mapping, conflict detection, and audit memo generation intact.

### Non-Goals
- Deleting or disabling national legal documents.
- Restricting citation graphs from mapping connections between EU and Danish law.

---

## 3. Surface-by-Surface UI Specification

### Surface 1: Frontpage Preset Catalog (`UploadScreen.tsx`)
- **Ordering**: EU regulations always pinned at the top.
- **Badging & Colors**:
  - `EU`: Bold sky badge (`bg-sky-100 text-sky-900 border-sky-300 font-bold`).
  - `BEK / LOV`: Subdued slate badge (`bg-slate-100 text-slate-600 border-slate-200 text-[10px] font-normal`), tagged as *"National gennemførelse"* / *"National lov"*.
- **Card Backgrounds**: EU cards feature clean white background with crisp border; national cards feature soft neutral background with lower visual contrast.

### Surface 2: Dashboard & Overview (`page.tsx`)
- **Document Metrics**: Group metrics by EU Baseline (prominent blue) vs National Transposition (subtle slate).
- **Executive Framing**: Emphasize EU Control Regulation compliance status in introductory text.

### Surface 3: Graphs (Citation Graph & Force Graph)
- **Node Styling**:
  - `doc0` (EU 1224/2009) & `doc1` (EU 2023/2842): Distinct sky/navy hues (`#0284c7`, `#1e40af`) and crisp white outlines.
  - National docs: Muted silver/slate fills (`#94a3b8`, `#cbd5e1`) to keep graph visual weight centered on the EU backbone.

### Surface 4: Conflicts & Audit Memo
- **Conflict Framing**: Clearly label the EU article as the **"EU Hovedregel"** (*EU Base Requirement*) and the national section as the **"National bestemmelse / undtagelse"** (*National Transposition / Derogation*).

---

## 4. Success Criteria
1. When opening the app or dashboard, the eye immediately identifies EU regulations as the primary subject matter.
2. Danish acts are clearly readable when hovered or inspected, but do not compete for primary visual attention.
3. 100% of existing tests pass and zero features are broken.
