import fs from 'fs';
import path from 'path';
import {
  MATRIX_NODES,
  MATRIX_EDGES,
  MATRIX_COLUMNS,
} from '../src/lib/matrixData';

const htmlContent = `<!DOCTYPE html>
<html lang="da-DK" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Miljøministeriet · Fiskeristyrelsen — Fiskeriets Matrix: 360° Krydsfelts-Explorer</title>
  <style>
    :root {
      --bg: #f8faf8;
      --surface: #ffffff;
      --surface-subtle: #f0f4f1;
      --surface-card: #ffffff;
      --border: #e1e7e2;
      --border-strong: #cbd6cd;
      --border-focus: #0e472f;

      --text: #19211c;
      --text-muted: #4e5e54;
      --text-dim: #718177;

      --mim-green: #0e472f;
      --mim-action: #14643c;
      --mim-action-hover: #0b3d28;
      --mim-tint: #e6eee4;
      --mim-border-tint: #c5d7c3;
      --ink-inverted: #ffffff;

      --purple-bg: #f3e8ff;
      --purple-text: #581c87;
      --purple-border: #d8b4fe;

      --radius-sm: 4px;
      --radius: 8px;
      --radius-lg: 12px;

      --font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      --font-mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
      --font-serif: Georgia, Cambria, "Times New Roman", Times, serif;
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

    /* Top Ministry Header */
    header {
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      padding: 1rem 1.5rem;
      box-shadow: 0 1px 2px rgba(0,0,0,0.03);
    }

    .header-inner {
      max-width: 1700px;
      margin: 0 auto;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .brand-section {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }

    .emblem {
      width: 38px;
      height: 38px;
      background: var(--mim-green);
      border-radius: var(--radius);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 800;
      font-size: 1.1rem;
      letter-spacing: -0.5px;
      flex-shrink: 0;
    }

    .brand-text h1 {
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--text);
      letter-spacing: -0.01em;
    }

    .brand-text p {
      font-size: 0.78rem;
      color: var(--text-muted);
    }

    .header-controls {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    /* Timeline Switcher Buttons */
    .timeline-toggle {
      display: inline-flex;
      background: var(--surface-subtle);
      border: 1px solid var(--border);
      padding: 3px;
      border-radius: var(--radius);
    }

    .toggle-btn {
      background: transparent;
      border: none;
      padding: 0.4rem 0.85rem;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-muted);
      border-radius: calc(var(--radius) - 2px);
      cursor: pointer;
      transition: all 0.15s ease;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .toggle-btn.active-2026 {
      background: var(--surface);
      color: var(--mim-green);
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    .toggle-btn.active-2028 {
      background: var(--purple-text);
      color: #faf5ff;
      box-shadow: 0 1px 3px rgba(88,28,135,0.2);
    }

    .btn-badge {
      font-size: 0.65rem;
      padding: 1px 5px;
      border-radius: 4px;
      background: rgba(255,255,255,0.2);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .search-input {
      padding: 0.45rem 0.75rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      font-size: 0.82rem;
      background: var(--surface);
      color: var(--text);
      min-width: 220px;
    }

    .search-input:focus {
      outline: 2px solid var(--mim-action);
      border-color: transparent;
    }

    .btn-reset {
      background: var(--surface);
      border: 1px solid var(--border);
      padding: 0.45rem 0.85rem;
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--text-muted);
      border-radius: var(--radius);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-reset:hover {
      background: var(--surface-subtle);
      color: var(--text);
    }

    /* Sub-banner Notice */
    .status-banner {
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      padding: 0.6rem 1.5rem;
      font-size: 0.8rem;
    }

    .status-banner-inner {
      max-width: 1700px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .status-pill {
      font-family: var(--font-mono);
      font-size: 0.72rem;
      padding: 0.15rem 0.5rem;
      border-radius: var(--radius-sm);
      background: var(--mim-tint);
      color: var(--mim-green);
      border: 1px solid var(--mim-border-tint);
    }

    /* Main Grid Layout */
    main {
      flex: 1;
      max-width: 1700px;
      width: 100%;
      margin: 0 auto;
      padding: 1.25rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .matrix-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      align-items: stretch;
    }

    @media (max-width: 1200px) {
      .matrix-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 680px) {
      .matrix-grid {
        grid-template-columns: 1fr;
      }
    }

    .column-panel {
      background: rgba(240, 244, 241, 0.45);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 0.9rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .column-header {
      padding-bottom: 0.6rem;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .column-title {
      font-family: var(--font-serif);
      font-size: 0.92rem;
      font-weight: 700;
      color: var(--text);
    }

    .column-desc {
      font-size: 0.72rem;
      color: var(--text-dim);
      margin-top: 0.15rem;
    }

    .column-count {
      font-family: var(--font-mono);
      font-size: 0.72rem;
      background: var(--surface);
      border: 1px solid var(--border);
      padding: 0.1rem 0.45rem;
      border-radius: var(--radius-sm);
      color: var(--text-dim);
      flex-shrink: 0;
    }

    .column-cards {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      flex: 1;
    }

    /* Node Cards */
    .card {
      background: var(--surface-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 0.75rem;
      text-align: left;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .card:hover {
      border-color: var(--border-strong);
      box-shadow: 0 2px 6px rgba(0,0,0,0.04);
      transform: translateY(-1px);
    }

    .card.is-selected {
      background: var(--mim-tint);
      border: 2px solid var(--mim-action);
      box-shadow: 0 4px 12px rgba(20, 100, 60, 0.15);
      transform: translateY(-1px);
    }

    .card.is-connected {
      background: #ffffff;
      border: 1.5px solid var(--mim-action);
      box-shadow: 0 2px 6px rgba(20, 100, 60, 0.08);
    }

    .card.is-dimmed {
      opacity: 0.25;
    }

    .card.is-dimmed:hover {
      opacity: 0.7;
    }

    .card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.4rem;
    }

    .card-category {
      font-size: 0.67rem;
      font-weight: 600;
      padding: 0.15rem 0.45rem;
      border-radius: var(--radius-sm);
      background: var(--surface-subtle);
      color: var(--text-muted);
      border: 1px solid var(--border);
    }

    .card.is-selected .card-category {
      background: var(--mim-green);
      color: white;
      border-color: var(--mim-green);
    }

    .card.is-connected .card-category {
      background: var(--mim-tint);
      color: var(--mim-green);
      border-color: var(--mim-border-tint);
    }

    .badge-2028 {
      font-size: 0.62rem;
      font-weight: 600;
      padding: 0.12rem 0.4rem;
      border-radius: var(--radius-sm);
      background: var(--purple-bg);
      color: var(--purple-text);
      border: 1px solid var(--purple-border);
      text-transform: uppercase;
    }

    .card-title {
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--text);
      line-height: 1.25;
    }

    .card.is-selected .card-title {
      color: var(--mim-green);
      font-weight: 700;
    }

    .card-subtitle {
      font-size: 0.72rem;
      color: var(--text-dim);
    }

    .card-indicator {
      margin-top: 0.25rem;
      padding-top: 0.25rem;
      border-top: 1px solid var(--border);
      font-size: 0.68rem;
      color: var(--mim-action);
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    /* Fakta-Panel / Inspector Drawer */
    .inspector-panel {
      background: var(--surface);
      border: 2px solid var(--mim-action);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      box-shadow: 0 8px 24px rgba(0,0,0,0.08);
      display: none;
      animation: fadeIn 0.2s ease-out;
    }

    .inspector-panel.is-active {
      display: block;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .inspector-header {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--border);
    }

    .inspector-titles {
      flex: 1;
      min-width: 260px;
    }

    .inspector-meta {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-bottom: 0.35rem;
    }

    .inspector-title {
      font-family: var(--font-serif);
      font-size: 1.35rem;
      font-weight: 700;
      color: var(--text);
    }

    .inspector-subtitle {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-top: 0.15rem;
    }

    .inspector-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-copy {
      background: var(--mim-tint);
      color: var(--mim-green);
      border: 1px solid var(--mim-border-tint);
      padding: 0.45rem 0.9rem;
      border-radius: var(--radius);
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-copy:hover {
      background: var(--mim-green);
      color: white;
    }

    .btn-close {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text-dim);
      padding: 0.45rem 0.75rem;
      border-radius: var(--radius);
      cursor: pointer;
      font-size: 0.8rem;
    }

    .btn-close:hover {
      background: var(--surface-subtle);
      color: var(--text);
    }

    .inspector-body {
      margin-top: 1.25rem;
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 1.5rem;
    }

    @media (max-width: 900px) {
      .inspector-body {
        grid-template-columns: 1fr;
      }
    }

    .facts-box {
      background: var(--surface-subtle);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .facts-box h4 {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
    }

    .facts-desc {
      font-size: 0.85rem;
      color: var(--text);
      line-height: 1.45;
    }

    .facts-legal {
      font-family: var(--font-mono);
      font-size: 0.78rem;
      background: var(--surface);
      border: 1px solid var(--border);
      padding: 0.5rem 0.65rem;
      border-radius: var(--radius-sm);
      color: var(--mim-green);
    }

    .facts-catalog {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }

    .catalog-pill {
      font-family: var(--font-mono);
      font-size: 0.72rem;
      background: var(--surface);
      border: 1px solid var(--border);
      padding: 0.2rem 0.45rem;
      border-radius: var(--radius-sm);
      color: var(--text-muted);
    }

    /* Connected relations grouped */
    .connections-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }

    @media (max-width: 600px) {
      .connections-grid {
        grid-template-columns: 1fr;
      }
    }

    .relation-group {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 0.85rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .relation-group h5 {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.35rem;
      display: flex;
      justify-content: space-between;
    }

    .relation-list {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      max-height: 220px;
      overflow-y: auto;
    }

    .relation-item {
      padding: 0.4rem 0.6rem;
      background: var(--surface-subtle);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      font-size: 0.78rem;
      cursor: pointer;
      transition: all 0.1s ease;
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .relation-item:hover {
      background: var(--mim-tint);
      border-color: var(--mim-action);
    }

    .relation-item-title {
      font-weight: 600;
      color: var(--text);
    }

    .relation-item-role {
      font-size: 0.7rem;
      color: var(--mim-action);
      font-weight: 500;
    }

    /* Footer */
    footer {
      margin-top: auto;
      background: var(--surface);
      border-top: 1px solid var(--border);
      padding: 1.25rem 1.5rem;
      font-size: 0.78rem;
      color: var(--text-dim);
    }

    .footer-inner {
      max-width: 1700px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: center;
    }
  </style>
</head>
<body>

  <!-- Top Header -->
  <header>
    <div class="header-inner">
      <div class="brand-section">
        <div class="emblem">FS</div>
        <div class="brand-text">
          <h1>Miljøministeriet · Fiskeristyrelsen</h1>
          <p>Fiskeriets Matrix: 360° Krydsfelts-Explorer</p>
        </div>
      </div>

      <div class="header-controls">
        <input
          type="text"
          id="search-input"
          class="search-input"
          placeholder="Søg i matrixen (aktør, art., system)..."
          aria-label="Søg i matrixen"
        >

        <div class="timeline-toggle" role="group" aria-label="Tidslinje for retsregler">
          <button
            type="button"
            id="btn-2026"
            class="toggle-btn active-2026"
            onclick="setYear(2026)"
          >
            <span>2026: Gældende Ret</span>
          </button>
          <button
            type="button"
            id="btn-2028"
            class="toggle-btn"
            onclick="setYear(2028)"
          >
            <span>2028: Målarkitektur</span>
            <span class="btn-badge">Indfasning</span>
          </button>
        </div>

        <button
          type="button"
          id="btn-reset-selection"
          class="btn-reset"
          onclick="selectNode(null)"
          style="display: none;"
        >
          Nulstil Valg
        </button>
      </div>
    </div>
  </header>

  <!-- Status / Regulatory Context Banner -->
  <div class="status-banner">
    <div class="status-banner-inner">
      <div id="status-text">
        <strong>Status 2026:</strong> Overgangsregler efter 404/2011 gælder for fartøjer &lt; 12 m. Frivillig Kattegat CCTV-ordning. Førstegangsmodtagere og transportører underlagt 10. januar 2026-krav.
      </div>
      <div id="status-meta">
        <span class="status-pill" id="stats-pill">38 noder • 74 aktive relationer</span>
      </div>
    </div>
  </div>

  <!-- Main Grid Canvas -->
  <main>
    <div class="matrix-grid" id="matrix-grid">
      <!-- Generated via JavaScript -->
    </div>

    <!-- Fakta-Panel / Sagsbehandler-Inspektor -->
    <div class="inspector-panel" id="inspector-panel">
      <div class="inspector-header">
        <div class="inspector-titles">
          <div class="inspector-meta">
            <span class="card-category" id="inspector-category">Kategori</span>
            <span class="facts-legal" id="inspector-legal" style="display:none;">⚖️ Lovhjemmel</span>
            <span class="badge-2028" id="inspector-2028-badge" style="display:none;">2028 Krav</span>
          </div>
          <h3 class="inspector-title" id="inspector-title">Nodetitel</h3>
          <p class="inspector-subtitle" id="inspector-subtitle">Undertitel</p>
        </div>

        <div class="inspector-actions">
          <button type="button" class="btn-copy" id="btn-copy-facts" onclick="copyFacts()">
            Kopier Reference
          </button>
          <button type="button" class="btn-close" onclick="selectNode(null)" title="Luk panel (Esc)">
            ✕ Luk
          </button>
        </div>
      </div>

      <div class="inspector-body">
        <div class="facts-box">
          <h4>Beskrivelse & Forvaltningsbetydning</h4>
          <p class="facts-desc" id="inspector-description"></p>

          <div id="inspector-catalog-wrapper" style="display: none;">
            <h4>Feltkatalog / Bilag</h4>
            <div class="facts-catalog" id="inspector-catalog-list"></div>
          </div>
        </div>

        <div>
          <div class="connections-grid" id="inspector-connections">
            <!-- Grouped relations inserted dynamically -->
          </div>
        </div>
      </div>
    </div>
  </main>

  <!-- Footer -->
  <footer>
    <div class="footer-inner">
      <div>
        <strong>Fiskeristyrelsen</strong> · Styrelsen for Fødevarer, Landbrug og Fiskeri · Kontrol & Tilsyn
      </div>
      <div>
        Hjemmel: (EU) 1224/2009, (EU) 2023/2842, (EU) 2025/2196, Fiskeriloven LBK 205/2023
      </div>
    </div>
  </footer>

  <!-- Embedded Data and Traversal Logic -->
  <script>
    const MATRIX_COLUMNS = ${JSON.stringify(MATRIX_COLUMNS, null, 2)};
    const MATRIX_NODES = ${JSON.stringify(MATRIX_NODES, null, 2)};
    const MATRIX_EDGES = ${JSON.stringify(MATRIX_EDGES, null, 2)};

    let currentYear = 2026;
    let selectedNodeId = null;
    let searchQuery = "";

    // Parse URL hash on load
    function readHash() {
      const hash = window.location.hash.replace(/^#/, "");
      if (!hash) return;
      const params = new URLSearchParams(hash);
      const node = params.get("node");
      const year = params.get("year");
      if (year === "2026" || year === "2028") {
        currentYear = parseInt(year, 10);
      }
      if (node && MATRIX_NODES.some(n => n.id === node)) {
        selectedNodeId = node;
      }
    }

    function updateHash() {
      const params = new URLSearchParams();
      params.set("year", currentYear.toString());
      if (selectedNodeId) {
        params.set("node", selectedNodeId);
      }
      window.history.replaceState(null, "", "#" + params.toString());
    }

    // Bidirectional Graph Traversal (BFS)
    function getConnectedNodes(startId, year) {
      const visited = new Set();
      const queue = [startId];
      visited.add(startId);

      const activeEdges = MATRIX_EDGES.filter(e => e.yearValidFrom <= year);

      while (queue.length > 0) {
        const currentId = queue.shift();
        for (const edge of activeEdges) {
          let neighborId = null;
          if (edge.sourceId === currentId) {
            neighborId = edge.targetId;
          } else if (edge.targetId === currentId) {
            neighborId = edge.sourceId;
          }

          if (neighborId && !visited.has(neighborId)) {
            visited.add(neighborId);
            queue.push(neighborId);
          }
        }
      }

      return visited;
    }

    function setYear(year) {
      currentYear = year;
      const btn2026 = document.getElementById("btn-2026");
      const btn2028 = document.getElementById("btn-2028");
      const statusText = document.getElementById("status-text");

      if (year === 2026) {
        btn2026.className = "toggle-btn active-2026";
        btn2028.className = "toggle-btn";
        statusText.innerHTML = "<strong>Status 2026:</strong> Overgangsregler efter 404/2011 gælder for fartøjer &lt; 12 m. Frivillig Kattegat CCTV-ordning. Førstegangsmodtagere og transportører underlagt 10. januar 2026-krav.";
      } else {
        btn2026.className = "toggle-btn";
        btn2028.className = "toggle-btn active-2028";
        statusText.innerHTML = "✨ <strong>Status 2028 (Målarkitektur):</strong> Fuld digitalisering trådt i kraft: Obligatorisk eLog & mobil-VMS for alle fartøjer &lt; 12m jf. art. 15a, lovpligtig CCTV for risikofartøjer &gt; 18m, og automatisk Art. 109 krydskontrol.";
      }

      updateHash();
      renderMatrix();
      if (selectedNodeId) {
        renderInspector();
      }
    }

    function selectNode(id) {
      selectedNodeId = id;
      updateHash();
      renderMatrix();
      renderInspector();

      const btnReset = document.getElementById("btn-reset-selection");
      if (btnReset) {
        btnReset.style.display = selectedNodeId ? "block" : "none";
      }

      if (selectedNodeId) {
        const panel = document.getElementById("inspector-panel");
        if (panel) {
          panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }
    }

    function renderMatrix() {
      const grid = document.getElementById("matrix-grid");
      grid.innerHTML = "";

      const activeEdges = MATRIX_EDGES.filter(e => e.yearValidFrom <= currentYear);
      const connectedSet = selectedNodeId ? getConnectedNodes(selectedNodeId, currentYear) : new Set();

      document.getElementById("stats-pill").textContent = \`\${MATRIX_NODES.length} noder • \${activeEdges.length} aktive relationer\`;

      for (const col of MATRIX_COLUMNS) {
        const colPanel = document.createElement("div");
        colPanel.className = "column-panel";

        let nodes = MATRIX_NODES.filter(n => n.column === col.id);
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          nodes = nodes.filter(n =>
            n.titleDa.toLowerCase().includes(q) ||
            (n.subtitleDa && n.subtitleDa.toLowerCase().includes(q)) ||
            (n.legalReference && n.legalReference.toLowerCase().includes(q)) ||
            n.category.toLowerCase().includes(q) ||
            n.descriptionDa.toLowerCase().includes(q)
          );
        }

        colPanel.innerHTML = \`
          <div class="column-header">
            <div>
              <div class="column-title">\${col.titleDa}</div>
              <div class="column-desc">\${col.descriptionDa}</div>
            </div>
            <span class="column-count">\${nodes.length}</span>
          </div>
          <div class="column-cards" id="cards-\${col.id}"></div>
        \`;

        const cardsContainer = colPanel.querySelector(\`#cards-\${col.id}\`);

        for (const node of nodes) {
          const isSelected = selectedNodeId === node.id;
          const isConnected = selectedNodeId ? connectedSet.has(node.id) : false;
          const isDimmed = selectedNodeId ? !isConnected : false;
          const is2028 = node.introducedYear === 2028;

          const card = document.createElement("button");
          card.type = "button";
          card.className = "card" +
            (isSelected ? " is-selected" : "") +
            (isConnected && !isSelected ? " is-connected" : "") +
            (isDimmed ? " is-dimmed" : "");

          card.onclick = () => selectNode(isSelected ? null : node.id);

          card.innerHTML = \`
            <div class="card-top">
              <span class="card-category">\${node.category}</span>
              \${is2028 ? \`<span class="badge-2028">2028 Krav</span>\` : ''}
            </div>
            <div class="card-title">\${node.titleDa}</div>
            \${node.subtitleDa ? \`<div class="card-subtitle">\${node.subtitleDa}</div>\` : ''}
            \${isConnected && !isSelected ? \`
              <div class="card-indicator">
                <span>✓ Tilknyttet</span>
              </div>
            \` : ''}
          \`;

          cardsContainer.appendChild(card);
        }

        grid.appendChild(colPanel);
      }
    }

    function renderInspector() {
      const panel = document.getElementById("inspector-panel");
      if (!selectedNodeId) {
        panel.className = "inspector-panel";
        return;
      }

      const node = MATRIX_NODES.find(n => n.id === selectedNodeId);
      if (!node) {
        panel.className = "inspector-panel";
        return;
      }

      panel.className = "inspector-panel is-active";

      document.getElementById("inspector-title").textContent = node.titleDa;
      document.getElementById("inspector-subtitle").textContent = node.subtitleDa || "";
      document.getElementById("inspector-category").textContent = node.category;
      document.getElementById("inspector-description").textContent = node.descriptionDa;

      const legalEl = document.getElementById("inspector-legal");
      if (node.legalReference) {
        legalEl.textContent = "⚖️ " + node.legalReference;
        legalEl.style.display = "inline-block";
      } else {
        legalEl.style.display = "none";
      }

      const badge2028 = document.getElementById("inspector-2028-badge");
      badge2028.style.display = node.introducedYear === 2028 ? "inline-block" : "none";

      const catWrapper = document.getElementById("inspector-catalog-wrapper");
      const catList = document.getElementById("inspector-catalog-list");
      if (node.feltkatalogRefs && node.feltkatalogRefs.length > 0) {
        catWrapper.style.display = "block";
        catList.innerHTML = node.feltkatalogRefs
          .map(r => \`<span class="catalog-pill">\${r}</span>\`)
          .join("");
      } else {
        catWrapper.style.display = "none";
      }

      // Group connected nodes
      const connectedSet = getConnectedNodes(node.id, currentYear);
      const activeEdges = MATRIX_EDGES.filter(e => e.yearValidFrom <= currentYear);

      const byCol = { actors: [], events: [], systems: [], regulations: [] };
      for (const id of connectedSet) {
        if (id === node.id) continue;
        const targetNode = MATRIX_NODES.find(n => n.id === id);
        if (!targetNode) continue;

        const directEdge = activeEdges.find(e =>
          (e.sourceId === node.id && e.targetId === id) ||
          (e.targetId === node.id && e.sourceId === id)
        );

        byCol[targetNode.column].push({ node: targetNode, roleDa: directEdge ? directEdge.roleDa : undefined });
      }

      const connGrid = document.getElementById("inspector-connections");
      connGrid.innerHTML = "";

      const colLabels = {
        actors: "Relaterede Aktører",
        events: "Relaterede Hændelser",
        systems: "Relaterede Fagsystemer",
        regulations: "Retsgrundlag & Hjemmel",
      };

      for (const colKey of ['actors', 'events', 'systems', 'regulations']) {
        const items = byCol[colKey];
        if (items.length === 0) continue;

        const groupEl = document.createElement("div");
        groupEl.className = "relation-group";
        groupEl.innerHTML = \`
          <h5>
            <span>\${colLabels[colKey]}</span>
            <span>(\${items.length})</span>
          </h5>
          <div class="relation-list"></div>
        \`;

        const listEl = groupEl.querySelector(".relation-list");
        for (const item of items) {
          const itemEl = document.createElement("div");
          itemEl.className = "relation-item";
          itemEl.onclick = () => selectNode(item.node.id);
          itemEl.innerHTML = \`
            <div class="relation-item-title">\${item.node.titleDa}</div>
            \${item.roleDa ? \`<div class="relation-item-role">→ \${item.roleDa}</div>\` : ''}
          \`;
          listEl.appendChild(itemEl);
        }

        connGrid.appendChild(groupEl);
      }
    }

    function copyFacts() {
      if (!selectedNodeId) return;
      const node = MATRIX_NODES.find(n => n.id === selectedNodeId);
      if (!node) return;

      const lines = [
        \`Fiskeriets Matrix: \${node.titleDa} (\${node.category})\`,
        node.subtitleDa ? \`Underkategori: \${node.subtitleDa}\` : null,
        node.legalReference ? \`Hjemmel: \${node.legalReference}\` : null,
        \`Beskrivelse: \${node.descriptionDa}\`,
        node.feltkatalogRefs ? \`Feltkatalog: \${node.feltkatalogRefs.join(", ")}\` : null,
        \`Tidslinje: \${currentYear}\`,
      ].filter(Boolean).join("\\n");

      navigator.clipboard.writeText(lines);
      const btn = document.getElementById("btn-copy-facts");
      const oldText = btn.textContent;
      btn.textContent = "✓ Kopieret til Udklipsholder!";
      setTimeout(() => {
        btn.textContent = oldText;
      }, 2200);
    }

    // Keyboard navigation (Esc to close)
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        selectNode(null);
      }
    });

    // Search filter event listener
    document.getElementById("search-input").addEventListener("input", (e) => {
      searchQuery = e.target.value;
      renderMatrix();
    });

    // Popstate support
    window.addEventListener("hashchange", () => {
      readHash();
      renderMatrix();
      renderInspector();
    });

    // Initial setup
    readHash();
    setYear(currentYear);
  </script>
</body>
</html>
`;

const outputPath = path.resolve(__dirname, '../public/fiskeri-matrix-explorer.html');
fs.writeFileSync(outputPath, htmlContent, 'utf-8');
console.log('Successfully generated public/fiskeri-matrix-explorer.html (' + htmlContent.length + ' bytes)');
