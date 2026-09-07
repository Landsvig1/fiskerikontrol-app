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
<html lang="da-DK" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Miljøministeriet · Fiskeristyrelsen — Fiskeriets Matrix: 360° Krydsfelts-Explorer</title>
  <style>
    :root {
      --bg: #070d0a;
      --bg-surface: #0b1410;
      --bg-card: #0e1a14;
      --bg-card-hover: #12221b;
      --bg-panel: #08130e;

      --border: #143828;
      --border-subtle: #0f2b1f;
      --border-active: #10b981;

      --text: #ecfdf5;
      --text-muted: #6ee7b7;
      --text-dim: #059669;
      --text-secondary: #a7f3d0;

      --emerald-glow: #10b981;
      --purple-glow: #a855f7;
      --teal-glow: #38bdf8;

      --radius-sm: 6px;
      --radius: 10px;
      --radius-lg: 16px;

      --font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      --font-mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    }

    [data-theme="light"] {
      --bg: #f8faf8;
      --bg-surface: #ffffff;
      --bg-card: #ffffff;
      --bg-card-hover: #f0fdf4;
      --bg-panel: #ffffff;

      --border: #e1e7e2;
      --border-subtle: #d1dcd4;
      --border-active: #0e472f;

      --text: #0f172a;
      --text-muted: #334155;
      --text-dim: #64748b;
      --text-secondary: #0e472f;
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
      overflow-x: hidden;
    }

    /* Top Executive Header */
    header {
      position: sticky;
      top: 0;
      z-index: 40;
      background: rgba(10, 20, 16, 0.9);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
      padding: 0.85rem 1.75rem;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    }

    [data-theme="light"] header {
      background: rgba(255, 255, 255, 0.9);
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }

    .header-inner {
      max-width: 1780px;
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
      gap: 0.9rem;
    }

    .emblem {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #059669, #0f766e);
      border-radius: var(--radius);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 800;
      font-size: 1.05rem;
      box-shadow: 0 0 14px rgba(16, 185, 129, 0.3);
      flex-shrink: 0;
    }

    .brand-titles h1 {
      font-size: 1.05rem;
      font-weight: 800;
      letter-spacing: -0.01em;
    }

    .brand-titles h1 span {
      font-weight: 500;
      color: var(--emerald-glow);
      font-size: 0.85rem;
    }

    .brand-sub {
      font-size: 0.72rem;
      color: var(--text-dim);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .brand-pill {
      background: rgba(16, 185, 129, 0.15);
      color: #6ee7b7;
      padding: 1px 7px;
      border-radius: 999px;
      font-weight: 600;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .header-controls {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      flex-wrap: wrap;
    }

    .search-box {
      position: relative;
    }

    .search-input {
      background: rgba(15, 29, 24, 0.8);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 0.45rem 0.85rem 0.45rem 2rem;
      font-size: 0.8rem;
      color: var(--text);
      width: 240px;
      outline: none;
      transition: all 0.2s;
    }

    [data-theme="light"] .search-input {
      background: #f1f5f9;
    }

    .search-input:focus {
      border-color: var(--emerald-glow);
      box-shadow: 0 0 10px rgba(16, 185, 129, 0.3);
    }

    .search-icon {
      position: absolute;
      left: 0.65rem;
      top: 50%;
      transform: translateY(-50%);
      font-size: 0.75rem;
      color: var(--text-dim);
    }

    /* Timeline Switcher */
    .timeline-toggle {
      display: inline-flex;
      background: rgba(11, 22, 18, 0.9);
      border: 1px solid var(--border);
      padding: 3px;
      border-radius: var(--radius);
    }

    [data-theme="light"] .timeline-toggle {
      background: #f1f5f9;
    }

    .toggle-btn {
      background: transparent;
      border: none;
      padding: 0.38rem 0.85rem;
      font-size: 0.78rem;
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
      background: #059669;
      color: white;
      box-shadow: 0 0 10px rgba(16, 185, 129, 0.4);
    }

    .toggle-btn.active-2028 {
      background: linear-gradient(135deg, #7e22ce, #4338ca);
      color: white;
      box-shadow: 0 0 12px rgba(168, 85, 247, 0.4);
    }

    .btn-badge {
      font-size: 0.65rem;
      padding: 1px 5px;
      border-radius: 4px;
      background: rgba(255,255,255,0.25);
      text-transform: uppercase;
      font-family: var(--font-mono);
    }

    .ctrl-btn {
      background: rgba(15, 29, 24, 0.8);
      border: 1px solid var(--border);
      color: var(--text-muted);
      padding: 0.45rem 0.75rem;
      border-radius: var(--radius);
      cursor: pointer;
      font-size: 0.8rem;
      transition: all 0.15s;
    }

    [data-theme="light"] .ctrl-btn {
      background: #ffffff;
    }

    .ctrl-btn:hover {
      border-color: var(--emerald-glow);
      color: var(--text);
    }

    /* Scenario Quick Selector Bar */
    .scenario-bar {
      background: rgba(10, 18, 15, 0.95);
      border-bottom: 1px solid var(--border);
      padding: 0.5rem 1.75rem;
      font-size: 0.78rem;
    }

    [data-theme="light"] .scenario-bar {
      background: #f0fdf4;
    }

    .scenario-inner {
      max-width: 1780px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .scenario-label {
      font-weight: 700;
      color: var(--emerald-glow);
      text-transform: uppercase;
      font-size: 0.7rem;
      letter-spacing: 0.05em;
      display: flex;
      align-items: center;
      gap: 0.35rem;
      shrink-0;
    }

    .scenario-chips {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      overflow-x: auto;
      flex-wrap: wrap;
    }

    .scenario-chip {
      background: #0e1a15;
      border: 1px solid var(--border);
      color: var(--text-muted);
      padding: 0.3rem 0.7rem;
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    [data-theme="light"] .scenario-chip {
      background: #ffffff;
      color: #334155;
    }

    .scenario-chip:hover {
      border-color: var(--emerald-glow);
      color: white;
    }

    .scenario-chip.is-active {
      background: #10b981;
      color: #022c22;
      border-color: #34d399;
      font-weight: 700;
      box-shadow: 0 0 14px rgba(16, 185, 129, 0.4);
    }

    .chip-badge {
      font-size: 0.65rem;
      font-family: var(--font-mono);
      padding: 1px 4px;
      border-radius: 3px;
      background: rgba(0,0,0,0.25);
    }

    /* Narrative Ribbon */
    .narrative-ribbon {
      background: #060b09;
      border-bottom: 1px solid var(--border-subtle);
      padding: 0.65rem 1.75rem;
      font-size: 0.78rem;
    }

    [data-theme="light"] .narrative-ribbon {
      background: #ffffff;
    }

    .narrative-inner {
      max-width: 1780px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .narrative-text {
      color: var(--text-muted);
      line-height: 1.4;
    }

    .narrative-text strong {
      color: var(--text);
    }

    /* Main Grid Canvas with SVG Synapses */
    main {
      max-width: 1780px;
      width: 100%;
      margin: 0 auto;
      padding: 1.5rem 1.75rem;
      position: relative;
      flex: 1;
    }

    .canvas-container {
      position: relative;
      min-height: 600px;
    }

    /* SVG Synapse Overlay */
    svg.synapse-overlay {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10;
      overflow: visible;
    }

    @keyframes flowDash {
      to {
        stroke-dashoffset: -28;
      }
    }

    .synapse-pulse {
      stroke-dasharray: 8 6;
      animation: flowDash 1.2s linear infinite;
    }

    /* 4 Columns Layout */
    .matrix-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.25rem;
      position: relative;
      z-index: 20;
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
      background: rgba(11, 20, 16, 0.7);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 1rem;
      display: flex;
      flex-direction: column;
      backdrop-filter: blur(8px);
    }

    [data-theme="light"] .column-panel {
      background: rgba(240, 244, 241, 0.6);
    }

    .column-header {
      padding-bottom: 0.75rem;
      margin-bottom: 0.75rem;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .column-title {
      font-size: 0.88rem;
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
      background: rgba(15, 33, 25, 0.9);
      border: 1px solid var(--border);
      color: var(--emerald-glow);
      padding: 0.15rem 0.55rem;
      border-radius: 999px;
      font-weight: 700;
    }

    [data-theme="light"] .column-count {
      background: #ffffff;
      color: #0e472f;
    }

    .column-cards {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      flex: 1;
    }

    /* Cards */
    .card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 0.85rem;
      text-align: left;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    [data-theme="light"] .card {
      background: #ffffff;
      box-shadow: 0 1px 2px rgba(0,0,0,0.03);
    }

    .card:hover {
      background: var(--bg-card-hover);
      border-color: rgba(16, 185, 129, 0.5);
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    }

    .card.is-selected {
      background: #064e3b;
      border: 2px solid #34d399;
      box-shadow: 0 0 24px rgba(16, 185, 129, 0.45);
      transform: translateY(-2px);
    }

    [data-theme="light"] .card.is-selected {
      background: #ecfdf5;
      border-color: #059669;
      box-shadow: 0 4px 16px rgba(5, 150, 105, 0.25);
    }

    .card.is-connected {
      background: #0a251b;
      border: 1.5px solid #10b981;
      box-shadow: 0 0 14px rgba(16, 185, 129, 0.25);
    }

    [data-theme="light"] .card.is-connected {
      background: #ffffff;
      border-color: #10b981;
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.15);
    }

    .card.is-dimmed {
      opacity: 0.2;
      filter: grayscale(80%);
    }

    .card.is-dimmed:hover {
      opacity: 0.75;
      filter: grayscale(0%);
    }

    .card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.4rem;
    }

    .card-category {
      font-size: 0.65rem;
      font-weight: 700;
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
      background: rgba(16, 185, 129, 0.15);
      color: #6ee7b7;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    [data-theme="light"] .card-category {
      background: #f1f5f9;
      color: #334155;
      border-color: #e2e8f0;
    }

    .card.is-selected .card-category {
      background: #34d399;
      color: #022c22;
      border-color: #34d399;
    }

    .badge-2028 {
      font-size: 0.62rem;
      font-family: var(--font-mono);
      font-weight: 700;
      padding: 0.12rem 0.45rem;
      border-radius: 999px;
      background: rgba(168, 85, 247, 0.2);
      color: #d8b4fe;
      border: 1px solid rgba(168, 85, 247, 0.5);
      text-transform: uppercase;
    }

    .card-title {
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--text);
      line-height: 1.3;
    }

    .card.is-selected .card-title {
      color: white;
      font-weight: 800;
    }

    .card-subtitle {
      font-size: 0.72rem;
      color: var(--text-dim);
    }

    .card-legal {
      margin-top: 0.25rem;
      padding-top: 0.25rem;
      border-top: 1px solid var(--border-subtle);
      font-size: 0.68rem;
      font-family: var(--font-mono);
      color: var(--text-dim);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    /* Executive Dossier */
    .dossier-panel {
      margin-top: 2rem;
      background: var(--bg-panel);
      border: 2px solid var(--emerald-glow);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      box-shadow: 0 10px 40px rgba(0,0,0,0.6);
      display: none;
      animation: fadeIn 0.2s ease-out;
    }

    [data-theme="light"] .dossier-panel {
      background: #ffffff;
      box-shadow: 0 8px 30px rgba(0,0,0,0.1);
    }

    .dossier-panel.is-active {
      display: block;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .dossier-header {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      padding-bottom: 1.25rem;
      border-bottom: 1px solid var(--border);
    }

    .dossier-title {
      font-size: 1.45rem;
      font-weight: 800;
      color: var(--text);
    }

    .dossier-subtitle {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-top: 0.2rem;
    }

    .dossier-actions {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    .btn-action-primary {
      background: #10b981;
      color: #022c22;
      border: none;
      padding: 0.5rem 1.1rem;
      border-radius: var(--radius);
      font-size: 0.82rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
      box-shadow: 0 0 12px rgba(16, 185, 129, 0.4);
    }

    .btn-action-primary:hover {
      background: #34d399;
    }

    .dossier-body {
      margin-top: 1.25rem;
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 1.5rem;
    }

    @media (max-width: 900px) {
      .dossier-body {
        grid-template-columns: 1fr;
      }
    }

    .dossier-info-box {
      background: rgba(9, 22, 16, 0.8);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1.1rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    [data-theme="light"] .dossier-info-box {
      background: #f8fafc;
    }

    .dossier-info-box h4 {
      font-size: 0.75rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--emerald-glow);
    }

    .dossier-desc {
      font-size: 0.82rem;
      color: var(--text);
      line-height: 1.5;
    }

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
      background: rgba(9, 21, 16, 0.8);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 0.9rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    [data-theme="light"] .relation-group {
      background: #ffffff;
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
      max-height: 200px;
      overflow-y: auto;
    }

    .relation-item {
      padding: 0.45rem 0.65rem;
      background: #0e1a14;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      font-size: 0.78rem;
      cursor: pointer;
      transition: all 0.1s ease;
    }

    [data-theme="light"] .relation-item {
      background: #f1f5f9;
    }

    .relation-item:hover {
      background: #064e3b;
      border-color: #34d399;
      color: white;
    }

    .relation-item-title {
      font-weight: 600;
    }

    .relation-item-role {
      font-size: 0.68rem;
      color: var(--emerald-glow);
      font-family: var(--font-mono);
      margin-top: 0.1rem;
    }

    /* Footer */
    footer {
      margin-top: auto;
      background: #060b09;
      border-top: 1px solid var(--border);
      padding: 1.25rem 1.75rem;
      font-size: 0.75rem;
      color: var(--text-dim);
    }

    [data-theme="light"] footer {
      background: #ffffff;
    }

    .footer-inner {
      max-width: 1780px;
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

  <!-- Top Executive Header -->
  <header>
    <div class="header-inner">
      <div class="brand-section">
        <div class="emblem">FS</div>
        <div class="brand-titles">
          <div class="brand-sub">
            <span class="brand-pill">Miljøministeriet · Fiskeristyrelsen</span>
            <span id="header-stats">38 noder • 84 relationer</span>
          </div>
          <h1>Fiskeriets Matrix <span>(360° Krydsfelts-Explorer & Tilsynskæde)</span></h1>
        </div>
      </div>

      <div class="header-controls">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            id="search-input"
            class="search-input"
            placeholder="Hurtigsøgning (aktør, art., felt)..."
            aria-label="Hurtigsøgning i matrixen"
          >
        </div>

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
            <span class="btn-badge">EU-reform</span>
          </button>
        </div>

        <button type="button" class="ctrl-btn" onclick="toggleTheme()" title="Skift tema (mørk/lys)">
          <span id="theme-icon">☀️</span>
        </button>

        <button type="button" class="ctrl-btn" onclick="copyShareLink()" title="Kopiér link til visning">
          🔗 Del Link
        </button>

        <button
          type="button"
          id="btn-reset"
          class="ctrl-btn"
          onclick="selectNode(null)"
          style="display: none;"
        >
          ✕ Nulstil Valg
        </button>
      </div>
    </div>
  </header>

  <!-- Scenario Selector Bar -->
  <div class="scenario-bar">
    <div class="scenario-inner">
      <div class="scenario-label">
        <span>🧭</span> Forvaltnings-Scenarier:
      </div>
      <div class="scenario-chips" id="scenario-chips-container">
        <!-- Generated dynamically from MATRIX_SCENARIOS -->
      </div>
    </div>
  </div>

  <!-- Narrative Ribbon -->
  <div class="narrative-ribbon">
    <div class="narrative-inner">
      <div class="narrative-text" id="narrative-text">
        <strong>Vejledning:</strong> Klik på et scenarie foroven eller et kort herunder for at belyse hele tilsynskæden med levende synapser.
      </div>
      <div id="narrative-meta" style="font-family: var(--font-mono); font-size: 0.72rem; color: var(--emerald-glow);">
        ● Aktiv Status: 2026 Overgangsregler
      </div>
    </div>
  </div>

  <!-- Main Canvas with Dynamic SVG Synapses -->
  <main>
    <div class="canvas-container" id="canvas-container">
      <!-- Synapse SVG Overlay -->
      <svg class="synapse-overlay" id="synapse-svg">
        <defs>
          <linearGradient id="synapseGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.9" />
          </linearGradient>
          <filter id="synapseGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <g id="synapse-paths-group"></g>
      </svg>

      <!-- Matrix Columns Grid -->
      <div class="matrix-grid" id="matrix-grid">
        <!-- Columns rendered via JavaScript -->
      </div>
    </div>

    <!-- Executive Dossier Drawer -->
    <div class="dossier-panel" id="dossier-panel">
      <div class="dossier-header">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem;">
            <span class="card-category" id="dossier-category">Kategori</span>
            <span id="dossier-legal" style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--emerald-glow); display: none;"></span>
            <span class="badge-2028" id="dossier-2028-badge" style="display: none;">2028 Målarkitektur</span>
          </div>
          <h2 class="dossier-title" id="dossier-title">Titel</h2>
          <p class="dossier-subtitle" id="dossier-subtitle">Undertitel</p>
        </div>

        <div class="dossier-actions">
          <button type="button" class="btn-action-primary" id="btn-copy-dossier" onclick="copyDossier()">
            Kopier Sagsnotat
          </button>
          <button type="button" class="ctrl-btn" onclick="selectNode(null)">
            ✕ Luk
          </button>
        </div>
      </div>

      <div class="dossier-body">
        <div class="dossier-info-box">
          <h4>Forvaltningsbetydning</h4>
          <p class="dossier-desc" id="dossier-desc"></p>

          <div id="dossier-catalog-wrap" style="display: none;">
            <h4 style="margin-top: 0.5rem;">Feltkatalog / Bilagsfelter</h4>
            <div id="dossier-catalog-list" style="display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.35rem;"></div>
          </div>
        </div>

        <div>
          <div class="connections-grid" id="dossier-connections">
            <!-- Connected items inserted dynamically -->
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
        Retsgrundlag: (EU) 1224/2009, (EU) 2023/2842, (EU) 2025/2196, BEK 1144/2025, BEK 1197/2025, Fiskeriloven
      </div>
    </div>
  </footer>

  <script>
    const MATRIX_COLUMNS = ${JSON.stringify(MATRIX_COLUMNS, null, 2)};
    const MATRIX_NODES = ${JSON.stringify(MATRIX_NODES, null, 2)};
    const MATRIX_EDGES = ${JSON.stringify(MATRIX_EDGES, null, 2)};
    const MATRIX_SCENARIOS = ${JSON.stringify(MATRIX_SCENARIOS, null, 2)};

    let currentYear = 2026;
    let selectedNodeId = null;
    let hoveredNodeId = null;
    let searchQuery = "";
    let isDarkTheme = true;

    function toggleTheme() {
      isDarkTheme = !isDarkTheme;
      document.documentElement.setAttribute("data-theme", isDarkTheme ? "dark" : "light");
      document.getElementById("theme-icon").textContent = isDarkTheme ? "☀️" : "🌙";
      drawSynapses();
    }

    function readHash() {
      const hash = window.location.hash.replace(/^#/, "");
      if (!hash) return;
      const p = new URLSearchParams(hash);
      const node = p.get("node");
      const yr = p.get("yr");
      if (yr === "2026" || yr === "2028") {
        currentYear = parseInt(yr, 10);
      }
      if (node && MATRIX_NODES.some(n => n.id === node)) {
        selectedNodeId = node;
      }
    }

    function updateHash() {
      const p = new URLSearchParams();
      p.set("yr", currentYear.toString());
      if (selectedNodeId) p.set("node", selectedNodeId);
      window.history.replaceState(null, "", "#" + p.toString());
    }

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

      const narrativeMeta = document.getElementById("narrative-meta");
      if (year === 2026) {
        narrativeMeta.innerHTML = "● Aktiv Status: 2026 Overgangsregler";
        narrativeMeta.style.color = "var(--emerald-glow)";
      } else {
        narrativeMeta.innerHTML = "✨ Aktiv Status: 2028 Målarkitektur (EU 2023/2842)";
        narrativeMeta.style.color = "#c084fc";
      }

      updateHash();
      renderScenarios();
      renderMatrix();
      if (selectedNodeId) renderDossier();
      drawSynapses();
    }

    function selectNode(id) {
      selectedNodeId = id;
      updateHash();
      renderScenarios();
      renderMatrix();
      renderDossier();
      drawSynapses();

      document.getElementById("btn-reset").style.display = selectedNodeId ? "inline-block" : "none";

      if (selectedNodeId) {
        const panel = document.getElementById("dossier-panel");
        panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }

    function renderScenarios() {
      const container = document.getElementById("scenario-chips-container");
      container.innerHTML = "";

      for (const sc of MATRIX_SCENARIOS) {
        const isSelected = selectedNodeId === sc.focusNodeId && currentYear === sc.year;
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "scenario-chip" + (isSelected ? " is-active" : "");
        chip.onclick = () => {
          setYear(sc.year);
          selectNode(sc.focusNodeId);
        };
        chip.innerHTML = \`
          <span>\${sc.titleDa}</span>
          <span class="chip-badge">\${sc.badgeDa}</span>
        \`;
        container.appendChild(chip);
      }
    }

    function renderMatrix() {
      const grid = document.getElementById("matrix-grid");
      grid.innerHTML = "";

      const activeEdges = MATRIX_EDGES.filter(e => e.yearValidFrom <= currentYear);
      const focusId = selectedNodeId || hoveredNodeId;
      const connectedSet = focusId ? getConnectedNodes(focusId, currentYear) : new Set();

      document.getElementById("header-stats").textContent = \`\${MATRIX_NODES.length} noder • \${activeEdges.length} relationer\`;

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
          const isConnected = focusId ? connectedSet.has(node.id) : false;
          const isDimmed = focusId ? !isConnected : false;
          const is2028 = node.introducedYear === 2028;

          const card = document.createElement("div");
          card.id = "card-" + node.id;
          card.className = "card" +
            (isSelected ? " is-selected" : "") +
            (isConnected && !isSelected ? " is-connected" : "") +
            (isDimmed ? " is-dimmed" : "");

          card.onmouseenter = () => {
            hoveredNodeId = node.id;
            drawSynapses();
          };
          card.onmouseleave = () => {
            hoveredNodeId = null;
            drawSynapses();
          };
          card.onclick = () => selectNode(isSelected ? null : node.id);

          card.innerHTML = \`
            <div class="card-top">
              <span class="card-category">\${node.category}</span>
              \${is2028 ? \`<span class="badge-2028">2028 Krav</span>\` : ''}
            </div>
            <div class="card-title">\${node.titleDa}</div>
            \${node.subtitleDa ? \`<div class="card-subtitle">\${node.subtitleDa}</div>\` : ''}
            \${node.legalReference ? \`
              <div class="card-legal">
                <span>⚖️ \${node.legalReference}</span>
                \${isConnected && !isSelected ? '<span style="color:var(--emerald-glow);font-weight:700;">✓ Forbundet</span>' : ''}
              </div>
            \` : ''}
          \`;

          cardsContainer.appendChild(card);
        }

        grid.appendChild(colPanel);
      }

      // Update narrative text
      const narrativeText = document.getElementById("narrative-text");
      if (selectedNodeId) {
        const n = MATRIX_NODES.find(x => x.id === selectedNodeId);
        const sc = MATRIX_SCENARIOS.find(s => s.focusNodeId === selectedNodeId && s.year === currentYear);
        if (sc) {
          narrativeText.innerHTML = \`<strong>Forløb:</strong> \${sc.narrativeDa} — \${sc.descriptionDa}\`;
        } else if (n) {
          narrativeText.innerHTML = \`<strong>Aktiv:</strong> \${n.titleDa} [\${n.category}] — \${n.descriptionDa}\`;
        }
      } else {
        narrativeText.innerHTML = "<strong>Vejledning:</strong> Klik på et scenarie foroven eller et kort herunder for at belyse hele tilsynskæden med levende synapser.";
      }
    }

    function renderDossier() {
      const panel = document.getElementById("dossier-panel");
      if (!selectedNodeId) {
        panel.className = "dossier-panel";
        return;
      }

      const node = MATRIX_NODES.find(n => n.id === selectedNodeId);
      if (!node) {
        panel.className = "dossier-panel";
        return;
      }

      panel.className = "dossier-panel is-active";

      document.getElementById("dossier-title").textContent = node.titleDa;
      document.getElementById("dossier-subtitle").textContent = node.subtitleDa || "";
      document.getElementById("dossier-category").textContent = node.category;
      document.getElementById("dossier-desc").textContent = node.descriptionDa;

      const legalEl = document.getElementById("dossier-legal");
      if (node.legalReference) {
        legalEl.textContent = "⚖️ " + node.legalReference;
        legalEl.style.display = "inline-block";
      } else {
        legalEl.style.display = "none";
      }

      document.getElementById("dossier-2028-badge").style.display = node.introducedYear === 2028 ? "inline-block" : "none";

      const catWrap = document.getElementById("dossier-catalog-wrap");
      const catList = document.getElementById("dossier-catalog-list");
      if (node.feltkatalogRefs && node.feltkatalogRefs.length > 0) {
        catWrap.style.display = "block";
        catList.innerHTML = node.feltkatalogRefs
          .map(r => \`<span style="font-family:var(--font-mono);font-size:0.75rem;padding:2px 6px;border-radius:4px;border:1px solid var(--border);background:var(--bg-card);">\${r}</span>\`)
          .join("");
      } else {
        catWrap.style.display = "none";
      }

      // Group connected items
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

      const connGrid = document.getElementById("dossier-connections");
      connGrid.innerHTML = "";

      const colLabels = {
        actors: "1. Involverede Aktører",
        events: "2. Forvaltningshændelser",
        systems: "3. IT-Systemer & Registre",
        regulations: "4. Regelsæt & Retskilder",
      };

      for (const colKey of ['actors', 'events', 'systems', 'regulations']) {
        const items = byCol[colKey];
        if (items.length === 0) continue;

        const groupEl = document.createElement("div");
        groupEl.className = "relation-group";
        groupEl.innerHTML = \`
          <h5>
            <span>\${colLabels[colKey]}</span>
            <span style="font-family:var(--font-mono);opacity:0.8;">(\${items.length})</span>
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

    function drawSynapses() {
      const svgGroup = document.getElementById("synapse-paths-group");
      svgGroup.innerHTML = "";

      const focusId = selectedNodeId || hoveredNodeId;
      if (!focusId) return;

      const canvas = document.getElementById("canvas-container");
      const canvasRect = canvas.getBoundingClientRect();

      const connectedSet = getConnectedNodes(focusId, currentYear);
      const activeEdges = MATRIX_EDGES.filter(e =>
        e.yearValidFrom <= currentYear &&
        (e.sourceId === focusId || e.targetId === focusId ||
         (connectedSet.has(e.sourceId) && connectedSet.has(e.targetId)))
      );

      for (const edge of activeEdges) {
        const srcEl = document.getElementById("card-" + edge.sourceId);
        const tgtEl = document.getElementById("card-" + edge.targetId);
        if (!srcEl || !tgtEl) continue;

        const srcRect = srcEl.getBoundingClientRect();
        const tgtRect = tgtEl.getBoundingClientRect();

        let startX, startY, endX, endY;

        if (srcRect.left <= tgtRect.left) {
          startX = srcRect.right - canvasRect.left;
          startY = srcRect.top + srcRect.height / 2 - canvasRect.top;
          endX = tgtRect.left - canvasRect.left;
          endY = tgtRect.top + tgtRect.height / 2 - canvasRect.top;
        } else {
          startX = srcRect.left - canvasRect.left;
          startY = srcRect.top + srcRect.height / 2 - canvasRect.top;
          endX = tgtRect.right - canvasRect.left;
          endY = tgtRect.top + tgtRect.height / 2 - canvasRect.top;
        }

        const dx = Math.abs(endX - startX);
        const curvature = Math.max(30, dx * 0.45);
        const isDirect = edge.sourceId === focusId || edge.targetId === focusId;

        const pathD = \`M \${startX} \${startY} C \${startX + (endX > startX ? curvature : -curvature)} \${startY}, \${endX + (endX > startX ? -curvature : curvature)} \${endY}, \${endX} \${endY}\`;

        // Background glow
        const glowPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        glowPath.setAttribute("d", pathD);
        glowPath.setAttribute("fill", "none");
        glowPath.setAttribute("stroke", currentYear === 2028 ? "#a855f7" : "#10b981");
        glowPath.setAttribute("stroke-width", isDirect ? "6" : "3");
        glowPath.setAttribute("stroke-opacity", isDirect ? "0.35" : "0.15");
        glowPath.setAttribute("filter", "url(#synapseGlow)");
        svgGroup.appendChild(glowPath);

        // Pulsing line
        const linePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        linePath.setAttribute("d", pathD);
        linePath.setAttribute("fill", "none");
        linePath.setAttribute("stroke", "url(#synapseGrad)");
        linePath.setAttribute("stroke-width", isDirect ? "2.5" : "1.5");
        linePath.setAttribute("class", "synapse-pulse");
        svgGroup.appendChild(linePath);
      }
    }

    function copyDossier() {
      if (!selectedNodeId) return;
      const node = MATRIX_NODES.find(n => n.id === selectedNodeId);
      if (!node) return;

      const lines = [
        \`=============================================================\`,
        \`FISKERISTYRELSEN · SAGSNOTAT & KRYDSFELTS-ANALYSE\`,
        \`=============================================================\`,
        \`Fokus: \${node.titleDa} [\${node.category}]\`,
        node.subtitleDa ? \`Underkategori: \${node.subtitleDa}\` : null,
        node.legalReference ? \`Hjemmel: \${node.legalReference}\` : null,
        \`Tidslinje: \${currentYear} (\${currentYear === 2026 ? "Gældende Ret" : "2028 Målarkitektur"})\`,
        \`Forvaltningsbetydning:\\n\${node.descriptionDa}\`,
        node.feltkatalogRefs ? \`Feltkatalog / Bilag: \${node.feltkatalogRefs.join(", ")}\` : null,
        \`-------------------------------------------------------------\`,
        \`Dato: \${new Date().toLocaleDateString("da-DK")}\`,
      ].filter(Boolean).join("\\n");

      navigator.clipboard.writeText(lines);
      const btn = document.getElementById("btn-copy-dossier");
      const orig = btn.textContent;
      btn.textContent = "✓ Notat Kopieret!";
      setTimeout(() => { btn.textContent = orig; }, 2200);
    }

    function copyShareLink() {
      const url = new URL(window.location.href);
      if (selectedNodeId) url.searchParams.set("node", selectedNodeId);
      url.searchParams.set("yr", currentYear.toString());
      navigator.clipboard.writeText(url.toString());
      alert("✓ Direkte link kopieret til udklipsholderen!");
    }

    // Event Listeners
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") selectNode(null);
    });

    window.addEventListener("resize", drawSynapses);

    document.getElementById("search-input").addEventListener("input", (e) => {
      searchQuery = e.target.value;
      renderMatrix();
      drawSynapses();
    });

    window.addEventListener("hashchange", () => {
      readHash();
      renderScenarios();
      renderMatrix();
      renderDossier();
      drawSynapses();
    });

    // Start
    readHash();
    renderScenarios();
    setYear(currentYear);
    setTimeout(drawSynapses, 200);
  </script>
</body>
</html>
`;

const outputPath = path.resolve(__dirname, '../public/fiskeri-matrix-explorer.html');
fs.writeFileSync(outputPath, htmlContent, 'utf-8');
console.log('Successfully generated public/fiskeri-matrix-explorer.html (' + htmlContent.length + ' bytes)');
