# Fiskeriets Matrix — Standalone Frontend

**Fiskeriets Matrix (Krydsfelter i Kontrolkæden)** is a standalone Scandinavian frontend for Danish and EU fisheries control, built directly on our domain and legal foundation ([`fiskeri-domaenegrundlag`](https://github.com/Landsvig1/fiskeri-domaenegrundlag)).

Where traditional legal tools view law as flat articles or citation links, this frontend maps **where, how, and through which IT systems each provision bites in the operational control chain**.

The user interface is entirely in Danish for civil servants and caseworkers at **Fiskeristyrelsen** (under Ministeriet for Fødevarer, Landbrug og Fiskeri).

---

## 🚀 How to Run It

This project is built to run as a **standalone frontend** in multiple environments:

### Option 1: Modern Web Application (Next.js 15)

Clean, fast Scandinavian UI with reactive 4-lane control chain, scenario buttons, and live URL state.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

- URL state is fully addressable: `/?node=actor_micro&yr=2026`
- Shift between **2026 (Gældende Ret)** and **2028 (Målarkitektur)**
- One-click copy to formal administrative memo (*Kopier til Sagsnotat*)

### Option 2: Single-File Offline Distribution (Zero Dependencies)

For restricted Danish government laptops where Node.js, package managers, or external network calls are locked down:

```bash
# Rebuild the standalone single-file distribution (HTML/CSS/JS bundled)
npm run build:matrix
```

Open `public/fiskeri-matrix-explorer.html` directly in any web browser.
- 100% offline, zero runtime dependencies.
- Embeds all 38 domain nodes, 45 legal relations, quick scenarios, and the complete article catalog.

### Option 3: 10-Fase Sekventiel Kontrolkæde

A companion single-file operational walkthrough located under:

- [`standalone/kontrolkaede/index.html`](standalone/kontrolkaede/) — see [`standalone/kontrolkaede/README.md`](standalone/kontrolkaede/README.md).

---

## 🏛️ Built on our "Fiske Foundation"

The frontend is directly grounded in our structured domain extraction:

1. **4 Forbundne Søjler (38 Domæneelementer)**:
   - **1. Aktør / Fartøjsklasse**: Fartøjer (<8m, 8-10m, 10-12m, 12-15m, 15-18m, ≥18m), Førsteopkøbere, Godkendte Vejere, FMC Kolding, Tilsynsførende.
   - **2. Operationel Hændelse**: Licenstildeling, Afsejling, Fangstoperation, Søtilsyn, Forudgående Anmeldelse (PNO), Landing, Havnekontrol, Vejning, Førsteomsætning, Transport, Automatiseret Krydskontrol.
   - **3. IT-System & Datastrøm**: FOS (Fiskeriets Overvågningssystem), FMC Valideringsmotor, eLog, VMS/AIS Satellit, Mobil Sporing App, Salgsdatabasen, CCTV/REM Hub, FKA/IOK Kvoteportal.
   - **4. Regelsæt & Hjemmel**: EU 1224/2009, EU 2023/2842, EU 2025/2196, EU 1380/2013, EU 2019/1241, Fiskeriloven, BEK 1144/2025 (landing), BEK 1197/2025 (logbog), BEK 1571/2025 (regulering), BEK 978/2019 (point), BEK 240/2020 (CCTV).

2. **Artikel-Inspektor (`?` Ikon)**:
   - Click the small `?` icon on any regulation card in Column 4 (or in the table view) to open the **Article Inspector**.
   - Displays exact article numbers (e.g. Art. 9, Art. 14, Art. 17, Art. 60-61, § 3-4), concise Danish legal requirements, and practical supervisory significance (*Betydning for tilsyn*).
   - Highlights articles introduced in the **2028 EU-reform** (such as CCTV under Art. 13 and mobile tracking under Art. 15a).

3. **Feltkatalog & Datastandarder**:
   - Deep references to official EU and national data fields:
     - **Bilag XV (EU 2025/2196)**: eLog felter 1-44 (redskab, maske, ICES-afsnit, FAO 3-alfa, estimeret vægt).
     - **Bilag XIX (EU 2025/2196)**: Salgsnotaer felter 1-26 (vejet vægt, opkøber-ID, sortering, fangstrejse-ID).
     - **Bilag VI (EU 2025/2196)**: Positionsmeddelelser (breddegrad, længdegrad, kurs, fart, UTC-tid).
     - **Art. 49-53**: Valideringsregler og automatiske krydskontrol-algoritmer.

4. **2026 vs. 2028 Tidsskifte**:
   - Toggle instantly between current law (**2026: Gældende Ret**) and the upcoming reform (**2028: Målarkitektur**).
   - Dynamically highlights which new obligations, systems, and controls will activate for each vessel class.

---

## 🧪 Tests & Quality Assurance

All 265 Vitest unit and integration tests pass:

```bash
npm test            # 265 tests across 24 test suites
npm run typecheck   # strict TypeScript check (zero errors)
npm run lint        # ESLint strict rules
npm run build       # Next.js production build & prebuild matrix bundle
```

---

## 📚 Legacy LexGraph Citation Engine

The repository also retains the historical citation graph parsing tool:
- `GET /api/consolidation?docs=eu-1224-2009,eu-2023-2842`
- Evaluates inter-act cross citations and amendment registrations.

Uploaded documents (PDF or HTML) get no link. There is nowhere to persist them, and a link that
silently resolved to a different corpus would be worse than no link.

### Reading it without a browser

```
GET /api/consolidation?docs=eu-1224-2009,eu-2023-2842
GET /api/consolidation?docs=...&p=doc0_sec_14
GET /api/consolidation?docs=...&view=amendments
```

Each row carries the `url` of the screen showing the same thing. Note that
provision ids are positional: `doc0` is the first id in `docs`, so an id is only
meaningful against the document order that produced it.

## Standalone frontends

`standalone/` holds self-contained frontends that ship in this repository but are
**not part of this Next.js app**. They have no build step and no shared code with
`src/`; you run them by opening the HTML file.

- [`standalone/kontrolkaede`](standalone/kontrolkaede/) — the ten-phase fisheries
  control chain, each phase decomposed into law, administration, data fields and
  IT interfaces. Built on the same corpus and annex extraction as this app, for
  restricted workstations where Node.js is not available.

## Development

```bash
npm test         # vitest, 282 tests
npm run lint
npm run build
```

## Licence

Code is MIT (see `LICENSE`). The legal texts under `public/corpus/` are not,
see `NOTICE`.
