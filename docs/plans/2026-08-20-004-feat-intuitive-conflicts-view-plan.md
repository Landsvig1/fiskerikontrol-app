# Technical Plan: Intuitive 'Konflikter' UI (Krav vs. Undtagelse)

**Date**: 2026-08-20  
**Branch**: `feature/regulatory-catalog-conflict-inspector`  
**Status**: Implementation in progress  

---

## 1. Objectives & Scope
Transform the `ConflictsView` component from technical graph node terminology into an instantly understandable, domain-tailored visual contrast interface:

1. **Header & Context**:
   - Clear banner stating the EU supremacy principle and regulatory conflict context.
2. **Conflict Card 3-Block Architecture**:
   - **Header**: Conflict pair headline (e.g. `EU 2023/2842 Art. 9 ⟷ BEK 1197/2025 § 3`) + Precedence badge (`⚖️ EU-forordning har forrang`).
   - **Side-by-Side Comparison**:
     - *Left Box (EU Hovedregel)*: Blue card styling (`border-sky-300 bg-sky-50/30`), article title, bold keyword highlight.
     - *Right Box (Dansk Undtagelse)*: Amber card styling (`border-amber-300 bg-amber-50/30`), Bekendtgørelse title, quote snippet.
   - **Bottom Verdict**: Plain-language inspection summary (*💡 Konklusion for Tilsynet*).
   - **Actions**: Direct buttons for `Inspicér Modstrid` (Modal) and `Vis i Graf`.

---

## 2. File Map & Changes

| File | Changes |
|------|---------|
| `src/lib/i18n.ts` | Add translations for `euPrecedenceVerdict`, `baseRuleTitle`, `nationalExceptionTitle`, `inspectionImpactTitle`, `conflictPair`, `conflictsSubtitle`. |
| `src/app/page.tsx` | Refactor `ConflictsView` to render the new 3-block contrast cards with highlighted quotes, supremacy badges, and direct plain-Danish verdicts. |

---

## 3. Test Scenarios
- Run all tests with `npm test`.
- Run production build with `npm run build`.
