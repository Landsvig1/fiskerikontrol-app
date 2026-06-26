"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Search, 
  AlertTriangle, 
  Layers, 
  BookOpen, 
  Activity, 
  GitBranch, 
  Database,
  ArrowRight,
  RefreshCw,
  Info,
  CheckCircle
} from "lucide-react";
import * as d3 from "d3";

// Type definitions
interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  number: number;
  label: string;
  title: string;
  doc: "control" | "impl";
  theme: string;
  body: string;
  is_subnode?: boolean;
  parent_id?: string;
  // d3 position properties
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  type: string;
  modality: string;
  snippet: string;
  context: string;
}

interface OverlapRecord {
  target: string;
  sources: string[];
  count: number;
  citations: Array<{
    source: string;
    modality: string;
    snippet: string;
  }>;
}

interface ConflictRecord {
  target: string;
  modalities: string[];
  description: string;
  citations: Array<{
    source: string;
    modality: string;
    snippet: string;
    context: string;
  }>;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  overlaps: OverlapRecord[];
  conflicts: ConflictRecord[];
}

type TabType = "dashboard" | "graph" | "overlaps" | "conflicts" | "browse";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [activeDocFilter, setActiveDocFilter] = useState<"all" | "control" | "impl">("all");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("all");
  
  // Fetch graph data on load
  useEffect(() => {
    fetch("/data/graph_data.json")
      .then(res => res.json())
      .then((jsonData: GraphData) => {
        setData(jsonData);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading graph data:", err);
        setLoading(false);
      });
  }, []);

  // Listen for Escape key to unfocus/close selected node details
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedNode(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#070b13] text-[#f8fafc]">
        <RefreshCw className="w-12 h-12 text-[#38bdf8] animate-spin mb-4" />
        <h2 className="text-xl font-semibold">Indlæser lovgivningsgraf database...</h2>
        <p className="text-sm text-[#94a3b8] mt-2">Kortlægger krydsreferencer og konflikter</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#070b13] text-[#f8fafc]">
        <AlertTriangle className="w-12 h-12 text-[#ef4444] mb-4" />
        <h2 className="text-xl font-semibold">Fejl under indlæsning</h2>
        <p className="text-sm text-[#94a3b8] mt-2">Kunne ikke hente systemdata. Kør parser-scriptet først.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#070b13] text-[#f8fafc] font-sans antialiased">
      {/* Top Header Navigation */}
      <header className="flex items-center justify-between px-6 py-4 bg-[#0d1527] border-b border-[#1e293b] z-25">
        <div className="flex items-center gap-3">
          <Database className="w-6 h-6 text-[#38bdf8]" />
          <div>
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-[#38bdf8] to-[#818cf8] bg-clip-text text-transparent">
              Fiskerikontrol: Citationsgraf og konfliktanalyse
            </h1>
            <p className="text-xs text-[#94a3b8]">
              Ramme (1224/2009) & Gennemførelsesbestemmelser (2025/2196)
            </p>
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <nav className="flex gap-1 bg-[#131e35] p-1 rounded-lg border border-[#1e293b]">
          {(["dashboard", "graph", "overlaps", "conflicts", "browse"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                activeTab === tab 
                  ? "bg-[#38bdf8] text-[#070b13] shadow-md shadow-[#38bdf8]/10" 
                  : "text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#1e293b]"
              }`}
            >
              {tab === "dashboard" && "Oversigt"}
              {tab === "graph" && "Interaktiv Graf"}
              {tab === "overlaps" && `Overlap (${data.overlaps.length})`}
              {tab === "conflicts" && `Konflikter (${data.conflicts.length})`}
              {tab === "browse" && "Søg & Slå Op"}
            </button>
          ))}
        </nav>
      </header>

      {/* Main Application Container */}
      <main className="flex-1 flex overflow-hidden">
        {activeTab === "dashboard" && (
          <DashboardView 
            data={data} 
            setActiveTab={setActiveTab} 
          />
        )}
        {activeTab === "graph" && (
          <InteractiveGraphView 
            data={data} 
            selectedNode={selectedNode} 
            setSelectedNode={setSelectedNode} 
            activeDocFilter={activeDocFilter}
            setActiveDocFilter={setActiveDocFilter}
            activeCategoryFilter={activeCategoryFilter}
            setActiveCategoryFilter={setActiveCategoryFilter}
          />
        )}
        {activeTab === "overlaps" && (
          <OverlapsView 
            data={data} 
            setSelectedNode={setSelectedNode} 
            setActiveTab={setActiveTab} 
          />
        )}
        {activeTab === "conflicts" && (
          <ConflictsView 
            data={data} 
            setSelectedNode={setSelectedNode} 
            setActiveTab={setActiveTab} 
          />
        )}
        {activeTab === "browse" && (
          <BrowseView 
            data={data} 
            searchQuery={searchQuery} 
            setSearchQuery={setSearchQuery} 
            setSelectedNode={setSelectedNode} 
            setActiveTab={setActiveTab} 
          />
        )}
      </main>
    </div>
  );
}

// ----------------------------------------------------
// VIEW 1: DASHBOARD VIEW
// ----------------------------------------------------
function DashboardView({ 
  data,
  setActiveTab
}: { 
  data: GraphData; 
  setActiveTab: (tab: TabType) => void;
}) {
  const controlCount = data.nodes.filter(n => n.doc === "control" && !n.is_subnode).length;
  const implCount = data.nodes.filter(n => n.doc === "impl" && !n.is_subnode).length;
  const totalCitations = data.links.length;

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-gradient-to-b from-[#070b13] to-[#0a1122]">
      {/* Citation Graph Preview */}
      <div className="bg-[#0d1527] border border-[#1e293b] p-6 rounded-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm uppercase font-bold text-[#38bdf8] tracking-wider flex items-center gap-2">
            <Database className="w-4 h-4" /> Citation Graph Oversigt
          </h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#10b981]/15 text-[#34d399] border border-[#10b981]/30">
            Klar
          </span>
        </div>
        <p className="text-sm text-[#94a3b8] leading-relaxed">
          Grafen er genereret på baggrund af Rammeforordning 1224/2009 og Gennemførelsesforordning 2025/2196. Netværket kortlægger artiklerne som noder og modallogiske henvisninger som kanter.
        </p>

        <button
          onClick={() => setActiveTab("graph")}
          className="w-full py-2.5 rounded-lg bg-[#38bdf8] text-[#070b13] font-semibold text-sm hover:bg-[#38bdf8]/90 transition-all flex items-center justify-center gap-2 shadow-md shadow-[#38bdf8]/15"
        >
          Åbn Interaktiv Graf <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Intro Hero Section */}
      <div className="max-w-4xl">
        <h2 className="text-3xl font-extrabold tracking-tight">Kortlægning af europæisk fiskeriregulering</h2>
        <p className="text-base text-[#94a3b8] mt-2 leading-relaxed">
          Dette værktøj analyserer afhængigheder, krydsreferencer og retlige modstrid i EU&apos;s fiskerikontrolordning. 
          Ved at dekonstruere lovgivningen til en struktur af noder (artikler/stykker) og kanter (citationer/modallogiske bindinger) 
          kan vi automatisk afdække overlap og uoverensstemmelser.
        </p>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[#0f172a] border border-[#1e293b] p-6 rounded-xl hover:border-[#38bdf8]/40 transition-all duration-300">
          <BookOpen className="w-8 h-8 text-[#38bdf8] mb-4" />
          <h3 className="text-xs uppercase font-semibold text-[#94a3b8] tracking-wider">Rammeartikler (1224/2009)</h3>
          <p className="text-4xl font-extrabold text-[#f8fafc] mt-2">{controlCount}</p>
        </div>

        <div className="bg-[#0f172a] border border-[#1e293b] p-6 rounded-xl hover:border-[#10b981]/40 transition-all duration-300">
          <Layers className="w-8 h-8 text-[#10b981] mb-4" />
          <h3 className="text-xs uppercase font-semibold text-[#94a3b8] tracking-wider">Regelartikler (2025/2196)</h3>
          <p className="text-4xl font-extrabold text-[#f8fafc] mt-2">{implCount}</p>
        </div>

        <div className="bg-[#0f172a] border border-[#1e293b] p-6 rounded-xl hover:border-[#fbbf24]/40 transition-all duration-300 cursor-pointer" onClick={() => setActiveTab("overlaps")}>
          <GitBranch className="w-8 h-8 text-[#fbbf24] mb-4" />
          <h3 className="text-xs uppercase font-semibold text-[#94a3b8] tracking-wider">Detekterede Overlap</h3>
          <div className="flex items-baseline justify-between mt-2">
            <p className="text-4xl font-extrabold text-[#f8fafc]">{data.overlaps.length}</p>
            <span className="text-xs text-[#fbbf24] flex items-center gap-1">Vis analyse <ArrowRight className="w-3.5 h-3.5" /></span>
          </div>
        </div>

        <div className="bg-[#ef4444]/10 border border-[#ef4444]/20 p-6 rounded-xl hover:border-[#ef4444]/50 transition-all duration-300 cursor-pointer" onClick={() => setActiveTab("conflicts")}>
          <AlertTriangle className="w-8 h-8 text-[#f87171] mb-4" />
          <h3 className="text-xs uppercase font-semibold text-[#f87171] tracking-wider">Kritiske Konflikter</h3>
          <div className="flex items-baseline justify-between mt-2">
            <p className="text-4xl font-extrabold text-[#f87171]">{data.conflicts.length}</p>
            <span className="text-xs text-[#f87171] flex items-center gap-1">Vis konflikter <ArrowRight className="w-3.5 h-3.5" /></span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Graph Summary */}
        <div className="bg-[#0d1527] border border-[#1e293b] p-6 rounded-xl">
          <h3 className="text-sm uppercase font-semibold text-[#94a3b8] tracking-wider mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#38bdf8]" /> Netværksstruktur
          </h3>
          <div className="space-y-4">
            <p className="text-sm text-[#94a3b8] leading-relaxed">
              Vi har udtrukket i alt <strong className="text-[#38bdf8]">{data.nodes.length} noder</strong> (inklusive specifikke stykker/stk.) og 
              etableret <strong className="text-[#38bdf8]">{totalCitations} retlige bindinger</strong> baseret på automatiske kildehenvisninger.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#1e293b]/40 p-4 rounded-lg">
                <span className="text-xs text-[#94a3b8]">Gennemsnitlige referencer pr. artikel</span>
                <p className="text-2xl font-bold mt-1">{(totalCitations / (controlCount + implCount)).toFixed(2)}</p>
              </div>
              <div className="bg-[#1e293b]/40 p-4 rounded-lg">
                <span className="text-xs text-[#94a3b8]">Modallogiske krydsreferencer</span>
                <p className="text-2xl font-bold mt-1">{totalCitations}</p>
              </div>
            </div>
            <button 
              onClick={() => setActiveTab("graph")}
              className="w-full mt-2 py-2.5 rounded-lg bg-[#38bdf8] text-[#070b13] font-semibold text-sm hover:bg-[#38bdf8]/90 transition-all flex items-center justify-center gap-2"
            >
              Åbn Interaktiv Netværksgraf <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* System Description */}
        <div className="bg-[#0d1527] border border-[#1e293b] p-6 rounded-xl space-y-4">
          <h3 className="text-sm uppercase font-semibold text-[#94a3b8] tracking-wider mb-4 flex items-center gap-2">
            <Info className="w-4 h-4 text-[#10b981]" /> Sådan fungerer Conflict Engine
          </h3>
          <div className="space-y-3 text-sm text-[#94a3b8] leading-relaxed">
            <div className="flex gap-3">
              <CheckCircle className="w-5 h-5 text-[#10b981] shrink-0 mt-0.5" />
              <p>
                <strong>Modalklassificering:</strong> Hver krydsreference tildeles en modalitet (Forpligtelse, Undtagelse/Dispensation, Tilladelse, Forbud) ud fra tekstkonteksten (fx ord som <em>&quot;fritages&quot;</em>, <em>&quot;skal&quot;</em>, <em>&quot;forbudt&quot;</em>).
              </p>
            </div>
            <div className="flex gap-3">
              <CheckCircle className="w-5 h-5 text-[#10b981] shrink-0 mt-0.5" />
              <p>
                <strong>Retlig konflikt-detektion:</strong> Hvis én artikel pålægger en forpligtelse (Obligation) i forhold til et specifikt lovområde, mens en anden uafhængig artikel i gennemførelsesforordningen tildeler en undtagelse (Exception) uden at henvise til en klar delegation, flages dette som en potentiel konflikt.
              </p>
            </div>
            <div className="flex gap-3">
              <CheckCircle className="w-5 h-5 text-[#10b981] shrink-0 mt-0.5" />
              <p>
                <strong>Overlappende Udmøntning:</strong> Finder kernebestemmelser i rammen, som reguleres af usædvanligt mange separate artikler i gennemførelsesforordningen, hvilket øger den administrative kompleksitet.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// VIEW 2: INTERACTIVE GRAPH VIEW (D3 SVG Canvas wrapper)
// ----------------------------------------------------
interface D3GraphCanvasProps {
  data: GraphData;
  selectedNode: GraphNode | null;
  activeDocFilter: "all" | "control" | "impl";
  activeCategoryFilter: string;
  searchQuery: string;
  setSelectedNode: (node: GraphNode | null) => void;
}

const D3GraphCanvas = React.memo(function D3GraphCanvas({
  data,
  selectedNode,
  activeDocFilter,
  activeCategoryFilter,
  searchQuery,
  setSelectedNode
}: D3GraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const selectedNodeRef = useRef<GraphNode | null>(null);

  // Get top 10 most connected (important) nodes in the current filtered view
  const top10Nodes = React.useMemo(() => {
    const nodes: GraphNode[] = data.nodes.map(n => ({ ...n }));
    const links: GraphLink[] = data.links.map(l => ({
      ...l,
      source: typeof l.source === 'object' ? l.source.id : l.source,
      target: typeof l.target === 'object' ? l.target.id : l.target
    }));

    const filteredNodes = nodes.filter(n => {
      if (activeDocFilter !== "all" && n.doc !== activeDocFilter) return false;
      if (activeCategoryFilter !== "all" && n.theme !== activeCategoryFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return n.label.toLowerCase().includes(query) || 
               n.title.toLowerCase().includes(query) || 
               n.body.toLowerCase().includes(query);
      }
      return true;
    });

    const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredLinks = links.filter(l => {
      const srcId = typeof l.source === 'object' ? l.source.id : l.source;
      const tgtId = typeof l.target === 'object' ? l.target.id : l.target;
      return filteredNodeIds.has(srcId) && filteredNodeIds.has(tgtId);
    });

    const degree: Record<string, number> = {};
    filteredLinks.forEach(l => {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      degree[s] = (degree[s] || 0) + 1;
      degree[t] = (degree[t] || 0) + 1;
    });

    return filteredNodes
      .map(n => ({ ...n, degree: degree[n.id] || 0 }))
      .sort((a, b) => b.degree - a.degree)
      .slice(0, 10);
  }, [data, activeDocFilter, activeCategoryFilter, searchQuery]);

  const handleFocusNode = (nodeId: string) => {
    if (!svgRef.current || !zoomBehaviorRef.current || !containerRef.current) return;
    const circles = d3.select(svgRef.current).selectAll<SVGCircleElement, GraphNode>("circle");
    let targetNode: GraphNode | undefined;
    circles.each(function(d) {
      if (d.id === nodeId) {
        targetNode = d;
      }
    });
    if (!targetNode || targetNode.x === undefined || targetNode.y === undefined) return;
    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 600;
    setSelectedNode(targetNode);
    
    const targetScale = 1.0;
    const transform = d3.zoomIdentity
      .translate(width / 2 - targetNode.x * targetScale, height / 2 - targetNode.y * targetScale)
      .scale(targetScale);

    d3.select(svgRef.current)
      .transition()
      .duration(400)
      .call(zoomBehaviorRef.current.transform, transform);
  };

  // Keep ref updated
  useEffect(() => {
    selectedNodeRef.current = selectedNode;
  }, [selectedNode]);

  // Secondary effect to handle persistent selections (nodes/links opacity & highlight) without resetting simulation
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);

    if (selectedNode) {
      const connectedNodeIds = new Set<string>();
      connectedNodeIds.add(selectedNode.id);

      // Highlight links connected to the selected node and dim the rest
      svg.selectAll("line").style("stroke-opacity", (d: unknown) => {
        const l = d as GraphLink;
        const sId = typeof l.source === "object" ? (l.source as GraphNode).id : l.source;
        const tId = typeof l.target === "object" ? (l.target as GraphNode).id : l.target;
        if (sId === selectedNode.id || tId === selectedNode.id) {
          connectedNodeIds.add(sId);
          connectedNodeIds.add(tId);
          return 1.0;
        }
        return 0.08; // Dimmed
      });

      // Highlight selected node and direct connections
      svg.selectAll("circle")
        .style("opacity", (d: unknown) => {
          const n = d as GraphNode;
          return connectedNodeIds.has(n.id) ? 1.0 : 0.15;
        })
        .attr("stroke-width", (d: unknown) => {
          const n = d as GraphNode;
          return n.id === selectedNode.id ? 3.0 : 1.5;
        })
        .attr("stroke", (d: unknown) => {
          const n = d as GraphNode;
          return n.id === selectedNode.id ? "#38bdf8" : "#0d1527";
        });
    } else {
      // Reset styling
      svg.selectAll("line").style("stroke-opacity", 0.4);
      svg.selectAll("circle")
        .style("opacity", 1.0)
        .attr("stroke-width", 1.5)
        .attr("stroke", "#0d1527");
    }
  }, [selectedNode]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    
    // Clear previous graph contents
    d3.select(svgRef.current).selectAll("*").remove();

    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 600;

    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height]);

    const g = svg.append("g");

    // Zoom setup
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);
    zoomBehaviorRef.current = zoom;

    // Start zoomed out (scale of 0.3) centered
    const initialScale = 0.3;
    const initialTransform = d3.zoomIdentity
      .translate((width * (1 - initialScale)) / 2, (height * (1 - initialScale)) / 2)
      .scale(initialScale);
    svg.call(zoom.transform, initialTransform);

    // Deep copy nodes and links for simulation run
    const nodes: GraphNode[] = data.nodes.map(n => ({ ...n }));
    const links: GraphLink[] = data.links.map(l => ({
      ...l,
      source: typeof l.source === 'object' ? l.source.id : l.source,
      target: typeof l.target === 'object' ? l.target.id : l.target
    }));

    // Filter nodes and links based on UI state
    const filteredNodes = nodes.filter(n => {
      // Doc filter
      if (activeDocFilter !== "all" && n.doc !== activeDocFilter) return false;
      // Category filter
      if (activeCategoryFilter !== "all" && n.theme !== activeCategoryFilter) return false;
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return n.label.toLowerCase().includes(query) || 
               n.title.toLowerCase().includes(query) || 
               n.body.toLowerCase().includes(query);
      }
      return true;
    });

    const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredLinks = links.filter(l => {
      const srcId = typeof l.source === 'object' ? l.source.id : l.source;
      const tgtId = typeof l.target === 'object' ? l.target.id : l.target;
      return filteredNodeIds.has(srcId) && filteredNodeIds.has(tgtId);
    });

    // Degree calculations for node sizing
    const degree: Record<string, number> = {};
    filteredLinks.forEach(l => {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      degree[s] = (degree[s] || 0) + 1;
      degree[t] = (degree[t] || 0) + 1;
    });

    // Force simulation
    const simulation = d3.forceSimulation<GraphNode>(filteredNodes)
      .force("link", d3.forceLink<GraphNode, GraphLink>(filteredLinks).id((d) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-70))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide<GraphNode>().radius((d) => {
        const deg = degree[d.id] || 0;
        return 6 + Math.min(deg * 0.8, 18) + 5;
      }));

    // Draw links
    const link = g.append("g")
      .selectAll("line")
      .data(filteredLinks)
      .join("line")
      .attr("stroke", d => {
        if (d.modality === "Exception") return "#ef4444";
        if (d.modality === "Prohibition") return "#ec4899";
        if (d.modality === "Permission") return "#10b981";
        return "#3b82f6";
      })
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", d => d.modality === "Exception" ? "4, 2" : "none");

    // Draw nodes
    const node = g.append("g")
      .selectAll<SVGCircleElement, GraphNode>("circle")
      .data(filteredNodes)
      .join("circle")
      .attr("r", d => {
        const deg = degree[d.id] || 0;
        return 6 + Math.min(deg * 0.8, 18);
      })
      .attr("fill", d => d.doc === "control" ? "#3b82f6" : "#10b981")
      .attr("stroke", "#0d1527")
      .attr("stroke-width", 1.5)
      .style("cursor", "pointer")
      .call(d3.drag<SVGCircleElement, GraphNode>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
      );

    // Event listeners
    node.on("click", (event, d) => {
      setSelectedNode(d);
    });

    node.on("mouseover", (event, d) => {
      // Highlight hover node and connections (if no node is persistently selected)
      if (selectedNodeRef.current) return;
      
      const connectedNodeIds = new Set<string>();
      connectedNodeIds.add(d.id);

      link.style("stroke-opacity", l => {
        const sId = (l.source as GraphNode).id;
        const tId = (l.target as GraphNode).id;
        if (sId === d.id) {
          connectedNodeIds.add(tId);
          return 1.0;
        }
        if (tId === d.id) {
          connectedNodeIds.add(sId);
          return 1.0;
        }
        return 0.05;
      });

      node.style("opacity", n => connectedNodeIds.has(n.id) ? 1.0 : 0.15);
    });

    node.on("mouseout", () => {
      if (selectedNodeRef.current) return;
      link.style("stroke-opacity", 0.4);
      node.style("opacity", 1.0);
    });

    // Update node positions on tick
    simulation.on("tick", () => {
      link
         .attr("x1", d => (d.source as GraphNode).x!)
         .attr("y1", d => (d.source as GraphNode).y!)
         .attr("x2", d => (d.target as GraphNode).x!)
         .attr("y2", d => (d.target as GraphNode).y!);

      node
         .attr("cx", d => d.x!)
         .attr("cy", d => d.y!);
    });

    // Drag helper functions
    function dragstarted(event: d3.D3DragEvent<SVGCircleElement, GraphNode, unknown>, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: d3.D3DragEvent<SVGCircleElement, GraphNode, unknown>, d: GraphNode) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGCircleElement, GraphNode, unknown>, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Resize observer to handle drawer opening/closing and window resize
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width: newWidth, height: newHeight } = entries[0].contentRect;
      if (newWidth === 0 || newHeight === 0) return;
      
      svg.attr("viewBox", [0, 0, newWidth, newHeight]);
      simulation.force("center", d3.forceCenter(newWidth / 2, newHeight / 2));
      simulation.alpha(0.1).restart();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      simulation.stop();
      resizeObserver.disconnect();
    };
  }, [data, activeDocFilter, activeCategoryFilter, searchQuery, setSelectedNode]);

  const handleZoomIn = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(250)
      .call(zoomBehaviorRef.current.scaleBy, 1.3);
  };

  const handleZoomOut = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(250)
      .call(zoomBehaviorRef.current.scaleBy, 1 / 1.3);
  };

  const handleResetZoom = () => {
    if (!svgRef.current || !zoomBehaviorRef.current || !containerRef.current) return;
    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 600;
    const initialScale = 0.3;
    const initialTransform = d3.zoomIdentity
      .translate((width * (1 - initialScale)) / 2, (height * (1 - initialScale)) / 2)
      .scale(initialScale);

    d3.select(svgRef.current)
      .transition()
      .duration(250)
      .call(zoomBehaviorRef.current.transform, initialTransform);
  };

  return (
    <div ref={containerRef} className="flex-1 bg-[#070b13] relative overflow-hidden">
      <svg ref={svgRef} className="w-full h-full block" />

      {/* Zoom HUD Controls & Important Articles */}
      <div className="absolute top-6 right-6 flex flex-col gap-2 z-10 select-none">
        <div className="flex flex-col gap-2 bg-[#0d1527]/90 border border-[#1e293b] p-2 rounded-xl backdrop-blur-md shadow-lg">
          <button 
            onClick={handleZoomIn}
            className="w-8 h-8 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-sm font-bold flex items-center justify-center transition-all cursor-pointer border border-[#1e293b] hover:border-[#38bdf8]/40 text-[#f8fafc]"
            title="Zoom ind"
          >
            +
          </button>
          <button 
            onClick={handleZoomOut}
            className="w-8 h-8 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-sm font-bold flex items-center justify-center transition-all cursor-pointer border border-[#1e293b] hover:border-[#38bdf8]/40 text-[#f8fafc]"
            title="Zoom ud"
          >
            &minus;
          </button>
          <button 
            onClick={handleResetZoom}
            className="w-8 h-8 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-xs font-semibold flex items-center justify-center transition-all cursor-pointer border border-[#1e293b] hover:border-[#38bdf8]/40 text-[#94a3b8] hover:text-[#38bdf8]"
            title="Nulstil zoom"
          >
            Reset
          </button>
        </div>

        {/* Top 10 nodes */}
        {top10Nodes.length > 0 && (
          <div className="flex flex-col gap-2 bg-[#0d1527]/90 border border-[#1e293b] p-2 rounded-xl backdrop-blur-md shadow-lg max-h-[calc(100vh-250px)] overflow-y-auto">
            <div className="text-[10px] uppercase font-bold text-[#94a3b8] text-center mb-1">
              Top 10
            </div>
            {top10Nodes.map(node => (
              <button
                key={node.id}
                onClick={() => handleFocusNode(node.id)}
                className={`w-8 h-8 rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer border text-center ${
                  selectedNode?.id === node.id 
                    ? "bg-[#38bdf8] text-[#070b13] border-[#38bdf8]" 
                    : "bg-[#1e293b] hover:bg-[#334155] border-[#1e293b] hover:border-[#38bdf8]/40 text-[#f8fafc]"
                }`}
                title={`Art. ${node.number}: ${node.title} (${node.degree} links)`}
              >
                {node.number}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Modality Legend overlay */}
      <div className="absolute bottom-6 left-6 bg-[#0d1527]/90 border border-[#1e293b] p-4 rounded-xl space-y-2 text-xs text-[#94a3b8] backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="w-3 h-0.5 bg-[#ef4444] border-t border-dashed" />
          <span>Undtagelse / Fritagelse</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-0.5 bg-[#3b82f6]" />
          <span>Forpligtelse</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-0.5 bg-[#ec4899]" />
          <span>Forbud</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-0.5 bg-[#10b981]" />
          <span>Tilladelse</span>
        </div>
      </div>
    </div>
  );
});

function InteractiveGraphView({ 
  data, 
  selectedNode, 
  setSelectedNode,
  activeDocFilter,
  setActiveDocFilter,
  activeCategoryFilter,
  setActiveCategoryFilter
}: { 
  data: GraphData; 
  selectedNode: GraphNode | null;
  setSelectedNode: (node: GraphNode | null) => void;
  activeDocFilter: "all" | "control" | "impl";
  setActiveDocFilter: (val: "all" | "control" | "impl") => void;
  activeCategoryFilter: string;
  setActiveCategoryFilter: (val: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");

  // Group nodes by category to construct filters
  const categories = Array.from(new Set(data.nodes.map(n => n.theme))).sort((a, b) => {
    if (a === "Kandidat Case") return 1;
    if (b === "Kandidat Case") return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="flex-1 flex overflow-hidden relative">
      {/* Control panel sidebar */}
      <div className="w-80 bg-[#0d1527] border-r border-[#1e293b] p-6 flex flex-col gap-6 overflow-y-auto">
        <div>
          <h3 className="text-xs uppercase font-semibold text-[#94a3b8] tracking-wider mb-2">Søg i graf</h3>
          <div className="relative">
            <input
              type="text"
              placeholder="Indtast søgeord..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#070b13] border border-[#1e293b] text-sm text-[#f8fafc] px-3 py-2 rounded-lg outline-none focus:border-[#38bdf8]"
            />
            <Search className="w-4 h-4 text-[#94a3b8] absolute right-3 top-3" />
          </div>
        </div>

        <div>
          <h3 className="text-xs uppercase font-semibold text-[#94a3b8] tracking-wider mb-2">Dokumentfilter</h3>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => setActiveDocFilter("all")}
              className={`text-left px-3 py-2 rounded-lg text-xs font-semibold uppercase ${activeDocFilter === "all" ? "bg-[#38bdf8]/10 border border-[#38bdf8]/20 text-[#38bdf8]" : "text-[#94a3b8] hover:bg-[#1e293b]"}`}
            >
              Alle dokumenter
            </button>
            <button
              onClick={() => setActiveDocFilter("control")}
              className={`text-left px-3 py-2 rounded-lg text-xs font-semibold uppercase flex items-center gap-2 ${activeDocFilter === "control" ? "bg-[#38bdf8]/10 border border-[#38bdf8]/20 text-[#38bdf8]" : "text-[#94a3b8] hover:bg-[#1e293b]"}`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]" /> Ramme (1224/2009)
            </button>
            <button
              onClick={() => setActiveDocFilter("impl")}
              className={`text-left px-3 py-2 rounded-lg text-xs font-semibold uppercase flex items-center gap-2 ${activeDocFilter === "impl" ? "bg-[#38bdf8]/10 border border-[#38bdf8]/20 text-[#38bdf8]" : "text-[#94a3b8] hover:bg-[#1e293b]"}`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" /> Gennemførelse (2025/2196)
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-xs uppercase font-semibold text-[#94a3b8] tracking-wider mb-2">Kategorifilter</h3>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => setActiveCategoryFilter("all")}
              className={`text-left px-3 py-2 rounded-lg text-xs font-semibold ${activeCategoryFilter === "all" ? "bg-[#38bdf8]/10 border border-[#38bdf8]/20 text-[#38bdf8]" : "text-[#94a3b8] hover:bg-[#1e293b]"}`}
            >
              Alle kategorier ({data.nodes.length})
            </button>
            {categories.map(cat => {
              const count = data.nodes.filter(n => n.theme === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategoryFilter(cat)}
                  className={`text-left px-3 py-2 rounded-lg text-xs font-semibold truncate ${activeCategoryFilter === cat ? "bg-[#38bdf8]/10 border border-[#38bdf8]/20 text-[#38bdf8]" : "text-[#94a3b8] hover:bg-[#1e293b]"}`}
                  title={`${cat} (${count})`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Graph Canvas */}
      <D3GraphCanvas
        data={data}
        selectedNode={selectedNode}
        activeDocFilter={activeDocFilter}
        activeCategoryFilter={activeCategoryFilter}
        searchQuery={searchQuery}
        setSelectedNode={setSelectedNode}
      />

      {/* Details sidebar drawer */}
      {selectedNode && (
        <div className="absolute right-0 top-0 w-96 bg-[#0d1527] border-l border-[#1e293b] flex flex-col h-full z-20 shadow-2xl transition-all duration-300">
          <div className="p-6 border-b border-[#1e293b] relative flex flex-col gap-2">
            <button 
              onClick={() => setSelectedNode(null)}
              className="absolute top-4 right-4 text-[#94a3b8] hover:text-[#f8fafc] text-xl"
            >
              &times;
            </button>
            <span className={`inline-flex items-center self-start px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
              selectedNode.doc === "control" ? "bg-[#3b82f6]/10 text-[#60a5fa] border border-[#3b82f6]/30" : "bg-[#10b981]/10 text-[#34d399] border border-[#10b981]/30"
            }`}>
              {selectedNode.doc === "control" ? "Ramme" : "Gennemførelse"}
            </span>
            <h2 className="text-lg font-bold">{selectedNode.label}</h2>
            <p className="text-xs text-[#94a3b8] font-medium">{selectedNode.title || "(Ingen overskrift)"}</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="space-y-2">
              <h3 className="text-xs uppercase font-bold text-[#94a3b8] tracking-wider">Kategori</h3>
              <span className="inline-block px-2.5 py-1 rounded bg-[#1e293b] text-xs font-semibold text-[#f8fafc]">
                {selectedNode.theme}
              </span>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs uppercase font-bold text-[#94a3b8] tracking-wider">Lovtekst</h3>
              <div className="bg-[#070b13] border border-[#1e293b] p-4 rounded-lg text-sm leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap">
                {selectedNode.body}
              </div>
            </div>

            {/* List connections */}
            <div className="space-y-3">
              <h3 className="text-xs uppercase font-bold text-[#94a3b8] tracking-wider">Forbindelser i grafen</h3>
              <div className="space-y-2">
                {data.links.filter(l => {
                  const s = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
                  const t = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
                  return s === selectedNode.id || t === selectedNode.id;
                }).map((l, i) => {
                  const sId = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
                  const targetNodeId = sId === selectedNode.id 
                    ? (typeof l.target === 'object' ? (l.target as GraphNode).id : l.target)
                    : sId;
                  
                  const targetNode = data.nodes.find(n => n.id === targetNodeId);
                  if (!targetNode) return null;

                  return (
                    <div 
                      key={i}
                      onClick={() => setSelectedNode(targetNode)}
                      className="p-3 bg-[#070b13] border border-[#1e293b] rounded-lg hover:border-[#38bdf8]/40 cursor-pointer transition-all duration-200"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#38bdf8]">{targetNode.label}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          l.modality === "Exception" ? "bg-[#ef4444]/10 text-[#f87171]" :
                          l.modality === "Prohibition" ? "bg-[#ec4899]/10 text-[#f472b6]" :
                          l.modality === "Permission" ? "bg-[#10b981]/10 text-[#34d399]" :
                          "bg-[#3b82f6]/10 text-[#60a5fa]"
                        }`}>
                          {l.modality === "Exception" ? "Undtagelse" :
                           l.modality === "Prohibition" ? "Forbud" :
                           l.modality === "Permission" ? "Tilladelse" :
                           "Forpligtelse"}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#94a3b8] truncate mt-1">{targetNode.title || "(Uden titel)"}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// VIEW 3: OVERLAPS VIEW
// ----------------------------------------------------
function OverlapsView({ 
  data, 
  setSelectedNode, 
  setActiveTab 
}: { 
  data: GraphData; 
  setSelectedNode: (node: GraphNode) => void;
  setActiveTab: (tab: TabType) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto p-8 bg-[#070b13]">
      <div className="max-w-4xl space-y-2 mb-8">
        <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
          <Layers className="text-[#fbbf24] w-6 h-6" /> Overlappende Regulering
        </h2>
        <p className="text-sm text-[#94a3b8] leading-relaxed">
          Nedenfor vises en liste over rammebestemmelser eller stykker, der er genstand for flere uafhængige kildehenvisninger 
          fra gennemførelsesforordningen. Dette er indikatorer for retlig kompleksitet og områder med tætte administrative regler.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 max-w-4xl">
        {data.overlaps.sort((a, b) => b.count - a.count).map((record, i) => {
          const targetNode = data.nodes.find(n => n.id === record.target);
          if (!targetNode) return null;

          return (
            <div key={i} className="bg-[#0d1527] border border-[#1e293b] p-6 rounded-xl space-y-4 shadow-md">
              <div className="flex items-start justify-between gap-4 flex-wrap md:flex-nowrap">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase text-[#fbbf24] bg-[#fbbf24]/10 border border-[#fbbf24]/30 px-2 py-0.5 rounded">
                      Overlap ({record.count} referencer)
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      targetNode.doc === "control" 
                        ? "bg-[#3b82f6]/10 text-[#60a5fa] border-[#3b82f6]/20" 
                        : "bg-[#10b981]/10 text-[#34d399] border-[#10b981]/20"
                    }`}>
                      {targetNode.doc === "control" ? "Ramme (EF 1224/2009)" : "Gennemførelse (EU 2025/2196)"}
                    </span>
                  </div>
                  <h3 className="text-base font-bold mt-2">
                    Målbestemmelse: <span className="text-[#38bdf8]">{targetNode.label}</span>
                  </h3>
                  <p className="text-xs text-[#94a3b8] leading-relaxed">{targetNode.title}</p>
                </div>
                <button 
                  onClick={() => {
                    setSelectedNode(targetNode);
                    setActiveTab("graph");
                  }}
                  className="px-3 py-1.5 rounded bg-[#1e293b] text-xs font-semibold hover:bg-[#334155] transition-all flex items-center gap-1.5 shrink-0 border border-[#1e293b] hover:border-[#38bdf8]/40 text-[#f8fafc]"
                >
                  Vis i graf <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="border-t border-[#1e293b] pt-4">
                <h4 className="text-xs uppercase font-bold text-[#94a3b8] tracking-wider mb-3">Refererende artikler:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {record.citations.map((c, idx) => {
                    const sourceNode = data.nodes.find(n => n.id === c.source);
                    return (
                      <div key={idx} className="bg-[#070b13] p-4 border border-[#1e293b] rounded-lg flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-center gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-[#38bdf8]">{sourceNode?.label}</span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                                sourceNode?.doc === "control" 
                                  ? "bg-[#3b82f6]/10 text-[#60a5fa] border-[#3b82f6]/20" 
                                  : "bg-[#10b981]/10 text-[#34d399] border-[#10b981]/20"
                              }`}>
                                {sourceNode?.doc === "control" ? "Ramme" : "Gennemførelse"}
                              </span>
                            </div>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1e293b] text-[#94a3b8] font-medium">
                              {c.modality === "Exception" ? "Undtagelse" :
                               c.modality === "Prohibition" ? "Forbud" :
                               c.modality === "Permission" ? "Tilladelse" :
                               "Forpligtelse"}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs font-serif italic text-[#94a3b8] block border-l-2 border-[#1e293b] pl-2 leading-relaxed">
                          &quot;...{c.snippet}...&quot;
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ----------------------------------------------------
// VIEW 4: CONFLICTS VIEW
// ----------------------------------------------------
function ConflictsView({ 
  data, 
  setSelectedNode, 
  setActiveTab 
}: { 
  data: GraphData; 
  setSelectedNode: (node: GraphNode) => void;
  setActiveTab: (tab: TabType) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto p-8 bg-[#070b13]">
      <div className="max-w-4xl space-y-2 mb-8">
        <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
          <AlertTriangle className="text-[#f87171] w-6 h-6 animate-pulse" /> Retlige Modstrid & Anomalier
        </h2>
        <p className="text-sm text-[#94a3b8] leading-relaxed">
          Kollisioner sker, når en artikel i rammen pålægger krav (Obligation), mens underliggende gennemførelsesbestemmelser 
          eller relaterede artikler fritager eller undtager (Exception) for samme bestemmelse uden eksplicit sammenkobling. 
          Værktøjet fremhæver disse som potentielle overtrædelser af det hierarkiske retlige delegationsprincip.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 max-w-4xl">
        {data.conflicts.map((record, i) => {
          const targetNode = data.nodes.find(n => n.id === record.target);
          if (!targetNode) return null;

          return (
            <div key={i} className="bg-[#110e19] border border-[#ef4444]/20 p-6 rounded-xl space-y-4 shadow-lg hover:border-[#ef4444]/40 transition-all duration-300">
              <div className="flex items-start justify-between gap-4 flex-wrap md:flex-nowrap">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase text-[#f87171] bg-[#ef4444]/10 border border-[#ef4444]/30 px-2 py-0.5 rounded">
                      Modstrid detekteret ({record.modalities.map(m => 
                        m === "Exception" ? "Undtagelse" :
                        m === "Prohibition" ? "Forbud" :
                        m === "Permission" ? "Tilladelse" :
                        "Forpligtelse"
                      ).join(" ↔ ")})
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      targetNode.doc === "control" 
                        ? "bg-[#3b82f6]/10 text-[#60a5fa] border-[#3b82f6]/20" 
                        : "bg-[#10b981]/10 text-[#34d399] border-[#10b981]/20"
                    }`}>
                      {targetNode.doc === "control" ? "Ramme (EF 1224/2009)" : "Gennemførelse (EU 2025/2196)"}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold mt-2">
                    Modstrid vedrørende: <span className="text-[#38bdf8]">{targetNode.label}</span>
                  </h3>
                  <p className="text-xs text-[#94a3b8] leading-relaxed">{targetNode.title}</p>
                </div>
                <button 
                  onClick={() => {
                    setSelectedNode(targetNode);
                    setActiveTab("graph");
                  }}
                  className="px-3 py-1.5 rounded bg-[#ef4444]/10 hover:bg-[#ef4444]/20 text-[#f87171] text-xs font-semibold transition-all flex items-center gap-1.5 border border-[#ef4444]/30 shrink-0"
                >
                  Vis i graf <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-sm text-[#f8fafc] bg-[#ef4444]/5 p-3 rounded-lg border border-[#ef4444]/10 leading-relaxed">
                {record.description}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-[#1e293b]/40 pt-4">
                {record.citations.map((c, idx) => {
                  const sourceNode = data.nodes.find(n => n.id === c.source);
                  return (
                    <div key={idx} className="bg-[#070b13] p-4 border border-[#1e293b] rounded-lg flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center gap-2 mb-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#38bdf8]">{sourceNode?.label}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                              sourceNode?.doc === "control" 
                                ? "bg-[#3b82f6]/10 text-[#60a5fa] border-[#3b82f6]/20" 
                                : "bg-[#10b981]/10 text-[#34d399] border-[#10b981]/20"
                            }`}>
                              {sourceNode?.doc === "control" ? "Ramme" : "Gennemførelse"}
                            </span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            c.modality === "Exception" ? "bg-[#ef4444]/20 text-[#f87171]" : "bg-[#3b82f6]/20 text-[#60a5fa]"
                          }`}>
                            {c.modality === "Exception" ? "Undtagelse" : "Forpligtelse"}
                          </span>
                        </div>
                        <p className="text-xs text-[#94a3b8] mt-1 leading-relaxed">{sourceNode?.title}</p>
                      </div>
                      
                      <div className="mt-4 p-3 bg-[#0d1527] rounded text-xs font-serif leading-relaxed text-[#f8fafc]/90 border-l-2 border-[#38bdf8]/40 whitespace-pre-wrap">
                        ...{c.context}...
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ----------------------------------------------------
// VIEW 5: BROWSE VIEW (Searchable List)
// ----------------------------------------------------
function BrowseView({ 
  data, 
  searchQuery, 
  setSearchQuery, 
  setSelectedNode, 
  setActiveTab 
}: { 
  data: GraphData; 
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setSelectedNode: (node: GraphNode) => void;
  setActiveTab: (tab: TabType) => void;
}) {
  const filteredNodes = React.useMemo(() => {
    if (!searchQuery.trim()) return data.nodes;
    const query = searchQuery.toLowerCase().trim();
    const queryNum = parseInt(query, 10);
    const isNumericQuery = /^\d+$/.test(query);

    const matches = data.nodes.filter(n => {
      return n.label.toLowerCase().includes(query) || 
             n.title.toLowerCase().includes(query) || 
             n.body.toLowerCase().includes(query) ||
             n.theme.toLowerCase().includes(query);
    });

    return matches.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      if (isNumericQuery) {
        if (a.number === queryNum) scoreA += 1000;
        if (b.number === queryNum) scoreB += 1000;
        
        if (a.label.toLowerCase().includes(`artikel ${query}`)) scoreA += 500;
        if (b.label.toLowerCase().includes(`artikel ${query}`)) scoreB += 500;
      }

      // Prioritize match directly in the title
      if (a.title.toLowerCase() === query) scoreA += 300;
      if (b.title.toLowerCase() === query) scoreB += 300;

      if (a.title.toLowerCase().includes(query)) scoreA += 100;
      if (b.title.toLowerCase().includes(query)) scoreB += 100;

      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      return a.number - b.number;
    });
  }, [data.nodes, searchQuery]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#070b13]">
      <div className="p-8 border-b border-[#1e293b] space-y-4">
        <h2 className="text-2xl font-extrabold tracking-tight">Gennemse Artikler</h2>
        <div className="max-w-xl relative">
          <input
            type="text"
            placeholder="Søg i lovtekst, artikler, kategorier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0d1527] border border-[#1e293b] text-[#f8fafc] px-4 py-3 pl-11 rounded-xl outline-none focus:border-[#38bdf8] text-sm"
          />
          <Search className="w-5 h-5 text-[#94a3b8] absolute left-4 top-3.5" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-6xl">
          {filteredNodes.map(node => (
            <div 
              key={node.id} 
              className="bg-[#0d1527] border border-[#1e293b] p-5 rounded-xl hover:border-[#38bdf8]/40 transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    node.doc === "control" ? "bg-[#3b82f6]/15 text-[#60a5fa]" : "bg-[#10b981]/15 text-[#34d399]"
                  }`}>
                    {node.doc === "control" ? "Rådets forordning 1224/2009" : "Genf. forordning 2025/2196"}
                  </span>
                  <span className="text-[10px] font-semibold text-[#94a3b8] bg-[#1e293b] px-2 py-0.5 rounded">
                    {node.theme}
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#f8fafc] mt-3">{node.label}</h3>
                <p className="text-xs text-[#94a3b8] mt-1 font-medium">{node.title || "(Ingen overskrift)"}</p>
                
                <p className="text-xs text-[#94a3b8] leading-relaxed mt-4 line-clamp-3 bg-[#070b13] p-3 rounded-lg border border-[#1e293b]/40">
                  {node.body}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-[#1e293b]/40 flex justify-end">
                <button
                  onClick={() => {
                    setSelectedNode(node);
                    setActiveTab("graph");
                  }}
                  className="text-xs font-bold text-[#38bdf8] flex items-center gap-1.5 hover:underline"
                >
                  Inspicer forbindelser <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
