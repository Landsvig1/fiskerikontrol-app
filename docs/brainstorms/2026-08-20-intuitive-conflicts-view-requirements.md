# Requirements Document: Self-Explanatory 'Konflikter' UI (Krav vs. Undtagelse)

**Date**: 2026-08-20  
**Topic**: Frictionless Conflict Understanding without Onboarding  
**Status**: Approved & Ready for Planning / LFG  

---

## 1. Problem Frame & Friction Points

The current "Konflikter" page relies on abstract graph theory concepts (*"Collisions occur when one section imposes an Obligation while another grants an Exception"*).

For a fisheries officer, legal advisor, or director, this requires mental translation. The interface should immediately answer three fundamental questions at a glance:
1. **Hvad kræver EU-loven?** (The mandatory baseline)
2. **Hvad tillader den danske bekendtgørelse?** (The national deviation/exemption)
3. **Hvad er den juridiske konsekvens?** (Which rule wins, and what is the inspection risk?)

---

## 2. Target Design Specification

### A. Intro & Banner
- Replace mathematical collision explanation with clear Danish domain context:
  - *Headline*: **Regulatoriske Modstrid & Retsrisici**
  - *Subtitle*: *Automatisk identifikation af modsigelser mellem bindende EU-forordninger og nationale bekendtgørelser.*

### B. Contrast Card Architecture (3-Block Flow)
Each conflict card will feature a structured 3-part layout:

1. **Card Header**:
   - Distinct Conflict Badge (`🚨 Modstrid: Krav vs. Undtagelse`).
   - Conflict Pair Headline (e.g. `EU 2023/2842 Art. 9 ⟷ BEK 1197/2025 § 3`).
   - Quick Legal Precedence Tag (`⚖️ EU-forordning har forrang`).

2. **Side-by-Side 'Krav vs. Undtagelse' Contrast Grid**:
   - **Venstre Søjle — 🔵 EU-Krav (Hovedregel)**:
     - Card styling: Crisp white with sky-blue border (`border-sky-300 bg-sky-50/30`).
     - Badge: `EU Krav (Obligation)` with bold article title.
     - Highlighted quote text with statutory emphasis.
   - **Højre Søjle — ⚠️ Dansk Afvigelse (Undtagelse)**:
     - Card styling: Crisp white with warm amber border (`border-amber-300 bg-amber-50/30`).
     - Badge: `National Undtagelse (Exception)` with bekendtgørelse title.
     - Highlighted quote text.

3. **Plain-Danish Verdict Banner (💡 Konklusion for Tilsynet)**:
   - Soft background container summarizing:
     - *Hvem rammes*: Fx *Kystfiskere under 8 meter*.
     - *Juridisk dom*: *EU-reglen har forrang. Den nationale dispensation beskytter ikke mod EU-sanktioner.*

4. **Action Bar**:
   - **"Inspicer Modstrid"** (Launches the full side-by-side inspector modal).
   - **"Vis i Graf"** (Jumps to network connection).

---

## 3. Success Criteria
- A user with zero prior introduction can look at any conflict card and understand within 3 seconds:
  1. What the EU requirement is.
  2. What the Danish exemption says.
  3. Why it matters for fisheries control.
