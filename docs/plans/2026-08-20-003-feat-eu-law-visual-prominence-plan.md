# Technical Plan: EU Law Visual Prominence & National Law Visual Demotion

**Date**: 2026-08-20  
**Branch**: `feature/regulatory-catalog-conflict-inspector`  
**Status**: Implementation in progress  

---

## 1. Objectives & Scope
Refine the UI visual hierarchy across all views so EU law is immediately recognized as the primary focus, while Danish national acts (*bekendtgørelser* and *love*) are visually subdued as secondary national transposition references:

1. **Preset Catalog (`UploadScreen.tsx`)**:
   - EU regulations pinned at top with bold sky/navy identity badges (`bg-sky-100 text-sky-900 border-sky-300 font-bold`).
   - Danish acts styled with soft neutral slate cards and a subtle `National gennemførelse` tag (`bg-slate-100 text-slate-500 text-[10px]`).
2. **Palette & Node Colors (`graphColors.ts`, `CitationGraphView.tsx`, `page.tsx`)**:
   - EU documents assigned prominent vibrant sky/navy tones (`#0284c7`, `#1d4ed8`).
   - National documents assigned muted slate/stone tones (`#94a3b8`, `#64748b`).
3. **Conflict Inspector & Audit Memo (`ConflictInspectorModal.tsx`, `generateAuditMemo.ts`, `AuditMemoModal.tsx`)**:
   - Label EU clauses as **"EU Hovedregel"** (*EU Base Requirement*) and national clauses as **"National undtagelse"** (*National Transposition/Derogation*).

---

## 2. File Map & Changes

| File | Changes |
|------|---------|
| `src/lib/presetCorpus.ts` | Update `typeLabelDa` / `typeLabelEn` for national acts to *"National gennemførelse"* / *"National Implementation"*. |
| `src/components/UploadScreen.tsx` | Apply prominent styling for EU cards and subdued styling for national cards. |
| `src/lib/graphColors.ts` | Refine document color array to prioritize EU blue/navy first and muted slates for national docs. |
| `src/components/ConflictInspectorModal.tsx` | Update header badges to contrast EU Hovedregel vs National gennemførelse. |
| `src/lib/generateAuditMemo.ts` | Update section formatting to highlight EU baseline vs National transposition. |
| `src/app/page.tsx` | Update dashboard metrics to group EU Baseline vs National documents. |

---

## 3. Test Scenarios
- Verify all unit tests continue passing (`npm test`).
- Verify production build compiles without errors (`npm run build`).
