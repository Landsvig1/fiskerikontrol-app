# Requirements Document: Fiskeriets Matrix (360° Krydsfelts-Explorer)

**Date**: 2026-09-07  
**Topic**: Interactive 4-Column Relational Matrix for Fisheries Control, IT Systems, and Legal Obligations  
**Status**: Approved & Ready for Planning (`/ce-plan`)  
**Target Users**: New hires, business analysts, legal advisors, and IT architects in the Danish Fisheries Agency (Styrelsen for Fødevarer, Landbrug og Fiskeri)  

---

## 1. Problem Frame & First Principles

### The Core Cognitive Barrier
In public administration and government IT, complex regulatory domains are traditionally communicated in two inadequate formats:
1. **Legal prose (Paragraffer & Bekendtgørelser)**: Precise, but completely opaque regarding which IT systems, message types, and physical actors are impacted.
2. **Linear process diagrams (BPMN / Swimlater)**: Useful for a single standard voyage, but unable to show **multi-dimensional overlaps and regulatory ripple effects** (e.g., how a vessel size determines both its eLog software, VMS reporting interval, quay-side inspection frequency, and penalty point liabilities).

New employees and cross-functional teams (legal vs. IT) struggle because they ask **relational questions**, such as:
- *"Hvilke hændelser og love fodrer egentlig FOS med data?"*
- *"Hvad ændrer sig konkret for en 9-meter kystfisker mellem 2026 og 2028 på tværs af systemer og regler?"*
- *"Hvis der sker en fejl i tolerancemargenen ved landing, hvilke IT-systemer og sanktionsparagraffer bliver så aktiveret?"*

### The First Principles Solution
A **multi-column relational matrix** that models fisheries control not as a flat timeline, but as a bipartite/multipartite interconnected graph across 4 distinct enterprise dimensions:
$$\text{Aktør (Hvem)} \longleftrightarrow \text{Hændelse (Hvad)} \longleftrightarrow \text{IT-System (Hvor)} \longleftrightarrow \text{Regelsæt (Hvorfor)}$$

---

## 2. Product Specification

### 2.1 The 4-Column Relational Architecture

The explorer presents 4 vertical, interactive columns side by side:

```
┌─────────────────┐   ┌───────────────────┐   ┌──────────────────┐   ┌─────────────────────┐
│ 1. AKTØR /      │   │ 2. OPERATIONEL    │   │ 3. IT-SYSTEM &   │   │ 4. REGELSÆT &       │
│    FARTØJSKLASSE│   │    HÆNDELSE       │   │    DATASTRØM     │   │    RETSKILDE        │
├─────────────────┤   │                   │   │                  │   │                     │
│ • Mikro (<8m)   │───┼───────────────────┼───┼──────────────────┼───│ • EU 1224/2009      │
│ • Kyst (8-12m)  │   │ • Licenstildeling │   │ • eLog / ERS     │   │ • EU 2023/2842      │
│ • Mellem (12-18)│───│ • Udsejling (VMS) │───│ • FOS (Tracking) │───│ • EU 2025/2196      │
│ • Stor (>18/24m)│   │ • Fangst / Haling │   │ • FMC Døgnvagt   │   │ • EU 1380/2013      │
│ • Opkøber/Aukt. │───│ • Søkontrol (K1)  │───│ • FOS Afregning  │───│ • Fiskeriloven      │
│ • Vejeoperatør  │   │ • PNO Varsel      │   │ • FLUX (EFCA/EU) │   │ • BEK 1197 (Logbog) │
│ • Transportør   │   │ • Landing/Losning │   │ • CATCH (IUU)    │   │ • BEK 1144 (Landing)│
│ • Styrelsen     │   │ • Kajkontrol (K2) │   │ • CCTV Database  │   │ • BEK 1571 (Regul.) │
│                 │   │ • Vejning         │   │ • Valideringsdb. │   │ • BEK 978 (Point)   │
│                 │   │ • Førstegangssalg │   │                  │   │ • BEK 240 (Kattegat)│
│                 │   │ • Transport       │   │                  │   │                     │
│                 │   │ • Krydskontrol    │   │                  │   │                     │
└─────────────────┘   └───────────────────┘   └──────────────────┘   └─────────────────────┘
```

### 2.2 Interactive Behavior & Visual Physics
1. **Default State**:
   - All nodes are visible with clean typography and category badges.
   - Subtle background connector lines suggest the density of connections.
2. **Hover / Active Node Selection**:
   - Clicking on any entity (e.g. `FOS` in Column 3, or `Kyst (8–12m)` in Column 1, or `BEK 1197` in Column 4):
     - **Active illumination**: Bezier curves (connecting ribbons) light up with high contrast, connecting the selected node to all related nodes in the other 3 columns.
     - **Soft Dimming**: All non-connected nodes across all columns fade out (opacity 0.25).
     - **Connected Badging**: Connected nodes display small relational pills indicating their role in the link (e.g. `[Dataleverandør]`, `[Modtager]`, `[Hjemmel]`).
3. **Fakta-Panel (Side Drawer / Inspector Card)**:
   - When a node is selected, a structured fact card opens on the right:
     - **Titel & Kategori**: Node navn, type og officiel legal definition (fra `A3-legaldefinitioner.md`).
     - **Sammenhængs-Syntese**: 2–3 præcise linjer på forvaltningsdansk, der forklarer knudepunktets rolle.
     - **Direkte Forbindelser**: Lister over præcist forbundne aktører, hændelser, systemer og love.
     - **Datafelter**: Relevante felter fra `feltkatalog.csv` (Bilag I–XIX).
     - **2026 vs. 2028 Status**: Hvad gælder nu, og hvad ændres med EU-deadlinen.

---

## 3. The Timeline Dimension (2026 ⟷ 2028 Global Toggle)

At the top of the interface, a prominent global switch controls the temporal perspective:

```
[ 🔵 2026: Gældende Regler (I Dag) ]  ⟷  [ 🟣 2028: Fuld EU-Indfasning (Målarkitektur) ]
```

### Dynamic Changes on Toggle Switch:
* **In 2026 Mode**:
  - `Mikro (<8m)` and `Kyst (8–12m)` show paper logbook connections and lack direct VMS links.
  - `CCTV Database` is connected exclusively to `BEK 240 (Frivillig Kattegat)` and voluntarily enrolled vessels.
  - `Valideringsdatabase` is marked with a "Træder i kraft 2027" badge.
* **In 2028 Mode**:
  - `Mikro (<8m)` and `Kyst (8–12m)` **light up with new connections** to `eLog`, `VMS (Mobilapp)`, and `EU 2023/2842 Art. 15a`.
  - `CCTV` connects mandatorily to `Stor (>18m risikofartøjer)` jf. Art. 13.
  - `Datavalideringsdatabase (Art. 109)` connects actively to all stages from eLog to Sales Note.
  - Changed/new connections are color-highlighted with a distinct badge (`✨ Ny forpligtelse i 2028`).

---

## 4. Delivery & Technical Architecture

The feature must be delivered in **two complementary forms**:

### 1. Next.js App View (`fiskerikontrol-app`)
- URL Route: `/?view=matrix` or `/matrix`.
- Integrated seamlessly into the existing navigation bar alongside `Konsolidering` and `Ændringer`.
- Responsive layout using Tailwind CSS, React SVG connectors, and full keyboard/URL addressability (`?view=matrix&node=it_fos&t=2028`).
- Shared TypeScript types for nodes and edges.

### 2. Standalone HTML/CSS/JS Artifact (`fiskeri-matrix-explorer.html`)
- Completely standalone, zero external dependencies, zero Node.js runtime required.
- Incorporates official Miljøministeriet institutional styling:
  - Deep Forest Green (`#0E472F`), Action Green (`#14643C`), Light Sage (`#F0F4F1`), Crisp White panels (`#FFFFFF`).
- Built-in dataset compiled directly into a self-contained JS object (`const MATRIX_DATA = { ... }`).
- Shareable directly via email, shared network drives, or local browser opening for internal colleagues and new hires.

---

## 5. Non-Goals (Scope Boundaries)

- **No live API integrations with Fiskeristyrelsens backend**: The matrix is driven by a curated, validated domain dataset representing the statutory and architectural reality—not live database feeds.
- **No freeform manual node creation in UI**: Users explore the authoritative domain matrix; they do not drag-and-drop custom user nodes in this release.
- **No deep legal text diff viewer inside the matrix**: Clicking a legal act links directly to LexGraph's consolidation view or the local legal corpus; it does not duplicate the full text rendering engine.

---

## 6. Success Criteria & Verification

1. **Clarity within 10 seconds**: A newly hired caseworker or IT developer can click any node (e.g. `FOS` or `Kyst 8–12m`) and immediately see all connected actors, events, systems, and laws without reading 40 pages of documentation.
2. **2028 Impact Comprehension**: Switching between `2026` and `2028` visually proves why the agency's digitalization unit has active projects (instantly exposes the explosion of new digital links for small vessels).
3. **100% Statutory Accuracy**: Every edge between an event/actor and a legal act has verified legal basis documented in `Legal docs/00-INDEX.md` and `A3-legaldefinitioner.md`.
4. **Portability**: The standalone HTML file renders identically across macOS Safari, Chrome, and Edge on restricted government laptops with JavaScript enabled.
