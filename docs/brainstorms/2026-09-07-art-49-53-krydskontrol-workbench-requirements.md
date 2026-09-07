# Requirements Document: Art. 49–53 Krydskontrol Workbench (Automated Cross-Validation Engine)

**Date**: 2026-09-07  
**Topic**: Operationalizing EU Fisheries Control Articles 49–53 into an Interactive Analyst & Caseworker Workbench  
**Status**: Approved & Ready for Planning (`/ce-plan`)  
**Context**: Combining LexGraph (`fiskerikontrol-app`) and Domain Foundation / KystLog (`Ordbog:Arbejdsgrundlag APP`)  

---

## 1. Problem Frame & First Principles Diagnosis

### The Core Failure of Isolated Predecessors
1. **LexGraph (`fiskerikontrol-app`)**: Attempted to analyze legal compliance purely as a citation graph. It failed to identify Danish derogations automatically because Danish *bekendtgørelser* do not cite EU articles by number; they cite the framework in the preamble and legislate in autonomous paragraphs. Tracing pure citation loops inside EU law became an academic exercise with low day-to-day operational utility.
2. **Domain Foundation & KystLog (`Ordbog:Arbejdsgrundlag APP`)**: Established high-value structured assets—the EU 2025/2196 data field catalog (`feltkatalog.csv`), official conversion factors, margin of tolerance formulas (Art. 14), and PNO deadline rules (Art. 17)—but left them trapped in an offline prototype and static HTML references.

### First Principles Reality
Fisheries compliance is not a static text graph. It is an **event-driven state machine over physical and commercial transactions**:
$$\text{Vessel Position (VMS)} \longrightarrow \text{Catch Activity (ERS/Log)} \longrightarrow \text{Prior Notice (PNO)} \longrightarrow \text{Weighing (Landing Note)} \longrightarrow \text{First Sale (Sales Note)}$$

Under **EU Regulation 1224/2009 (as amended by 2023/2842) Articles 49–53 & 109**, member states are legally mandated to implement an **automated data validation system by January 2027**. This system must continuously cross-validate these data streams, flag anomalies, and attach legal liability.

---

## 2. Product Vision & Scope

The **Krydskontrol Workbench** fuses LexGraph's statutory citation engine with the domain catalog and business logic to create an **interactive validation and audit workbench** inside `fiskerikontrol-app`.

It enables business analysts, IT architects, and fisheries compliance officers to:
1. Load realistic voyage scenarios (`VMS ➔ eLog ➔ PNO ➔ Landing ➔ Sale`).
2. Execute automated cross-checks (Rules-as-Code) with deterministic precision.
3. Inspect anomalies at both the mathematical level (deviations, conversion factors, timestamps) and the statutory level (exact EU/national legal basis).
4. Generate authoritative audit memos (*tilsynsnotater / agterskrivelser*) with full legal provenance.

---

## 3. Core Validation Engine (Rules-as-Code Specification)

The engine executes 5 core automated cross-checks mandated by EU Articles 49–53:

### Rule 1: 10% Margin of Tolerance (Art. 14 & Art. 50(1)(c))
- **Cross-check**: eLog catch estimates vs. weighed landing declaration.
- **Formula**:
  $$\text{LiveWeight}_{\text{landed}} = \text{WeighedWeight} \times \text{ConversionFactor}(\text{Species}, \text{Presentation})$$
  $$\text{Deviation} = \frac{|\text{LiveWeight}_{\text{landed}} - \text{EstimatedWeight}_{\text{elog}}|}{\text{LiveWeight}_{\text{landed}}} \times 100\%$$
- **Verdict**:
  - $\le 10\%$: PASS (Green).
  - $10.1\% - 20.0\%$: WARNING / Pelagic exemption review (Amber).
  - $> 20.0\%$ (or $> 10.0\%$ for standard demersal): VIOLATION (Red) $\rightarrow$ Points assignment candidate under Art. 92 / BEK point system.

### Rule 2: 4-Hour Prior Notice of Landing (PNO) (Art. 17 & Art. 50(1)(b))
- **Cross-check**: PNO transmission timestamp vs. actual/estimated time of arrival (ETA).
- **Rule**: $T_{\text{ETA}} - T_{\text{PNO\_transmitted}} \ge 4 \text{ hours}$ (unless landing in designated home port with national exemption).
- **Verdict**:
  - Timely: PASS.
  - $< 4$ hours without registered exemption: VIOLATION (Red) $\rightarrow$ Mandatory quay-side inspection trigger.

### Rule 3: Geographic & ICES Area Consistency (Art. 50(1)(a))
- **Cross-check**: VMS / AIS coordinates during fishing events vs. ICES statistical rectangle declared in eLog.
- **Rule**: If eLog declares catch in ICES area `4b` (Nordsøen), VMS ping timestamps with fishing speed ($1.5 - 4.5 \text{ knots}$) must fall within `4b` polygons, not `3a` (Skagerrak/Kattegat) or protected Marine Protected Areas (MPAs).
- **Verdict**:
  - Match: PASS.
  - Discrepancy: CRITICAL VIOLATION (Red) $\rightarrow$ Suspected misreporting / quota laundering across management zones.

### Rule 4: Conversion Factor Consistency (EU 2025/2196 Bilag & Art. 50(1)(e))
- **Cross-check**: Applied conversion factor vs. official statutory lookup table.
- **Rule**: e.g., Gutted with head on (GUT) cod = factor $1.18$; Gutted without head (GUH) = $1.38$.
- **Verdict**:
  - Match: PASS.
  - Manual tampering or outdated factor applied: SYSTEM ERROR (Amber).

### Rule 5: Mass-Balance / First Sale Reconciliation (Art. 50(1)(d) & Art. 62)
- **Cross-check**: Weighed landing declaration vs. buyer's first-sale sales note.
- **Rule**: $\sum \text{WeighedSales} \approx \sum \text{WeighedLanding} \pm 1\%$ (allowing standard scale tare).
- **Verdict**:
  - Match: PASS.
  - Weighed sales lower than landed without registered transport document: UNREGISTERED FISH (Red).

---

## 4. User Experience & Interface Architecture

The workbench is added to `fiskerikontrol-app` at `/?view=crosscheck` (or route `/crosscheck`).

```
┌────────────────────────────────────────────────────────────────────────┐
│  KRYDSKONTROL-WORKBENCH (EU Art. 49-53)                                │
├────────────────────────────────────────────────────────────────────────┤
│  [ Vælg Fangstrejse Scenarie ▾ ]  [ Nulstil ]  [ Rediger Rejsedata ]   │
│  • Scenarie A: Lovlig landing (Kutter Hansi)                           │
│  • Scenarie B: 24% Tolerancemargen-brud (Kutter Marina)                │
│  • Scenarie C: PNO 2 timer forsinket (Kutter Thor)                     │
│  • Scenarie D: ICES 4b vs. VMS i Kattegat (Kutter Svanen)             │
├────────────────────────────────────────────────────────────────────────┤
│  1. HÆNDELSES-PIPELINE (TRANSAKTIONSKÆDE)                              │
│  [VMS Spor] ──> [eLog Træk] ──> [PNO Varsel] ──> [Landing] ──> [Salg] │
│     ✅ OK          ✅ OK           🚨 2t forsinket   ⚠️ +14%       ✅ OK │
├────────────────────────────────────────────────────────────────────────┤
│  2. DETEKTEREDE REGELAFVIGELSER & AUDIT CARDS                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 🚨 OVERTRÆDELSE: Tolerancemargen overskredet (24.7% > 10.0%)     │  │
│  │ Art: Torsk (COD) | Præsentation: Renset m/ hoved (GUT - 1.18)   │  │
│  │ eLog skøn: 800 kg  | Faktisk vejet landing: 900 kg (= 1062 kg)   │  │
│  │ Lovhjemmel: EU 1224/2009 Art. 14(3) som ændret ved EU 2023/2842  │  │
│  │ Sanktionspotentiale: 3 strafpoint jf. Art. 92 / BEK 1197/2025     │  │
│  │ [ Inspicer i Lovgraf ]  [ Kopiér til Agterskrivelse ]           │  │
│  └──────────────────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────────────┤
│  3. GENERERET AUDIT MEMO (OFFICIELT TILSYNSNOTAT)                      │
│  [ Kopiér Notat ] [ Eksportér Markdown ] [ Vis Formalia ]              │
│  "VEDRØRENDE KRYDSKONTROL FOR FARTØJ HV-123 (REJSE #2026-89)           │
│   Automatisk validering jf. kontrolforordningens art. 109 har          │
│   konstateret følgende uoverensstemmelse..."                           │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Curated Presets (Golden Scenarios)

The workbench comes out of the box with 4 realistic synthetic test scenarios (no confidential data):

1. **Scenario 1: Grøn Fangstrejse (Baseline Compliant)**
   - Coastal vessel (< 12m), 2 hauls in ICES 4b.
   - PNO transmitted 4h 15m before landing.
   - Cod estimated 500kg, landed 480kg live weight (4.0% deviation).
   - Expected result: 0 violations, full green pipeline.
2. **Scenario 2: Alvorlig Tolerancemargen-brud (Margin of Tolerance Breach)**
   - Trawler, mixed demersal catch.
   - Plaice (rødspætte) estimated at 1,200kg. Landed gutted weight 1,400kg $\times$ factor 1.05 = 1,470kg live weight (22.5% deviation).
   - Expected result: Red flag on Landing stage, Art. 14(3) citation, points assessment.
3. **Scenario 3: Forsinket Forhåndsmeddelelse (Late PNO Breach)**
   - PNO sent at 11:30 for landing at 13:00 (1h 30m warning vs. 4h statutory requirement).
   - Expected result: Red flag on PNO stage, Art. 17 citation, quay-side inspector dispatch recommendation.
4. **Scenario 4: Geografisk Kvoteforvridning (Zone Laundering)**
   - eLog claims all catch taken in ICES 4b (North Sea, where vessel has remaining quota).
   - VMS track shows vessel was stationary/fishing at 2.8 knots inside ICES 3a (Skagerrak, closed quota).
   - Expected result: Red flag on Spatial Cross-check, Art. 50(1)(a) violation.

---

## 6. Non-Goals (Scope Boundaries)

- **No Live Production Database Connection**: The workbench does not connect to live FMC / FOS databases. It is a simulation and evaluation workbench driven by synthetic and imported test fixtures.
- **No Manual Law Text Annotation in this view**: The workbench does not parse raw PDF law on the fly; it references already parsed and established provisions from the bundled LexGraph corpus and `feltkatalog.csv`.
- **No Complex GIS Map Rendering for MVP**: Geographic checks evaluate polygon bounding boxes and distance/area logic; full interactive Leaflet/Mapbox maps can be added in a later iteration if needed.

---

## 7. Success Criteria & Verification

1. **Deterministic Accuracy**: 100% of calculation rules (tolerances, conversion factors, timestamps) match the exact specifications in `feltkatalog.csv` and EU 2025/2196.
2. **Zero-Friction Casework Understanding**: Any caseworker or analyst can open a scenario and immediately identify:
   - What event failed.
   - The numerical discrepancy.
   - The exact statutory reference (Article and Act).
3. **Instant Audit Generation**: Generates an authoritative Danish audit memo with 1 click, formatted in standard Danish ministerial administrative style.
4. **Automated Test Coverage**: Vitest suite with full coverage of all 5 validation rules across all 4 scenarios.
