# LexGraph

Parses EU and Danish fisheries-control legislation into a citation graph, and
traces which provisions bear on a given article and which acts amend it.

The interface is Danish only, by decision: it is a tool for Danish
fisheries-control caseworkers reading Danish and EU law in Danish, and an
unreviewed English rendering of legal text is a liability rather than a feature.

## What it actually answers

The bundled corpus contains three EU acts that amend or implement the control
regulation 1224/2009. Keeping track of what they change is a real, tedious job,
and it is the question this tool answers well:

- **Konsolidering** ranks provisions by how many separate acts cite them, and
  lists every citation bearing on one provision.
- **Ændringsregister** lists every citation whose text changes a provision in
  another act, with the quoted evidence.

Ranking is by distinct citing acts, not raw citation count. Raw counts put the
comitology procedure article and two bemyndigelse paragraphs on top, because
each is cited many times from inside its own act and never from outside it.

## What it does not do

It was built to flag where Danish derogations collide with EU obligations. It
cannot, and the reason is worth stating plainly: **Danish bekendtgørelser do not
cite EU law by article number.** Across the bundled corpus, `artikel N` appears
zero times in BEK 1197/2025, BEK 1571/2025 and LBK 205/2023, once in
BEK 1495/2021 (and that one is `artikel 288` TFEU boilerplate), and four times
in BEK 1144/2025. They name the regulation in the preamble and then legislate in
their own paragraphs.

A citation graph cannot follow a citation that is not in the text. The EU/national
relationship in this corpus is one of subject matter, not citation.

Two further limits, stated rather than hidden:

- **Modality classification is a keyword sniff** over a window around each
  citation. It is useful as a filter, not as a legal conclusion.
- **An amending act inflates its own article count.** EU 2023/2842 has six
  articles and parses as sixty-one, because it quotes the replacement text it
  introduces, headings and all. Which article is *changed* is reliable; which
  article did the changing is not, so amendments are attributed to the act.

## Running it

```bash
npm install
npm run dev
```

Everything is addressable by URL. `?docs=` names a corpus from the bundled
preset ids, `view` picks a screen, `p` selects a provision:

```
/?docs=eu-1224-2009,eu-2023-2842&view=consolidation&p=doc0_sec_14
```

Uploaded PDFs get no link. There is nowhere to persist them, and a link that
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

## Development

```bash
npm test         # vitest, 260 tests
npm run lint
npm run build
```

## Licence

Code is MIT (see `LICENSE`). The legal texts under `public/corpus/` are not,
see `NOTICE`.
