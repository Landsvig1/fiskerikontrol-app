# Kontrolkæden — standalone frontend

**This is not part of the LexGraph Next.js app. It is a separate, self-contained
frontend that ships in the same repository and is meant to be run on its own.**

Open the file. That is the whole procedure:

```bash
open standalone/kontrolkaede/index.html
```

No `npm install`, no `npm run dev`, no build step, no server. One HTML file,
24 KB, with its CSS and JS inline. It does not import from `src/`, does not call
`/api/*`, and nothing in the Next.js app imports from here. Deleting the app
would not affect it, and deleting this directory would not affect the app.

## Why it is built this way

The audience is caseworkers and analysts on restricted government workstations
where Node.js is not installed and installing it is not a conversation worth
having. A single file that opens in whatever browser is already on the machine
is the only distribution format that survives that constraint. It can also be
attached to an email or dropped on a network share without ceremony.

The one network dependency is the Google Fonts stylesheet. Offline it falls back
to the system sans-serif stack and remains fully legible; nothing else on the
page needs the network.

## What it shows

Ten operational phases of Danish and EU fisheries control, from licensing to
automated cross-check, each decomposed into four layers:

| Layer | Question it answers |
|---|---|
| Jura | Which named act and article is the obligation grounded in? |
| Forvaltning | Who acts, on what deadline, against what tolerance? |
| Data | Which concrete annex fields are created or verified here? |
| It-systemer | Which systems exchange the data, and where is the handover still manual? |

Each phase also lists its chain connections in both directions — what feeds it,
and what it triggers — and those are navigable. The connections are the point of
the tool: they make visible that a suspicion raised at sea in phase 4 is what
forces a 100 % control weighing at the quay in phase 7, and that points assessed
in phase 10 land on the licence back in phase 1.

## Relationship to the fiske foundation

The content is not invented. It is derived from the same corpus this repository
is built on, plus the annex extraction in the sibling repository
[`fiskeri-domaenegrundlag`](https://github.com/Landsvig1/fiskeri-domaenegrundlag):

- Field numbers in the Data layer come from `Legal docs/bilag/feltkatalog.csv`
  (128 catalogued fields across Annexes I–XIX), chiefly Annex XV (51 logbook
  fields) and Annex XIX (30 sales note fields).
- Sanction figures come from `kodelister/pointsystem_overtraedelser.csv`
  (26 offence types, 3–7 points) and the severity criteria in
  `kriterier_alvorlige_overtraedelser.csv`.
- Article references are to (EF) 1224/2009 as amended by (EU) 2023/2842 and
  implemented by (EU) 2025/2196 — the same three acts as the bundled LexGraph
  corpus under `public/corpus/`.

Where LexGraph answers *which provisions cite which*, this frontend answers
*where in the operational chain a provision bites*. They read the same law from
opposite ends, which is why they share a repository and not a codebase.

## Editing it

All content lives in the `P` array in the inline `<script>`: one object per
phase, with `jura`, `forv`, `data` and `it` arrays, a `flow` string for the
system chain, a `note` for the pitfall, and `ind` / `ud` for the connections.
Adding a bullet means adding a string. There is no data pipeline to re-run.

Two conventions worth keeping if you edit:

1. **Never invent a source.** Every rule, deadline and obligation carries a named
   act and article. If a claim cannot be traced to the corpus, it does not go in.
2. **Danish only.** The interface language decision from the main README applies
   here for the same reason.

## Known limits

- Consolidated texts are lossy going forward. Obligations with an application
  date in 2027 or 2028 must be checked against (EU) 2023/2842 directly, because
  the consolidated 1224/2009 as of 2026 does not carry them.
- Two open questions are stated in the tool rather than answered, both pending
  internal clarification: whether the hold-back flag from phase 4 is
  automatically matched against incoming prior notifications in phase 5, and
  whether an existing rules engine exists to build the Article 49–53 validation
  on in phase 10.
