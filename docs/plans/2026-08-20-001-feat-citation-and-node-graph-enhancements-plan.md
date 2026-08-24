# Plan: Citation Graph & Node Graph Enhancements

## Problem Frame
The Citation Graph and Node Graph are core analytical surfaces in the Fiskerikontrol application. While functional, they currently lack:
1. **Fleet Filter Integration**: Graphs do not reflect the active fleet profile (e.g. `<8m`, `Passive garn`), so users cannot visually isolate in-scope provisions on the canvas.
2. **Conflict & Risk Visibility**: Nodes involved in substantive regulatory conflicts (e.g. EU vs. BEK contradictions) are not visually tagged with collision indicators on the graph.
3. **Canvas Controls & Usability**: Missing explicit zoom/pan controls (`+`, `-`, `Fit to Screen`), interactive link hover inspection tooltips, and cluster layout stability.
4. **EU vs. National Cluster Cohesion in Node Graph**: Node Graph can turn into an unstructured hairball without semantic cluster forces separating EU baseline acts from national implementing orders.

## Key Technical Decisions
1. **Fleet Profile Visual State**:
   - Pass `fleetCriteria` into both `CitationGraphView` and `D3GraphCanvas`.
   - Nodes matching `matchesFleetCriteria(node, fleetCriteria)` are rendered in full vibrant opacity with slight glow when a filter is active; non-matching nodes are dimmed to `0.2` opacity.
2. **Conflict Node Badges & Double-Ring Halo**:
   - Calculate `conflictNodeIds = new Set(data.conflicts.map(c => c.target))` (filtering out external phantoms).
   - Render a distinctive dual-ring halo around conflict nodes on both graphs so legal risks are instantly visible.
3. **Canvas Floating Zoom/Pan Controls**:
   - Add floating UI widget (Zoom In, Zoom Out, Fit/Reset, Filter Status Pill) to both graph canvases.
4. **Link Hover Inspection Tooltips**:
   - Add D3 tooltip on citation link hover showing exact source ⟷ target relationship and snippet.
5. **EU vs. National Force Clustering (Node Graph)**:
   - Apply radial/horizontal cluster force centers in D3 simulation (`forceX` towards left for EU regulations, right for national acts) to make regulatory hierarchy obvious.

## Implementation Units

### Unit 1: Graph Filter & State Extension (`src/lib/graphFilter.ts` & `src/lib/types.ts`)
- Extend `filterGraph` to optionally accept `fleetCriteria: FleetFilterCriteria`.
- Ensure filtered degree computation and node sets correctly identify in-scope vs. dimmed nodes.

### Unit 2: Citation Graph Canvas Enhancements (`src/components/CitationGraphView.tsx`)
- Support `fleetCriteria` prop for selective opacity / highlight.
- Add conflict double-ring marker to nodes with legal collisions.
- Add interactive zoom toolbar (`+`, `-`, `Reset View`) and citation link hover tooltip.

### Unit 3: Node Graph Canvas Enhancements (`src/app/page.tsx`)
- Upgrade `D3GraphCanvas` in `src/app/page.tsx` with `fleetCriteria` awareness.
- Add EU/National cluster force centers.
- Add conflict double-ring markers and zoom toolbar.

### Unit 4: Verification & Testing
- Unit tests for graph filtering with fleet criteria.
- Vitest suite pass (80+ tests).
- Production build validation (`npm run build`).
