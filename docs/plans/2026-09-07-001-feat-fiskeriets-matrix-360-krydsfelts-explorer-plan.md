# Technical Plan: Fiskeriets Matrix (360° Krydsfelts-Explorer)

**Date**: 2026-09-07  
**Branch**: `feature/matrix-explorer`  
**Status**: Ready for Execution (`ce-work`)  
**Requirements Reference**: `docs/brainstorms/2026-09-07-fiskeriets-matrix-360-krydsfelts-explorer-requirements.md`  

---

## 1. Problem Frame & Objectives

Deliver an interactive, multi-dimensional relational matrix explorer that enables new caseworkers, analysts, and IT architects in the Danish Fisheries Agency to understand how actors, lifecycle events, IT systems, and statutory regulations intersect.

### Key Deliverables:
1. **Core Relational Engine & Data Model (`src/lib/matrixData.ts`)**:
   - Strongly typed definitions for nodes across 4 columns: `actors`, `events`, `systems`, `regulations`.
   - Directed edge relationships with temporal validity (`2026` vs `2028`), role annotations, and field catalog links.
   - Filter and query utilities to resolve 1-to-many and multi-hop connections for any selected node.
2. **Next.js Matrix View Component (`src/components/MatrixExplorer.tsx`)**:
   - 4-column visual layout with SVG Bezier connecting ribbons between active nodes.
   - Global timeline toggle (`2026` vs `2028`).
   - Active node illumination and soft dimming of unrelated nodes.
   - Fakta-Panel (Inspector Drawer) with statutory definitions, field catalog links, and relational synthesis.
3. **Application Routing & Navigation Integration (`src/app/page.tsx`, `src/lib/urlState.ts`)**:
   - Add `matrix` view to URL state (`?view=matrix&node=<id>&t=2026|2028`).
   - Add tab button in the header alongside `Konsolidering` and `Ændringer`.
4. **Standalone Single-File HTML Artifact (`public/fiskeri-matrix-explorer.html`)**:
   - Zero-dependency, corporate-safe, 100% offline-ready single-file HTML/CSS/JS with official Miljøministeriet styling tokens for direct internal sharing.
5. **Vitest Unit Test Suite (`src/lib/matrixData.test.ts`)**:
   - Verification of data integrity, bidirectional connections, and 2026 vs 2028 edge filtering.

---

## 2. File Map & Scope

| File | Type | Description |
|------|------|-------------|
| `src/lib/matrixData.ts` | New File | Complete domain dataset (4 columns, nodes, edges, descriptions, feltkatalog references). |
| `src/lib/matrixData.test.ts` | New File | Vitest test suite validating all connections, node schemas, and timeline filters. |
| `src/components/MatrixExplorer.tsx` | New File | Interactive React component with SVG bezier ribbons, facts drawer, and timeline toggle. |
| `src/lib/urlState.ts` | Modify | Support `view: 'matrix'`, `matrixNode?: string`, `matrixYear?: 2026 \| 2028`. |
| `src/app/page.tsx` | Modify | Add `MatrixExplorer` view rendering and header navigation tab. |
| `public/fiskeri-matrix-explorer.html` | New File | Self-contained, zero-node, offline HTML/CSS/JS export. |

---

## 3. Detailed Implementation Units

### Unit 1: Relational Data Model & Graph Utilities (`src/lib/matrixData.ts`)
- **Types**:
  ```ts
  export type MatrixColumn = 'actors' | 'events' | 'systems' | 'regulations';
  export type TimelineYear = 2026 | 2028;

  export interface MatrixNode {
    id: string;
    column: MatrixColumn;
    titleDa: string;
    subtitleDa?: string;
    category: string;
    descriptionDa: string;
    introducedYear?: TimelineYear;
    legalReference?: string;
    feltkatalogRefs?: string[];
  }

  export interface MatrixEdge {
    sourceId: string;
    targetId: string;
    yearValidFrom: TimelineYear;
    roleDa: string; // fx "Indberetter til", "Styret af", "Validerer"
    noteDa?: string;
  }
  ```
- **Nodes Population**:
  - `actors`: 8 nodes (`actor_micro`, `actor_coastal`, `actor_medium`, `actor_large`, `actor_buyer`, `actor_weighing`, `actor_transporter`, `actor_agency`).
  - `events`: 11 nodes (`evt_license`, `evt_departure`, `evt_catch`, `evt_sea_inspect`, `evt_pno`, `evt_landing`, `evt_quay_inspect`, `evt_weighing`, `evt_first_sale`, `evt_transport`, `evt_crosscheck`).
  - `systems`: 8 nodes (`sys_elog`, `sys_fos_vms`, `sys_fmc`, `sys_fos_sales`, `sys_flux`, `sys_catch`, `sys_cctv`, `sys_validation_db`).
  - `regulations`: 10 nodes (`reg_1224_2009`, `reg_2023_2842`, `reg_2025_2196`, `reg_1380_2013`, `reg_2019_1241`, `reg_fiskeriloven`, `reg_bek_1197_logbog`, `reg_bek_1144_landing`, `reg_bek_1571_regulering`, `reg_bek_978_point`).
- **Edge Generation & Traversal Helpers**:
  - `getConnectedNodes(nodeId: string, year: TimelineYear): Set<string>`
  - `getEdgesForNode(nodeId: string, year: TimelineYear): MatrixEdge[]`

### Unit 2: Test Suite (`src/lib/matrixData.test.ts`)
- Test that every edge references valid node IDs.
- Test that selecting `2026` excludes edges marked `yearValidFrom: 2028`.
- Test that switching to `2028` adds the expected small-vessel connections (`actor_micro` ➔ `sys_elog`, `actor_coastal` ➔ `sys_fos_vms`).
- Test that bidirectional traversal resolves across all 4 columns for representative nodes (e.g. `sys_fos_sales`, `actor_large`, `reg_bek_1197_logbog`).

### Unit 3: React UI Component (`src/components/MatrixExplorer.tsx`)
- 4 column cards layout inside a horizontal scroll/grid wrapper.
- Node elements with click-to-select and hover preview.
- Dynamic SVG overlay rendering smooth cubic bezier paths `M x1 y1 C cx1 cy1, cx2 cy2, x2 y2` between column nodes.
- Top control bar:
  - Header: *"Fiskeriets Matrix (360° Krydsfelts-Explorer)"*
  - Subtitle: *"Udforsk forbindelserne mellem aktører, hændelser, IT-systemer og lovgrundlag"*
  - Timeline Switch: `[2026 Gældende i dag]` vs `[2028 Fuld indfasning]`.
  - Reset selection button.
- Fakta-Panel (Sidebar):
  - Slide-in or persistent right column drawer showing node details, description, connected entities grouped by column, and 2026/2028 impact.

### Unit 4: Integration in `src/app/page.tsx` & `src/lib/urlState.ts`
- Extend `urlState.ts` with `view: 'consolidation' | 'conflicts' | 'matrix'`.
- Wire tab in header: `[Matrix / Krydsfelt]`.
- Sync selected node and active year to URL query params for linkability.

### Unit 5: Standalone Single-File HTML Artifact (`public/fiskeri-matrix-explorer.html`)
- Standalone HTML document with embedded CSS and JS.
- Official Miljøministeriet styling tokens (`#0E472F`, `#14643C`, `#F0F4F1`).
- Contains all data inlined, runs without any network connection or build step.
- Provides a "Kopier Overblik til Udklipsholder" action.

---

## 4. Test Scenarios & Verification

1. **Automated Unit Tests**:
   - `npm test` runs all existing 260 tests + new `matrixData.test.ts`. All must pass cleanly.
2. **Build Verification**:
   - `npm run build` must succeed with zero TypeScript or ESLint errors.
3. **Visual & Interaction Verification**:
   - Node selection correctly highlights relevant nodes across all 4 columns.
   - Switching between 2026 and 2028 toggles small-scale vessel links.
   - Fakta-panel correctly reflects the selected node.
   - Standalone HTML file opens and functions in browser without console errors.
