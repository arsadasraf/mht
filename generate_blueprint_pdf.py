import os
import sys
import base64
import subprocess

def get_base64_image(path):
    if os.path.exists(path):
        with open(path, "rb") as f:
            data = base64.b64encode(f.read()).decode("utf-8")
            ext = os.path.splitext(path)[1].lower().replace(".", "")
            if ext == "jpg":
                ext = "jpeg"
            return f"data:image/{ext};base64,{data}"
    return ""

def build_svg_flowchart(nodes, connections):
    """
    Renders a clean, high-resolution SVG flowchart.
    nodes: list of dicts: {'id': 'n1', 'label': 'Text', 'sub': 'Subtext', 'x': 50, 'y': 30, 'w': 180, 'h': 60, 'type': 'start'|'process'|'gate'|'end'|'freeze'}
    connections: list of tuples: (from_id, to_id, 'label')
    """
    node_map = {n['id']: n for n in nodes}
    
    # Calculate bounds
    max_x = max([n['x'] + n['w'] for n in nodes]) + 30
    max_y = max([n['y'] + n['h'] for n in nodes]) + 30
    view_w = max(950, max_x)
    view_h = max(150, max_y)

    svg_parts = []
    svg_parts.append(f'<svg viewBox="0 0 {view_w} {view_h}" width="100%" height="{view_h}" xmlns="http://www.w3.org/2000/svg" style="background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; margin: 8px 0 14px 0;">')
    svg_parts.append('<defs>')
    svg_parts.append('<marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">')
    svg_parts.append('<path d="M 0 1 L 10 5 L 0 9 z" fill="#94a3b8" />')
    svg_parts.append('</marker>')
    svg_parts.append('<marker id="arrow-orange" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">')
    svg_parts.append('<path d="M 0 1 L 10 5 L 0 9 z" fill="#ea580c" />')
    svg_parts.append('</marker>')
    svg_parts.append('</defs>')
    
    # Draw connections
    for c in connections:
        src = node_map.get(c[0])
        dst = node_map.get(c[1])
        lbl = c[2] if len(c) > 2 else ""
        if src and dst:
            x1 = src['x'] + src['w']
            y1 = src['y'] + src['h'] // 2
            x2 = dst['x']
            y2 = dst['y'] + dst['h'] // 2
            
            # Simple orthogonal or straight line
            if abs(y1 - y2) < 5:
                svg_parts.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#cbd5e1" stroke-width="2" marker-end="url(#arrow)" />')
                if lbl:
                    svg_parts.append(f'<text x="{(x1+x2)/2}" y="{y1-5}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="9" font-weight="600" fill="#ea580c">{lbl}</text>')
            else:
                mid_x = (x1 + x2) / 2
                svg_parts.append(f'<path d="M {x1} {y1} L {mid_x} {y1} L {mid_x} {y2} L {x2} {y2}" fill="none" stroke="#cbd5e1" stroke-width="2" marker-end="url(#arrow)" />')
                if lbl:
                    svg_parts.append(f'<text x="{mid_x}" y="{(y1+y2)/2}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="9" font-weight="600" fill="#ea580c">{lbl}</text>')

    # Draw nodes
    for n in nodes:
        x = n['x']
        y = n['y']
        w = n['w']
        h = n['h']
        ntype = n.get('type', 'process')
        
        # Styles
        if ntype == 'start':
            fill = "#eff6ff"
            stroke = "#3b82f6"
            text_color = "#1e3a8a"
            tag = "TRIGGER"
            tag_bg = "#dbeafe"
            tag_color = "#1e40af"
        elif ntype == 'gate':
            fill = "#fffbeb"
            stroke = "#f59e0b"
            text_color = "#92400e"
            tag = "STAGE GATE"
            tag_bg = "#fef3c7"
            tag_color = "#b45309"
        elif ntype == 'freeze':
            fill = "#fef2f2"
            stroke = "#ef4444"
            text_color = "#991b1b"
            tag = "AUTO STOP"
            tag_bg = "#fee2e2"
            tag_color = "#b91c1c"
        elif ntype == 'end':
            fill = "#ecfdf5"
            stroke = "#10b981"
            text_color = "#065f46"
            tag = "HANDOVER"
            tag_bg = "#d1fae5"
            tag_color = "#047857"
        else: # process
            fill = "#ffffff"
            stroke = "#cbd5e1"
            text_color = "#0f172a"
            tag = n.get('tag', 'STEP')
            tag_bg = "#f1f5f9"
            tag_color = "#475569"
            
        svg_parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="{fill}" stroke="{stroke}" stroke-width="1.5" />')
        
        # Tag badge
        svg_parts.append(f'<rect x="{x+8}" y="{y+6}" width="58" height="13" rx="3" fill="{tag_bg}" />')
        svg_parts.append(f'<text x="{x+37}" y="{y+15}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="8" font-weight="700" fill="{tag_color}">{tag}</text>')
        
        # Main label
        svg_parts.append(f'<text x="{x+10}" y="{y+32}" font-family="system-ui, sans-serif" font-size="10.5" font-weight="700" fill="{text_color}">{n["label"]}</text>')
        # Sub label
        if n.get('sub'):
            svg_parts.append(f'<text x="{x+10}" y="{y+46}" font-family="system-ui, sans-serif" font-size="8.5" font-weight="500" fill="#64748b">{n["sub"]}</text>')

    svg_parts.append('</svg>')
    return "".join(svg_parts)

def build_spine_svg():
    """Builds the comprehensive ETO Architecture spine SVG."""
    stages = [
        {"num": "1", "name": "CRM & Enquiry", "sub": "Lead → TRS → CPO", "tag": "Commercial", "color": "#3b82f6"},
        {"num": "2", "name": "Project Setup", "sub": "PRJ-XXXX / WO-XXXX", "tag": "Central Spine", "color": "#ea580c"},
        {"num": "3", "name": "Design & CAD", "sub": "3-Level BOM & ECO", "tag": "Engineering", "color": "#0284c7"},
        {"num": "4", "name": "Purchase", "sub": "Net Demand & POs", "tag": "Sourcing", "color": "#d97706"},
        {"num": "5", "name": "Quality (QC)", "sub": "IQC & Quarantine", "tag": "Compliance", "color": "#059669"},
        {"num": "6", "name": "Store & Ledger", "sub": "Hard Allocation Lock", "tag": "Inventory", "color": "#7c3aed"},
        {"num": "7", "name": "Production", "sub": "Assembly & Trials", "tag": "Shopfloor", "color": "#0284c7"},
        {"num": "8", "name": "Dispatch", "sub": "Zero-Snag Gate Pass", "tag": "Logistics", "color": "#dc2626"},
        {"num": "9", "name": "After Sales", "sub": "Warranty & Field PM", "tag": "Field Service", "color": "#059669"}
    ]
    
    svg = ['<svg viewBox="0 0 950 180" width="100%" height="180" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; margin: 12px 0;">']
    svg.append('<defs><marker id="spine-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 1 L 10 5 L 0 9 z" fill="#ea580c"/></marker></defs>')
    
    # Draw central spine backbone line
    svg.append('<line x1="60" y1="90" x2="890" y2="90" stroke="#ffedd5" stroke-width="8" stroke-linecap="round" />')
    svg.append('<line x1="60" y1="90" x2="890" y2="90" stroke="#ea580c" stroke-width="2.5" stroke-dasharray="4,4" />')
    
    # Place each stage circle and card
    x_positions = [60, 160, 260, 360, 460, 560, 660, 760, 860]
    for i, stg in enumerate(stages):
        x = x_positions[i]
        is_even = (i % 2 == 0)
        card_y = 15 if is_even else 115
        
        # Connection line to backbone
        line_y1 = card_y + (48 if is_even else 0)
        svg.append(f'<line x1="{x}" y1="{line_y1}" x2="{x}" y2="90" stroke="#cbd5e1" stroke-width="1.5" />')
        
        # Circle node on backbone
        svg.append(f'<circle cx="{x}" cy="90" r="14" fill="#ffffff" stroke="{stg["color"]}" stroke-width="3" />')
        svg.append(f'<text x="{x}" y="94" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10" font-weight="800" fill="{stg["color"]}">{stg["num"]}</text>')
        
        # Info Card
        card_x = x - 46
        svg.append(f'<rect x="{card_x}" y="{card_y}" width="92" height="46" rx="6" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />')
        svg.append(f'<text x="{x}" y="{card_y + 14}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="8.5" font-weight="700" fill="#0f172a">{stg["name"]}</text>')
        svg.append(f'<text x="{x}" y="{card_y + 26}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="7.5" font-weight="500" fill="#64748b">{stg["sub"]}</text>')
        svg.append(f'<rect x="{x-32}" y="{card_y + 31}" width="64" height="11" rx="3" fill="#f1f5f9" />')
        svg.append(f'<text x="{x}" y="{card_y + 39}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="7" font-weight="700" fill="{stg["color"]}">{stg["tag"]}</text>')

    svg.append('</svg>')
    return "".join(svg)

print("Spine builder ready.")
