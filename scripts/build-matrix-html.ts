import fs from 'fs';
import path from 'path';
import {
  MATRIX_NODES,
  MATRIX_EDGES,
  MATRIX_COLUMNS,
} from '../src/lib/matrixData';
import {
  MATRIX_SCENARIOS,
} from '../src/lib/matrixScenarios';

const htmlContent = `<!DOCTYPE html>
<html lang="da-DK">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Miljøministeriet · Fiskeristyrelsen — Fiskeriets Matrix: Krydsfelter i Kontrolkæden</title>
  <style>
    :root {
      --bg: #fafaf9;
      --surface: #ffffff;
      --border: #e2e8f0;
      --border-subtle: #f1f5f9;
      --text: #0f172a;
      --text-muted: #475569;
      --text-dim: #64748b;
      --mim-green: #0e472f;
      --mim-green-tint: #ecfdf5;
      --mim-green-border: #a7f3d0;
      --purple-tint: #f5f3ff;
      --purple-text: #5b21b6;
      --purple-border: #ddd6fe;
      --font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      --font-mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: var(--font-sans);
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    header {
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 0;
      z-index: 30;
      padding: 0.85rem 1.5rem;
    }

    .header-inner {
      max-width: 1280px;
      margin: 0 auto;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .emblem {
      width: 34px;
      height: 34px;
      background: var(--mim-green);
      color: white;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 0.85rem;
    }

    .brand-text h1 {
      font-size: 1.05rem;
      font-weight: 700;
      letter-spacing: -0.01em;
    }

    .brand-sub {
      font-size: 0.72rem;
      color: var(--text-dim);
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .timeline-toggle {
      background: #f1f5f9;
      padding: 3px;
      border-radius: 8px;
      display: inline-flex;
      border: 1px solid var(--border);
    }

    .toggle-btn {
      border: none;
      background: transparent;
      padding: 0.35rem 0.75rem;
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--text-dim);
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s;
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .toggle-btn.active-2026 {
      background: #ffffff;
      color: var(--text);
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }

    .toggle-btn.active-2028 {
      background: var(--mim-green);
      color: white;
    }

    .btn-secondary {
      background: #ffffff;
      border: 1px solid var(--border);
      padding: 0.4rem 0.8rem;
      font-size: 0.78rem;
      font-weight: 500;
      color: var(--text);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s;
    }

    .btn-secondary:hover {
      background: #f8fafc;
    }

    /* Subheader Quick Scenarios */
    .subnav {
      background: #ffffff;
      border-bottom: 1px solid var(--border);
      padding: 0.65rem 1.5rem;
    }

    .subnav-inner {
      max-width: 1280px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .chips-container {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      overflow-x: auto;
      flex-wrap: wrap;
    }

    .chip {
      background: #ffffff;
      border: 1px solid var(--border);
      padding: 0.3rem 0.65rem;
      border-radius: 6px;
      font-size: 0.75rem;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .chip:hover {
      background: #f8fafc;
      color: var(--text);
    }

    .chip.is-active {
      background: #0f172a;
      color: white;
      border-color: #0f172a;
      font-weight: 600;
    }

    .chip-tag {
      font-size: 0.65rem;
      font-family: var(--font-mono);
      padding: 1px 4px;
      border-radius: 3px;
      background: rgba(0,0,0,0.06);
    }

    .chip.is-active .chip-tag {
      background: rgba(255,255,255,0.2);
    }

    .view-toggle {
      background: #f1f5f9;
      padding: 2px;
      border-radius: 6px;
      border: 1px solid var(--border);
      display: flex;
      font-size: 0.75rem;
    }

    .view-btn {
      border: none;
      background: transparent;
      padding: 0.25rem 0.65rem;
      border-radius: 4px;
      color: var(--text-dim);
      font-weight: 500;
      cursor: pointer;
    }

    .view-btn.is-active {
      background: #ffffff;
      color: var(--text);
      font-weight: 600;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    }

    /* Main Container */
    main {
      max-width: 1280px;
      width: 100%;
      margin: 0 auto;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      flex: 1;
    }

    /* Focus Card Banner */
    .focus-banner {
      background: #ffffff;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .focus-top {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 1rem;
      align-items: flex-start;
    }

    .focus-meta {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-bottom: 0.35rem;
    }

    .badge-category {
      font-size: 0.68rem;
      font-weight: 700;
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
      background: var(--mim-green-tint);
      color: var(--mim-green);
      border: 1px solid var(--mim-green-border);
      text-transform: uppercase;
    }

    .badge-legal {
      font-size: 0.72rem;
      font-family: var(--font-mono);
      padding: 0.15rem 0.5rem;
      background: #f1f5f9;
      color: var(--text-muted);
      border-radius: 4px;
      border: 1px solid var(--border);
    }

    .badge-2028 {
      font-size: 0.7rem;
      font-family: var(--font-mono);
      font-weight: 600;
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
      background: var(--purple-tint);
      color: var(--purple-text);
      border: 1px solid var(--purple-border);
    }

    .focus-title {
      font-size: 1.35rem;
      font-weight: 700;
      color: var(--text);
    }

    .focus-desc {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-top: 0.5rem;
      max-width: 850px;
      line-height: 1.5;
    }

    .focus-select-wrap {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      width: 260px;
    }

    .focus-select {
      background: #f8fafc;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 0.45rem 0.65rem;
      font-size: 0.78rem;
      color: var(--text);
      outline: none;
    }

    /* 4-Lanes Kontrolkæde Layout */
    .chain-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .chain-title {
      font-size: 1rem;
      font-weight: 700;
    }

    .chain-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
    }

    @media (max-width: 1024px) {
      .chain-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 640px) {
      .chain-grid {
        grid-template-columns: 1fr;
      }
    }

    .chain-col {
      background: #ffffff;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .col-header {
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #f1f5f9;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .col-title {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-dim);
    }

    .col-count {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      color: var(--text-dim);
    }

    .col-items {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      flex: 1;
    }

    .item-card {
      background: #f8fafc;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 0.65rem;
      cursor: pointer;
      transition: all 0.15s;
    }

    .item-card:hover {
      background: #ffffff;
      border-color: #cbd5e1;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }

    .item-card.is-focus {
      background: var(--mim-green-tint);
      border-color: var(--mim-green);
    }

    .item-card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.25rem;
    }

    .item-card-category {
      font-size: 0.62rem;
      font-weight: 600;
      color: var(--text-dim);
    }

    .item-card-title {
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--text);
    }

    .item-card-role {
      margin-top: 0.35rem;
      padding-top: 0.35rem;
      border-top: 1px solid #e2e8f0;
      font-size: 0.7rem;
      color: var(--mim-green);
      font-weight: 500;
    }

    /* All Elements Table */
    .table-panel {
      background: #ffffff;
      border: 1px solid var(--border);
      border-radius: 10px;
      overflow: hidden;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.78rem;
    }

    th {
      background: #f8fafc;
      padding: 0.65rem 0.85rem;
      border-bottom: 1px solid var(--border);
      font-weight: 600;
      color: var(--text-dim);
      font-size: 0.72rem;
      text-transform: uppercase;
    }

    td {
      padding: 0.65rem 0.85rem;
      border-bottom: 1px solid #f1f5f9;
    }

    tr:hover td {
      background: #f8fafc;
    }

    /* Footer */
    footer {
      background: #ffffff;
      border-top: 1px solid var(--border);
      padding: 1.25rem 1.5rem;
      margin-top: auto;
      font-size: 0.75rem;
      color: var(--text-dim);
    }

    .footer-inner {
      max-width: 1280px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 1rem;
    }
  </style>
</head>
<body>

  <!-- Clean Header -->
  <header>
    <div class="header-inner">
      <div class="brand">
        <div class="emblem">FS</div>
        <div class="brand-text">
          <div class="brand-sub">
            <span>Fiskeristyrelsen</span>
            <span>•</span>
            <span>Kontrol & Tilsyn</span>
          </div>
          <h1>Fiskeriets Matrix</h1>
        </div>
      </div>

      <div class="header-actions">
        <div class="timeline-toggle" role="group">
          <button type="button" id="btn-2026" class="toggle-btn active-2026" onclick="setYear(2026)">
            2026: Gældende Ret
          </button>
          <button type="button" id="btn-2028" class="toggle-btn" onclick="setYear(2028)">
            2028: Målarkitektur
          </button>
        </div>

        <button type="button" class="btn-secondary" id="btn-copy-notat" onclick="copyNotat()">
          Kopier til Sagsnotat
        </button>

        <button type="button" class="btn-secondary" onclick="copyLink()">
          Del
        </button>
      </div>
    </div>
  </header>

  <!-- Subnav Quick Scenarios -->
  <div class="subnav">
    <div class="subnav-inner">
      <div class="chips-container" id="chips-container">
        <!-- Injected via JavaScript -->
      </div>

      <div class="view-toggle">
        <button type="button" id="tab-chain" class="view-btn is-active" onclick="switchTab('chain')">
          Kontrolkæde (Standard)
        </button>
        <button type="button" id="tab-matrix" class="view-btn" onclick="switchTab('matrix')">
          Alle 38 Elementer
        </button>
      </div>
    </div>
  </div>

  <!-- Main View -->
  <main>
    <!-- Focus Banner -->
    <div class="focus-banner">
      <div class="focus-top">
        <div>
          <div class="focus-meta">
            <span class="badge-category" id="focus-category">Kategori</span>
            <span class="badge-legal" id="focus-legal" style="display: none;"></span>
            <span class="badge-2028" id="focus-2028" style="display: none;">Træder i kraft 2028</span>
          </div>
          <h2 class="focus-title" id="focus-title">Nodetitel</h2>
          <p class="focus-desc" id="focus-desc"></p>
        </div>

        <div class="focus-select-wrap">
          <label for="focus-select" style="font-size: 0.72rem; font-weight: 600; color: var(--text-dim);">
            Skift fokuspunkt:
          </label>
          <select id="focus-select" class="focus-select" onchange="selectNode(this.value)">
            <!-- Populated via JS -->
          </select>
        </div>
      </div>
    </div>

    <!-- View 1: Forbundne Krydsfelter i Kontrolkæden -->
    <div id="view-chain">
      <div class="chain-header" style="margin-bottom: 0.75rem;">
        <div>
          <h3 class="chain-title">Forbundne Krydsfelter i Kontrolkæden</h3>
          <p style="font-size: 0.75rem; color: var(--text-dim); margin-top: 0.1rem;">
            Relevante aktører, hændelser, IT-systemer og lovhjemmel forbundet med det valgte element.
          </p>
        </div>
        <span id="chain-count" style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-dim);"></span>
      </div>

      <div class="chain-grid" id="chain-grid">
        <!-- 4 columns injected via JS -->
      </div>
    </div>

    <!-- View 2: All Elements Table -->
    <div id="view-matrix" style="display: none;">
      <div class="table-panel">
        <table>
          <thead>
            <tr>
              <th>Element / Titel</th>
              <th>Søjle</th>
              <th>Kategori</th>
              <th>Lovhjemmel</th>
              <th>Tidslinje</th>
              <th style="text-align: right;">Handling</th>
            </tr>
          </thead>
          <tbody id="matrix-tbody">
            <!-- Populated via JS -->
          </tbody>
        </table>
      </div>
    </div>
  </main>

  <!-- Clean Footer -->
  <footer>
    <div class="footer-inner">
      <div>
        <strong>Fiskeristyrelsen</strong> · Styrelsen for Fødevarer, Landbrug og Fiskeri
      </div>
      <div>
        Retsgrundlag: (EU) 1224/2009, (EU) 2023/2842, (EU) 2025/2196, BEK 1144/2025, BEK 1197/2025
      </div>
    </div>
  </footer>

  <script>
    const MATRIX_NODES = ${JSON.stringify(MATRIX_NODES, null, 2)};
    const MATRIX_EDGES = ${JSON.stringify(MATRIX_EDGES, null, 2)};
    const MATRIX_SCENARIOS = ${JSON.stringify(MATRIX_SCENARIOS, null, 2)};

    let currentYear = 2026;
    let selectedNodeId = "actor_micro";
    let currentTab = "chain";

    function getConnectedNodes(startId, year) {
      const visited = new Set();
      const queue = [startId];
      visited.add(startId);

      const activeEdges = MATRIX_EDGES.filter(e => e.yearValidFrom <= year);

      while (queue.length > 0) {
        const curr = queue.shift();
        for (const edge of activeEdges) {
          let neighbor = null;
          if (edge.sourceId === curr) neighbor = edge.targetId;
          else if (edge.targetId === curr) neighbor = edge.sourceId;

          if (neighbor && !visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }
      return visited;
    }

    function setYear(year) {
      currentYear = year;
      document.getElementById("btn-2026").className = "toggle-btn" + (year === 2026 ? " active-2026" : "");
      document.getElementById("btn-2028").className = "toggle-btn" + (year === 2028 ? " active-2028" : "");
      renderScenarios();
      renderFocusBanner();
      renderChain();
      renderTable();
    }

    function selectNode(id) {
      selectedNodeId = id || "actor_micro";
      renderScenarios();
      renderFocusBanner();
      renderChain();
      renderTable();
    }

    function switchTab(tab) {
      currentTab = tab;
      document.getElementById("tab-chain").className = "view-btn" + (tab === "chain" ? " is-active" : "");
      document.getElementById("tab-matrix").className = "view-btn" + (tab === "matrix" ? " is-active" : "");
      document.getElementById("view-chain").style.display = tab === "chain" ? "block" : "none";
      document.getElementById("view-matrix").style.display = tab === "matrix" ? "block" : "none";
    }

    function renderScenarios() {
      const cont = document.getElementById("chips-container");
      cont.innerHTML = "";

      for (const sc of MATRIX_SCENARIOS) {
        const isSelected = selectedNodeId === sc.focusNodeId && currentYear === sc.year;
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "chip" + (isSelected ? " is-active" : "");
        chip.onclick = () => {
          setYear(sc.year);
          selectNode(sc.focusNodeId);
        };
        chip.innerHTML = \`
          <span>\${sc.titleDa}</span>
          <span class="chip-tag">\${sc.badgeDa}</span>
        \`;
        cont.appendChild(chip);
      }
    }

    function populateSelect() {
      const sel = document.getElementById("focus-select");
      sel.innerHTML = "";

      const cols = [
        { id: "actors", label: "1. Aktører & Fartøjer" },
        { id: "events", label: "2. Hændelser i Kæden" },
        { id: "systems", label: "3. IT-Systemer & Data" },
        { id: "regulations", label: "4. Regelsæt & Hjemmel" },
      ];

      for (const col of cols) {
        const grp = document.createElement("optgroup");
        grp.label = col.label;
        const nodes = MATRIX_NODES.filter(n => n.column === col.id);
        for (const n of nodes) {
          const opt = document.createElement("option");
          opt.value = n.id;
          opt.textContent = n.titleDa;
          grp.appendChild(opt);
        }
        sel.appendChild(grp);
      }
    }

    function renderFocusBanner() {
      const node = MATRIX_NODES.find(n => n.id === selectedNodeId) || MATRIX_NODES[0];
      document.getElementById("focus-title").textContent = node.titleDa;
      document.getElementById("focus-desc").textContent = node.descriptionDa;
      document.getElementById("focus-category").textContent = node.category;

      const legalEl = document.getElementById("focus-legal");
      if (node.legalReference) {
        legalEl.textContent = "⚖️ " + node.legalReference;
        legalEl.style.display = "inline-block";
      } else {
        legalEl.style.display = "none";
      }

      document.getElementById("focus-2028").style.display = node.introducedYear === 2028 ? "inline-block" : "none";
      document.getElementById("focus-select").value = node.id;
    }

    function renderChain() {
      const connectedSet = getConnectedNodes(selectedNodeId, currentYear);
      document.getElementById("chain-count").textContent = connectedSet.size + " forbundne elementer";

      const activeEdges = MATRIX_EDGES.filter(e => e.yearValidFrom <= currentYear);

      const byCol = { actors: [], events: [], systems: [], regulations: [] };
      for (const id of connectedSet) {
        const node = MATRIX_NODES.find(n => n.id === id);
        if (!node) continue;

        const isCurrent = node.id === selectedNodeId;
        const directEdge = activeEdges.find(e =>
          (e.sourceId === selectedNodeId && e.targetId === id) ||
          (e.targetId === selectedNodeId && e.sourceId === id)
        );

        byCol[node.column].push({ node, roleDa: directEdge ? directEdge.roleDa : undefined, isCurrent });
      }

      const grid = document.getElementById("chain-grid");
      grid.innerHTML = "";

      const colDefs = [
        { id: "actors", title: "1. Aktør / Fartøj" },
        { id: "events", title: "2. Hændelse i Kæden" },
        { id: "systems", title: "3. IT-System & Data" },
        { id: "regulations", title: "4. Regelsæt & Hjemmel" },
      ];

      for (const col of colDefs) {
        const colDiv = document.createElement("div");
        colDiv.className = "chain-col";

        const items = byCol[col.id];

        colDiv.innerHTML = \`
          <div class="col-header">
            <span class="col-title">\${col.title}</span>
            <span class="col-count">\${items.length}</span>
          </div>
          <div class="col-items" id="col-items-\${col.id}"></div>
        \`;

        const itemsCont = colDiv.querySelector(\`#col-items-\${col.id}\`);

        for (const { node, roleDa, isCurrent } of items) {
          const card = document.createElement("div");
          card.className = "item-card" + (isCurrent ? " is-focus" : "");
          card.onclick = () => selectNode(node.id);

          card.innerHTML = \`
            <div class="item-card-top">
              <span class="item-card-category">\${node.category}</span>
              \${isCurrent ? '<span style="font-size: 0.65rem; font-weight: 700; color: var(--mim-green);">Fokus</span>' : ''}
            </div>
            <div class="item-card-title">\${node.titleDa}</div>
            \${node.legalReference ? \`<div style="font-size:0.68rem;font-family:var(--font-mono);color:var(--text-dim);margin-top:0.15rem;">⚖️ \${node.legalReference}</div>\` : ''}
            \${roleDa ? \`<div class="item-card-role">→ \${roleDa}</div>\` : ''}
          \`;

          itemsCont.appendChild(card);
        }

        grid.appendChild(colDiv);
      }
    }

    function renderTable() {
      const tbody = document.getElementById("matrix-tbody");
      tbody.innerHTML = "";

      for (const n of MATRIX_NODES) {
        const tr = document.createElement("tr");
        tr.innerHTML = \`
          <td><strong>\${n.titleDa}</strong></td>
          <td>\${n.column}</td>
          <td>\${n.category}</td>
          <td style="font-family:var(--font-mono);">\${n.legalReference || "—"}</td>
          <td>\${n.introducedYear === 2028 ? '<span style="color:#6b21a8;font-weight:700;">2028</span>' : '2026'}</td>
          <td style="text-align: right;">
            <button type="button" class="btn-secondary" style="padding: 2px 6px;" onclick="selectNode('\${n.id}'); switchTab('chain');">
              Vis Kæde →
            </button>
          </td>
        \`;
        tbody.appendChild(tr);
      }
    }

    function copyNotat() {
      const node = MATRIX_NODES.find(n => n.id === selectedNodeId) || MATRIX_NODES[0];
      const text = \`FISKERISTYRELSEN · KONTROLKÆDE NOTAT\\nElement: \${node.titleDa} [\${node.category}]\\nHjemmel: \${node.legalReference || "N/A"}\\nTidslinje: \${currentYear}\\nBeskrivelse: \${node.descriptionDa}\\nDato: \${new Date().toLocaleDateString("da-DK")}\`;
      navigator.clipboard.writeText(text);
      const btn = document.getElementById("btn-copy-notat");
      btn.textContent = "✓ Kopieret";
      setTimeout(() => { btn.textContent = "Kopier til Sagsnotat"; }, 2000);
    }

    function copyLink() {
      const url = new URL(window.location.href);
      url.searchParams.set("node", selectedNodeId);
      url.searchParams.set("yr", currentYear.toString());
      navigator.clipboard.writeText(url.toString());
      alert("Link kopieret!");
    }

    // Init
    populateSelect();
    renderScenarios();
    setYear(2026);
  </script>
</body>
</html>
`;

const outputPath = path.resolve(__dirname, '../public/fiskeri-matrix-explorer.html');
fs.writeFileSync(outputPath, htmlContent, 'utf-8');
console.log('Successfully generated public/fiskeri-matrix-explorer.html (' + htmlContent.length + ' bytes)');
