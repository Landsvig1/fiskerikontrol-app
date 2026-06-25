import fitz
import re
import json
import os

THEMES = {
    "Licenses & Permits": ["licens", "tilladelse", "kapacitet", "bruttotonnage", " BT ", " kW "],
    "VMS & Tracking": ["VMS", "fartøjsovervåg", "sporings", "position", "satellit", "FOS", "AIS"],
    "Logbooks & Electronic Reporting": ["logbog", "indberetning", "ERS", "elektronisk", "fangst", "afgangsdeklaration", "forhåndsunderretning"],
    "Fishing Gear & Engine Power": ["redskab", "trawl", "maskineffekt", "motorstyrke", "kW", "maskin", "motor"],
    "Landings, Weighing & Sales": ["landing", "salgsnotat", "omladning", "fiskevare", "overførsel", "afhentning", "vejes", "vejning", "landingsdeklaration", "overtagelseserklæring"],
    "Inspection & Surveillance": ["inspektion", "kontrollør", "embedsmand", "observatør", "inspektionsrapport", "inspektionsfartøj", "flyvning"],
    "Enforcement & Points System": ["sanktion", "point", "overtrædelse", "håndhævelse", "overtrædelser", "sanktioner"],
    "Data Validation & Systems": ["validering", "krydskontrol", "database", "bistand", "samarbejde", "FLUX", "oplysninger", "webservice"]
}

def clean_articles(articles):
    by_num = {}
    for art in articles:
        num = art["number"]
        if num not in by_num:
            by_num[num] = art
        else:
            if len(art["body"]) > len(by_num[num]["body"]):
                by_num[num] = art
    return [by_num[n] for n in sorted(by_num.keys())]

def detect_theme(title, body):
    combined = (title + " " + body).lower()
    best_theme = "General / Framework"
    max_matches = 0
    for theme, keywords in THEMES.items():
        matches = 0
        for kw in keywords:
            if kw.lower() in combined:
                matches += 1
        if matches > max_matches:
            max_matches = matches
            best_theme = theme
    return best_theme

def parse_pdf(path, name):
    doc = fitz.open(path)
    full_text = ""
    for page in doc:
        full_text += page.get_text() + "\n"
    
    full_text = re.sub(r'\u00a0', ' ', full_text)
    full_text = re.sub(r'\r\n', '\n', full_text)
    
    pattern = r'(?:\n|^)\s*(Artikel\s+(\d+))\b'
    matches = list(re.finditer(pattern, full_text))
    
    articles = []
    for i, m in enumerate(matches):
        art_label = m.group(1)
        art_num = int(m.group(2))
        
        start_idx = m.end()
        end_idx = matches[i+1].start() if i + 1 < len(matches) else len(full_text)
        
        content = full_text[start_idx:end_idx].strip()
        lines = [line.strip() for line in content.split('\n') if line.strip()]
        
        title = ""
        body_lines = []
        if lines:
            if len(lines[0]) < 120:
                title = lines[0]
                body_lines = lines[1:]
            else:
                body_lines = lines
        
        body = "\n".join(body_lines)
        
        articles.append({
            "id": f"{name}_art_{art_num}",
            "number": art_num,
            "label": f"{'Ramme' if name == 'control' else 'Regler'} Art. {art_num}",
            "title": title,
            "body": body,
            "doc": name
        })
    return articles

def parse_citations(source_art, body, doc_type, control_map):
    # Regex to find citations:
    # "artikel X" optionally followed by "stk. Y" and/or "litra Z"
    # Try to detect if it refers to control regulation (impl -> control) or is internal.
    # Standard Danish formats:
    # - "artikel 14"
    # - "artikel 14, stk. 1"
    # - "artikel 14, stk. 1, litra a"
    citations = []
    
    pattern = r'\bartikel\s+(\d+)(?:\s*,\s*stk\.\s*(\d+))?(?:\s*,\s*litra\s*([a-z]))?\b'
    matches = re.finditer(pattern, body, re.IGNORECASE)
    
    for m in matches:
        art_num = int(m.group(1))
        stk_num = m.group(2)
        litra_val = m.group(3)
        
        # Determine context window to detect modality and target document
        start_ctx = max(0, m.start() - 100)
        end_ctx = min(len(body), m.end() + 100)
        context = body[start_ctx:end_ctx].lower()
        snippet = body[max(0, m.start() - 20):min(len(body), m.end() + 20)].strip()
        
        target_doc = "impl"
        if doc_type == "impl":
            # For implementing regulation, references to control regulation are very common
            if "1224/2009" in context or "kontrolforordning" in context or "forordning (ef) nr." in context:
                target_doc = "control"
            elif "denne forordning" in context or "nærværende forordning" in context:
                target_doc = "impl"
            else:
                # Default to control if we are referencing control_map
                if art_num in control_map and "artikel" in context:
                    target_doc = "control"
        else:
            # For control regulation, references are internal to control
            target_doc = "control"
            
        # Determine Modality (Exception vs. Obligation vs. Permission)
        modality = "Obligation"
        if any(w in context for w in ["undtagen", "fritaget", "fritages", "uanset", "afvige", "undtagelse", "dispensation"]):
            modality = "Exception"
        elif any(w in context for w in ["forbudt", "må ikke", "ikke tilladt"]):
            modality = "Prohibition"
        elif any(w in context for w in ["kan", "tilladt", "må", "hjemmel", "bemyndiget"]):
            modality = "Permission"
            
        # Build target node ID
        target_node_id = f"{target_doc}_art_{art_num}"
        if stk_num:
            target_node_id += f"_stk_{stk_num}"
            if litra_val:
                target_node_id += f"_litra_{litra_val}"
                
        citations.append({
            "source": source_art["id"],
            "target": target_node_id,
            "target_art": f"{target_doc}_art_{art_num}",
            "target_doc": target_doc,
            "target_art_num": art_num,
            "target_stk": stk_num,
            "target_litra": litra_val,
            "modality": modality,
            "snippet": snippet,
            "context": body[max(0, m.start() - 60):min(len(body), m.end() + 60)].strip()
        })
        
    return citations

def main():
    print("=== Parsing PDFs ===")
    control_raw = parse_pdf("/Users/kasperlandsvig/Downloads/CELEX_32009R1224_DA_TXT.pdf", "control")
    impl_raw = parse_pdf("/Users/kasperlandsvig/Downloads/OJ_L_202502196_DA_TXT.pdf", "impl")
    
    control = clean_articles(control_raw)
    impl = clean_articles(impl_raw)
    
    control_map = {art["number"]: art for art in control}
    
    # Extract Nodes (all articles)
    nodes = []
    for art in control:
        theme = detect_theme(art["title"], art["body"])
        nodes.append({
            "id": art["id"],
            "number": art["number"],
            "label": art["label"],
            "title": art["title"],
            "doc": "control",
            "theme": theme,
            "body": art["body"]
        })
        
    for art in impl:
        theme = detect_theme(art["title"], art["body"])
        nodes.append({
            "id": art["id"],
            "number": art["number"],
            "label": art["label"],
            "title": art["title"],
            "doc": "impl",
            "theme": theme,
            "body": art["body"]
        })
        
    # Extract edges based on citations
    edges = []
    citation_records = []
    
    for art in control:
        cits = parse_citations(art, art["body"], "control", control_map)
        citation_records.extend(cits)
        
    for art in impl:
        cits = parse_citations(art, art["body"], "impl", control_map)
        citation_records.extend(cits)
        
    # Build unique nodes for subsections if referenced
    # E.g. If control_art_14_stk_1 is targeted, we create a sub-node if it doesn't exist
    node_ids = {n["id"] for n in nodes}
    for cit in citation_records:
        if cit["target"] not in node_ids:
            # Create a virtual sub-node representing this specific paragraph
            parent_id = cit["target_art"]
            parent_node = next((n for n in nodes if n["id"] == parent_id), None)
            
            label = f"{'Ramme' if cit['target_doc'] == 'control' else 'Regler'} Art. {cit['target_art_num']}"
            if cit["target_stk"]:
                label += f", stk. {cit['target_stk']}"
                if cit["target_litra"]:
                    label += f", litra {cit['target_litra']}"
                    
            nodes.append({
                "id": cit["target"],
                "number": cit["target_art_num"],
                "label": label,
                "title": f"Underafsnit af Art. {cit['target_art_num']}" if parent_node else "Ekstern reference",
                "doc": cit["target_doc"],
                "theme": parent_node["theme"] if parent_node else "General / Framework",
                "body": f"Se hovedartiklen: {parent_node['label']} ({parent_node['title']})" if parent_node else "Ekstern reference",
                "is_subnode": True,
                "parent_id": parent_id
            })
            node_ids.add(cit["target"])
            
    # Map edges to links
    for cit in citation_records:
        edges.append({
            "source": cit["source"],
            "target": cit["target"],
            "type": "citation",
            "modality": cit["modality"],
            "snippet": cit["snippet"],
            "context": cit["context"]
        })
        
    # Detect Overlaps and Conflicts
    # 1. Overlaps: Targets referenced by multiple sources
    target_citations = {}
    for cit in citation_records:
        t = cit["target"]
        if t not in target_citations:
            target_citations[t] = []
        target_citations[t].append(cit)
        
    overlaps = []
    conflicts = []
    
    for target_id, cits in target_citations.items():
        if len(cits) > 1:
            # Overlap! Multiple articles refer to the same thing
            sources = [c["source"] for c in cits]
            overlaps.append({
                "target": target_id,
                "sources": list(set(sources)),
                "count": len(cits),
                "citations": [{
                    "source": c["source"],
                    "modality": c["modality"],
                    "snippet": c["snippet"]
                } for c in cits]
            })
            
            # Check for modality conflicts (e.g. Exception vs Obligation or Prohibition)
            modalities = {c["modality"] for c in cits}
            if "Exception" in modalities and ("Obligation" in modalities or "Prohibition" in modalities):
                conflicts.append({
                    "target": target_id,
                    "modalities": list(modalities),
                    "description": f"Potentiel konflikt: En artikel undtager/fritager, mens en anden pålægger eller forbyder i forhold til {target_id}.",
                    "citations": [{
                        "source": c["source"],
                        "modality": c["modality"],
                        "snippet": c["snippet"],
                        "context": c["context"]
                    } for c in cits]
                })
                
    # Save output files
    app_data_dir = "/Users/kasperlandsvig/Documents/Claude Cowork/projects/fiskerikontrol-app/public/data"
    os.makedirs(app_data_dir, exist_ok=True)
    
    output_path = os.path.join(app_data_dir, "graph_data.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump({
            "nodes": nodes,
            "links": edges,
            "overlaps": overlaps,
            "conflicts": conflicts
        }, f, ensure_ascii=False, indent=2)
        
    print(f"Citations parsed successfully! Nodes: {len(nodes)}, Edges: {len(edges)}, Overlaps: {len(overlaps)}, Conflicts: {len(conflicts)}")

if __name__ == "__main__":
    main()
