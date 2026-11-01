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
    node_map = {n['id']: n for n in nodes}
    max_x = max([n['x'] + n['w'] for n in nodes]) + 20
    max_y = max([n['y'] + n['h'] for n in nodes]) + 15
    view_w = max(920, max_x)
    view_h = max(110, max_y)

    svg_parts = []
    svg_parts.append(f'<svg viewBox="0 0 {view_w} {view_h}" width="100%" height="{view_h}" xmlns="http://www.w3.org/2000/svg" style="background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; margin: 4px 0 8px 0;">')
    svg_parts.append('<defs>')
    svg_parts.append('<marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1 L 10 5 L 0 9 z" fill="#94a3b8" /></marker>')
    svg_parts.append('<marker id="arrow-orange" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1 L 10 5 L 0 9 z" fill="#ea580c" /></marker>')
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
            
            if abs(y1 - y2) < 5:
                svg_parts.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#cbd5e1" stroke-width="1.8" marker-end="url(#arrow)" />')
                if lbl:
                    svg_parts.append(f'<text x="{(x1+x2)/2}" y="{y1-4}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="8" font-weight="600" fill="#ea580c">{lbl}</text>')
            else:
                mid_x = (x1 + x2) / 2
                svg_parts.append(f'<path d="M {x1} {y1} L {mid_x} {y1} L {mid_x} {y2} L {x2} {y2}" fill="none" stroke="#cbd5e1" stroke-width="1.8" marker-end="url(#arrow)" />')
                if lbl:
                    svg_parts.append(f'<text x="{mid_x}" y="{(y1+y2)/2}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="8" font-weight="600" fill="#ea580c">{lbl}</text>')

    # Draw nodes
    for n in nodes:
        x = n['x']
        y = n['y']
        w = n['w']
        h = n['h']
        ntype = n.get('type', 'process')
        
        if ntype == 'start':
            fill, stroke, text_color, tag, tag_bg, tag_color = "#eff6ff", "#3b82f6", "#1e3a8a", "TRIGGER", "#dbeafe", "#1e40af"
        elif ntype == 'gate':
            fill, stroke, text_color, tag, tag_bg, tag_color = "#fffbeb", "#f59e0b", "#92400e", "STAGE GATE", "#fef3c7", "#b45309"
        elif ntype == 'freeze':
            fill, stroke, text_color, tag, tag_bg, tag_color = "#fef2f2", "#ef4444", "#991b1b", "AUTO STOP", "#fee2e2", "#b91c1c"
        elif ntype == 'end':
            fill, stroke, text_color, tag, tag_bg, tag_color = "#ecfdf5", "#10b981", "#065f46", "HANDOVER", "#d1fae5", "#047857"
        else:
            fill, stroke, text_color, tag, tag_bg, tag_color = "#ffffff", "#cbd5e1", "#0f172a", n.get('tag', 'STEP'), "#f1f5f9", "#475569"
            
        svg_parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="5" fill="{fill}" stroke="{stroke}" stroke-width="1.2" />')
        svg_parts.append(f'<rect x="{x+5}" y="{y+4}" width="48" height="11" rx="2" fill="{tag_bg}" />')
        svg_parts.append(f'<text x="{x+29}" y="{y+12}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="7" font-weight="700" fill="{tag_color}">{tag}</text>')
        svg_parts.append(f'<text x="{x+6}" y="{y+26}" font-family="system-ui, sans-serif" font-size="9" font-weight="700" fill="{text_color}">{n["label"]}</text>')
        if n.get('sub'):
            svg_parts.append(f'<text x="{x+6}" y="{y+37}" font-family="system-ui, sans-serif" font-size="7.5" font-weight="500" fill="#64748b">{n["sub"]}</text>')

    svg_parts.append('</svg>')
    return "".join(svg_parts)

def build_spine_svg():
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
    svg = ['<svg viewBox="0 0 920 140" width="100%" height="140" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; margin: 8px 0 12px 0;">']
    svg.append('<line x1="45" y1="70" x2="875" y2="70" stroke="#ffedd5" stroke-width="8" stroke-linecap="round" />')
    svg.append('<line x1="45" y1="70" x2="875" y2="70" stroke="#ea580c" stroke-width="2" stroke-dasharray="4,4" />')
    
    x_positions = [50, 150, 250, 350, 450, 550, 650, 750, 850]
    for i, stg in enumerate(stages):
        x = x_positions[i]
        is_even = (i % 2 == 0)
        card_y = 8 if is_even else 88
        line_y1 = card_y + (40 if is_even else 0)
        svg.append(f'<line x1="{x}" y1="{line_y1}" x2="{x}" y2="70" stroke="#cbd5e1" stroke-width="1.5" />')
        svg.append(f'<circle cx="{x}" cy="70" r="11" fill="#ffffff" stroke="{stg["color"]}" stroke-width="2.5" />')
        svg.append(f'<text x="{x}" y="74" text-anchor="middle" font-family="system-ui, sans-serif" font-size="8.5" font-weight="800" fill="{stg["color"]}">{stg["num"]}</text>')
        
        card_x = x - 42
        svg.append(f'<rect x="{card_x}" y="{card_y}" width="84" height="40" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />')
        svg.append(f'<text x="{x}" y="{card_y + 11}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="7.5" font-weight="700" fill="#0f172a">{stg["name"]}</text>')
        svg.append(f'<text x="{x}" y="{card_y + 22}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="6.5" font-weight="500" fill="#64748b">{stg["sub"]}</text>')
        svg.append(f'<rect x="{x-28}" y="{card_y + 26}" width="56" height="10" rx="2" fill="#f1f5f9" />')
        svg.append(f'<text x="{x}" y="{card_y + 34}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="6" font-weight="700" fill="{stg["color"]}">{stg["tag"]}</text>')

    svg.append('</svg>')
    return "".join(svg)

# Define Modules Data
modules_data = [
    {
        "id": "1",
        "name": "System Admin & Governance",
        "slug": "/admin",
        "owner": "IT & Managing Director",
        "desc": "Central control center for user identity, URL-route RBAC permissions matrix, plant IP whitelisting, and immutable audit logs.",
        "flow": {
            "nodes": [
                {"id": "n1", "label": "Admin Provisioning", "sub": "Emp ID, Role & Dept", "x": 10, "y": 25, "w": 140, "h": 46, "type": "start"},
                {"id": "n2", "label": "Assign RBAC Routes", "sub": "Module & Tab matrix", "x": 170, "y": 25, "w": 140, "h": 46, "type": "process"},
                {"id": "n3", "label": "Security Policies", "sub": "IP Whitelist & 8h Expiry", "x": 330, "y": 25, "w": 145, "h": 46, "type": "process"},
                {"id": "n4", "label": "Dual-Mode Auth Gate", "sub": "Google OAuth / JWT", "x": 495, "y": 25, "w": 145, "h": 46, "type": "gate"},
                {"id": "n5", "label": "Audit Trail Logging", "sub": "Immutable append-only log", "x": 660, "y": 25, "w": 145, "h": 46, "type": "process"},
                {"id": "n6", "label": "Active Plant Session", "sub": "RBAC UI Handover", "x": 825, "y": 25, "w": 85, "h": 46, "type": "end"}
            ],
            "connections": [
                ("n1", "n2", ""), ("n2", "n3", ""), ("n3", "n4", ""), ("n4", "n5", "Authorized"), ("n5", "n6", "")
            ]
        },
        "kpis": [
            {"label": "Active Plant Sessions", "val": "24 Active", "badge": "Normal", "color": "emerald"},
            {"label": "Security Audits (24h)", "val": "0 High Risk", "badge": "100% Clean", "color": "blue"},
            {"label": "Failed Logins Locked", "val": "2 Blocked", "badge": "5-Attempt Rule", "color": "amber"},
            {"label": "Plant IP Compliance", "val": "100%", "badge": "MIDC Whitelist", "color": "emerald"}
        ],
        "table": {
            "title": "Live System Audit Trail",
            "headers": ["Timestamp", "User Account", "Department", "Action Executed", "Target Entity", "IP Address", "Status"],
            "rows": [
                ["10:04:12", "rajesh.k@machinehouse.in", "QUALITY", "STAGE_GATE_PASS", "PRJ-2026-001 (PDI Sign-off)", "192.168.1.45 (Bhosari)", "SUCCESS"],
                ["09:48:30", "arshad@machinehouse.in", "MANAGEMENT", "ECO_APPROVAL", "ECO-2026-004 (Spindle Shaft)", "192.168.1.10 (Office)", "SUCCESS"],
                ["09:22:15", "amit.p@machinehouse.in", "PURCHASE", "PO_RELEASE", "PO-2026-0142 (Siemens Motors)", "192.168.1.52 (Chakan)", "SUCCESS"],
                ["08:50:00", "unknown_guest@gmail.com", "EXTERNAL", "UNAUTHORIZED_LOGIN", "Authentication Route", "103.22.44.12 (External)", "BLOCKED"]
            ]
        },
        "widget": {
            "title": "Departmental User Distribution",
            "items": [
                {"name": "Production & Assembly", "val": "8 Users", "pct": "33%"},
                {"name": "Quality Assurance", "val": "5 Users", "pct": "21%"},
                {"name": "Design & Engineering", "val": "4 Users", "pct": "17%"},
                {"name": "Store & Logistics", "val": "4 Users", "pct": "17%"},
                {"name": "Purchase & Accounts", "val": "3 Users", "pct": "12%"}
            ]
        },
        "masters": [
            {
                "name": "User Master (users.xlsx)",
                "fields": [
                    {"name": "employeeId", "type": "String", "mand": "Yes", "rule": "Unique ID format MHT-EMP-XXX", "sample": "MHT-EMP-014"},
                    {"name": "fullName", "type": "String", "mand": "Yes", "rule": "Full legal name", "sample": "Rajesh Kulkarni"},
                    {"name": "email", "type": "String", "mand": "Yes", "rule": "Official corporate email domain", "sample": "rajesh.k@machinehouse.in"},
                    {"name": "department", "type": "Dropdown", "mand": "Yes", "rule": "DESIGN / PURCHASE / QUALITY / STORE / PRODUCTION", "sample": "QUALITY"},
                    {"name": "primaryRole", "type": "Dropdown", "mand": "Yes", "rule": "References Role Master", "sample": "QC_LEAD"},
                    {"name": "sessionRefreshExpiry", "type": "Dropdown", "mand": "Yes", "rule": "8_HOURS (Kiosk) / 7_DAYS / 30_DAYS", "sample": "8_HOURS"},
                    {"name": "ipRestricted", "type": "Boolean", "mand": "Yes", "rule": "True to restrict login to Plant IP whitelist", "sample": "TRUE"}
                ]
            },
            {
                "name": "Role Route RBAC Matrix (roles.xlsx)",
                "fields": [
                    {"name": "roleCode", "type": "String", "mand": "Yes", "rule": "Unique Role Identifier", "sample": "QC_LEAD"},
                    {"name": "roleName", "type": "String", "mand": "Yes", "rule": "Descriptive Role Title", "sample": "Quality Assurance Lead"},
                    {"name": "department", "type": "Dropdown", "mand": "Yes", "rule": "Target operational department", "sample": "QUALITY"},
                    {"name": "permittedTabRoutes", "type": "List", "mand": "Yes", "rule": "Granular URL routes (e.g. /quality/inward, /quality/pdi)", "sample": "/quality/inward, /quality/pdi"}
                ]
            }
        ]
    },
    {
        "id": "2",
        "name": "CRM, Enquiry & Costing",
        "slug": "/crm",
        "owner": "Sales & Business Development",
        "desc": "Lead capture, Technical Requirement Specification (TRS), engineering costing estimation, and 1-click transition to firm project.",
        "flow": {
            "nodes": [
                {"id": "n1", "label": "Customer Enquiry", "sub": "Capture Lead & Specs", "x": 10, "y": 25, "w": 140, "h": 46, "type": "start"},
                {"id": "n2", "label": "Draft TRS Document", "sub": "Wire gauge, speeds, bobbins", "x": 165, "y": 25, "w": 145, "h": 46, "type": "process"},
                {"id": "n3", "label": "Engineering Feasibility", "sub": "Design check & cycle time", "x": 325, "y": 25, "w": 145, "h": 46, "type": "process"},
                {"id": "n4", "label": "Costing Estimator", "sub": "RM + BO + Machining + Ops", "x": 485, "y": 25, "w": 145, "h": 46, "type": "process"},
                {"id": "n5", "label": "Commercial Quote Gate", "sub": "Client negotiation & CPO", "x": 645, "y": 25, "w": 145, "h": 46, "type": "gate"},
                {"id": "n6", "label": "1-Click Handover", "sub": "To Project Setup Spine", "x": 805, "y": 25, "w": 105, "h": 46, "type": "end"}
            ],
            "connections": [
                ("n1", "n2", ""), ("n2", "n3", ""), ("n3", "n4", ""), ("n4", "n5", ""), ("n5", "n6", "CPO Confirmed")
            ]
        },
        "kpis": [
            {"label": "Active Pipeline Value", "val": "₹ 4.82 Cr", "badge": "18 Enquiries", "color": "orange"},
            {"label": "Quotation Win Ratio", "val": "42.5%", "badge": "+3.2% vs target", "color": "emerald"},
            {"label": "Avg Quote Turnaround", "val": "3.2 Days", "badge": "SLA < 4 Days", "color": "blue"},
            {"label": "Advance Collected", "val": "₹ 85.0 L", "badge": "100% Cleared", "color": "emerald"}
        ],
        "table": {
            "title": "High-Priority Quotations & Enquiry Queue",
            "headers": ["Enquiry ID", "Customer Name", "Machine Classification", "Target Delivery", "Estimated Value", "Payment Terms", "Stage Status"],
            "rows": [
                ["ENQ-2026-089", "ABB Power Products Vadodara", "4-Spindle High Speed Coil Winder", "8 Weeks", "₹ 18,50,000", "30% Adv / 60% PI / 10% SAT", "WON - CONVERTING"],
                ["ENQ-2026-092", "BHEL Bhopal", "5-Axis CNC Precision Gantry", "12 Weeks", "₹ 42,00,000", "20% Adv / 70% PI / 10% SAT", "QUOTE_SUBMITTED"],
                ["ENQ-2026-094", "Schneider Electric Hyderabad", "Automated Wire Tensioner Test Bench", "6 Weeks", "₹ 9,20,000", "50% Adv / 40% PI / 10% SAT", "COSTING_REVIEW"],
                ["ENQ-2026-098", "Lucas TVS Chennai", "Dual-Spindle Stator Coil Winder", "10 Weeks", "₹ 24,00,000", "Standard Terms", "TRS_DRAFT"]
            ]
        },
        "widget": {
            "title": "Enquiry Conversion Funnel",
            "items": [
                {"name": "New Leads Received", "val": "18 Leads", "pct": "100%"},
                {"name": "TRS Technical Feasibility", "val": "14 Qualified", "pct": "78%"},
                {"name": "Costing & Commercial Quote", "val": "10 Sent", "pct": "55%"},
                {"name": "Customer PO Won (Firm)", "val": "4 Confirmed", "pct": "42%"}
            ]
        },
        "masters": [
            {
                "name": "Customer Master (customers.xlsx)",
                "fields": [
                    {"name": "customerCode", "type": "String", "mand": "Yes", "rule": "Unique ID format CUST-XXX", "sample": "CUST-001"},
                    {"name": "companyName", "type": "String", "mand": "Yes", "rule": "Registered corporate name", "sample": "ABB Power Products & Systems Ltd"},
                    {"name": "gstin", "type": "String", "mand": "Yes", "rule": "15-character valid Indian GSTIN", "sample": "24AABCA1122K1Z5"},
                    {"name": "billingAddress", "type": "String", "mand": "Yes", "rule": "Registered billing address with PIN", "sample": "Maneja Works, Vadodara - 390013"},
                    {"name": "contactPerson", "type": "String", "mand": "Yes", "rule": "Procurement officer name", "sample": "Rajesh Mehta"},
                    {"name": "contactEmail", "type": "String", "mand": "Yes", "rule": "Official procurement email", "sample": "procure@abb.com"},
                    {"name": "paymentTerms", "type": "Dropdown", "mand": "Yes", "rule": "Commercial milestone terms", "sample": "30% Advance, 60% PI, 10% SAT"}
                ]
            },
            {
                "name": "Lead & TRS Specification Master (leads.xlsx)",
                "fields": [
                    {"name": "leadCode", "type": "String", "mand": "Yes", "rule": "Unique Enquiry ID format ENQ-YYYY-XXX", "sample": "ENQ-2026-089"},
                    {"name": "customerCode", "type": "Dropdown", "mand": "Yes", "rule": "References Customer Master", "sample": "CUST-001"},
                    {"name": "targetMachineType", "type": "Dropdown", "mand": "Yes", "rule": "Coil Winder / CNC Gantry / Tensioner", "sample": "4-Spindle High Speed Coil Winder"},
                    {"name": "wireGaugeRange", "type": "String", "mand": "Yes", "rule": "Wire technical range specification", "sample": "0.15 mm to 2.5 mm Copper Wire"}
                ]
            }
        ]
    },
    {
        "id": "3",
        "name": "Project Setup — The Central Spine",
        "slug": "/project-setup",
        "owner": "Project Manager & Operations Head",
        "desc": "Establishes the permanent lifecycle reference spine (PRJ-XXXX / WO-XXXX) governing all downstream engineering, purchasing, and trials.",
        "flow": {
            "nodes": [
                {"id": "n1", "label": "Customer PO Inflow", "sub": "Commercial & Advance OK", "x": 10, "y": 25, "w": 140, "h": 46, "type": "start"},
                {"id": "n2", "label": "Generate PRJ / WO ID", "sub": "PRJ-2026-001 Spine", "x": 165, "y": 25, "w": 145, "h": 46, "type": "process"},
                {"id": "n3", "label": "Milestone Baseline", "sub": "10-Stage Gantt Schedule", "x": 325, "y": 25, "w": 145, "h": 46, "type": "process"},
                {"id": "n4", "label": "Kickoff Sign-off Gate", "sub": "PM & Technical Team assigned", "x": 485, "y": 25, "w": 145, "h": 46, "type": "gate"},
                {"id": "n5", "label": "Broadcast Lifecycle Spine", "sub": "Design, Purchase, Store, Prod", "x": 645, "y": 25, "w": 150, "h": 46, "type": "process"},
                {"id": "n6", "label": "Operations Handover", "sub": "To Design Module", "x": 810, "y": 25, "w": 100, "h": 46, "type": "end"}
            ],
            "connections": [
                ("n1", "n2", ""), ("n2", "n3", ""), ("n3", "n4", ""), ("n4", "n5", "Kickoff Approved"), ("n5", "n6", "")
            ]
        },
        "kpis": [
            {"label": "Active Plant Projects", "val": "12 Machines", "badge": "Bhosari & Chakan", "color": "orange"},
            {"label": "On-Time Milestone Index", "val": "91.6%", "badge": "+2.4% vs target", "color": "emerald"},
            {"label": "Critical Path Bottlenecks", "val": "1 Delayed", "badge": "Needs Attention", "color": "red"},
            {"label": "Average ETO Lead Time", "val": "9.4 Weeks", "badge": "Industry Benchmark", "color": "blue"}
        ],
        "table": {
            "title": "Active Project Execution Spine (Master Work Orders)",
            "headers": ["Project ID", "Work Order", "Customer Name", "Machine Classification", "Current Stage Gate", "Committed Delivery", "Overall Health"],
            "rows": [
                ["PRJ-2026-001", "WO-2026-001", "ABB Power Products", "4-Spindle High Speed Coil Winder", "SUB_ASSY (Sub-assembly Trial)", "2026-05-15", "ON_TRACK"],
                ["PRJ-2026-002", "WO-2026-002", "BHEL Bhopal", "5-Axis CNC Coil Forming Center", "PROCURE (PO Placement)", "2026-06-30", "ON_TRACK"],
                ["PRJ-2026-003", "WO-2026-003", "Schneider Electric", "Rotary Turret Indexing Station", "DESIGN_BOM (Drawing Release)", "2026-05-05", "DELAY_RISK"],
                ["PRJ-2026-004", "WO-2026-004", "Lucas TVS", "Dual Spindle Automatic Winder", "TRIAL_RUN (Dry Run Testing)", "2026-04-20", "ON_TRACK"]
            ]
        },
        "widget": {
            "title": "Plant Machine Stage Distribution",
            "items": [
                {"name": "Stage 2: Design & CAD Modeling", "val": "2 Machines", "pct": "17%"},
                {"name": "Stage 3: Procurement & Inward QC", "val": "3 Machines", "pct": "25%"},
                {"name": "Stage 4: Sub-Assembly & Panel Wiring", "val": "4 Machines", "pct": "33%"},
                {"name": "Stage 5: Machine Trials & Testing", "val": "2 Machines", "pct": "17%"},
                {"name": "Stage 6: Zero-Snag Dispatch", "val": "1 Machine", "pct": "8%"}
            ]
        },
        "masters": [
            {
                "name": "Project Master (projects.xlsx)",
                "fields": [
                    {"name": "projectId", "type": "String", "mand": "Yes", "rule": "Unique ID format PRJ-YYYY-XXX", "sample": "PRJ-2026-001"},
                    {"name": "workOrderNumber", "type": "String", "mand": "Yes", "rule": "Plant WO format WO-YYYY-XXX", "sample": "WO-2026-001"},
                    {"name": "customerCode", "type": "Dropdown", "mand": "Yes", "rule": "References Customer Master", "sample": "CUST-001 (ABB)"},
                    {"name": "machineModel", "type": "String", "mand": "Yes", "rule": "Full machine model name", "sample": "Automated 4-Spindle High Speed Coil Winder"},
                    {"name": "contractedDeliveryDate", "type": "Date", "mand": "Yes", "rule": "Committed dispatch date", "sample": "2026-05-15"},
                    {"name": "projectManager", "type": "Dropdown", "mand": "Yes", "rule": "Assigned internal project head", "sample": "Rajesh Kulkarni"}
                ]
            },
            {
                "name": "Standard Stage Master (stages.xlsx)",
                "fields": [
                    {"name": "stageSequence", "type": "Number", "mand": "Yes", "rule": "Sequence 1 to 10", "sample": "1, 2, 3... 10"},
                    {"name": "stageCode", "type": "String", "mand": "Yes", "rule": "KICKOFF / DESIGN_BOM / PROCURE / SUB_ASSY / TRIAL", "sample": "DESIGN_BOM"},
                    {"name": "mandatorySignoffRole", "type": "Dropdown", "mand": "Yes", "rule": "Role authorized to approve stage", "sample": "DES_ENG"}
                ]
            }
        ]
    },
    {
        "id": "4",
        "name": "Engineering, CAD & Hierarchical BOM",
        "slug": "/design",
        "owner": "Head of Design & Engineering",
        "desc": "Constructs 3-level hierarchical BOMs, manages CAD/drawing distribution, and enforces automated ECO freeze rules.",
        "flow": {
            "nodes": [
                {"id": "n1", "label": "TRS Specs Confirmed", "sub": "Engineering baseline", "x": 10, "y": 25, "w": 140, "h": 46, "type": "start"},
                {"id": "n2", "label": "3D CAD & 2D Drawings", "sub": ".step, .dwg & PDF with GD&T", "x": 165, "y": 25, "w": 145, "h": 46, "type": "process"},
                {"id": "n3", "label": "3-Level Hierarchical BOM", "sub": "Machine → Sub-Assy → Parts", "x": 325, "y": 25, "w": 145, "h": 46, "type": "process"},
                {"id": "n4", "label": "BOM Release Gate", "sub": "Drawing sign-off & lock", "x": 485, "y": 25, "w": 145, "h": 46, "type": "gate"},
                {"id": "n5", "label": "Automated ECO Freeze", "sub": "Locks active POs & Stock", "x": 645, "y": 25, "w": 145, "h": 46, "type": "freeze"},
                {"id": "n6", "label": "Demand Broadcast", "sub": "To Purchase Module", "x": 805, "y": 25, "w": 105, "h": 46, "type": "end"}
            ],
            "connections": [
                ("n1", "n2", ""), ("n2", "n3", ""), ("n3", "n4", "Drawings OK"), ("n4", "n6", "BOM Released"), ("n4", "n5", "ECO Raised")
            ]
        },
        "kpis": [
            {"label": "BOM Release Progress", "val": "98.4%", "badge": "122/124 Parts Released", "color": "emerald"},
            {"label": "Active Open ECOs", "val": "2 Open", "badge": "PO Lines Frozen", "color": "amber"},
            {"label": "Avg Drawing Revisions", "val": "1.4 / Part", "badge": "Within ISO Tolerance", "color": "blue"},
            {"label": "Standard BO Ratio", "val": "68%", "badge": "High Standardization", "color": "emerald"}
        ],
        "table": {
            "title": "3-Level Hierarchical BOM Explorer (PRJ-2026-001)",
            "headers": ["BOM Level", "Item Code", "Item Description", "Category", "Qty/Mch", "UOM", "Drawing / Specification No", "Status"],
            "rows": [
                ["Level 0", "ASY-CW-400", "4-Spindle High Speed Coil Winder", "FIN_MACH", "1", "NOS", "GA-MHT-CW400-00", "RELEASED"],
                ["Level 1", "SA-WND-HEAD", "High-Torque Precision Winding Head Assembly", "SUB_ASSY", "4", "SET", "SUB-MHT-WH-01", "RELEASED"],
                ["Level 2", "CMP-SFT-001", "Main Spindle Shaft Hardened & Ground", "MACH_PART", "4", "NOS", "DWG-MHT-001-R3", "RELEASED"],
                ["Level 2", "BO-SRV-750W", "750W AC Servo Motor with Brake (Siemens)", "BO_ELEC", "4", "SET", "1FK7042-2AF71-1QA0", "RELEASED"],
                ["Level 2", "BO-BRG-6205", "Deep Groove Ball Bearing 25mm ID (SKF)", "BO_MECH", "8", "NOS", "SKF 6205-2RSH", "RELEASED"],
                ["Level 1", "SA-TNS-UNIT", "Closed-Loop Servo Wire Tensioner Unit", "SUB_ASSY", "4", "SET", "SUB-MHT-TU-02", "FROZEN_ECO"]
            ]
        },
        "widget": {
            "title": "Engineering Change Order (ECO) Impact",
            "items": [
                {"name": "ECO-2026-004: Spindle Bearing Tolerance", "val": "PO-0142 Frozen", "pct": "High"},
                {"name": "ECO-2026-005: Tensioner Arm Bracket", "val": "Stock Reserved", "pct": "Medium"},
                {"name": "Drawing Watermark Protection", "val": "100% Active", "pct": "100%"},
                {"name": "CAD File Whitelist (.step / .dwg / .pdf)", "val": "Enforced", "pct": "100%"}
            ]
        },
        "masters": [
            {
                "name": "3-Level BOM Master (bom_template.xlsx)",
                "fields": [
                    {"name": "bomLevel", "type": "Dropdown", "mand": "Yes", "rule": "0 (Machine) / 1 (Sub-Assembly) / 2 (Part)", "sample": "Level 1"},
                    {"name": "parentPartCode", "type": "String", "mand": "Conditional", "rule": "Parent Assembly code (Blank for Level 0)", "sample": "ASY-CW-400"},
                    {"name": "itemCode", "type": "Dropdown", "mand": "Yes", "rule": "References Component / BO Master", "sample": "SA-WND-HEAD"},
                    {"name": "qtyPerMachine", "type": "Number", "mand": "Yes", "rule": "Quantity required per machine", "sample": "4"},
                    {"name": "uom", "type": "Dropdown", "mand": "Yes", "rule": "NOS / SET / KG / MTR", "sample": "SET"}
                ]
            },
            {
                "name": "Drawing & CAD Document Master (drawings.xlsx)",
                "fields": [
                    {"name": "drawingNumber", "type": "String", "mand": "Yes", "rule": "Standard format DWG-MHT-XXX-RX", "sample": "DWG-MHT-001-R3"},
                    {"name": "drawingRevision", "type": "String", "mand": "Yes", "rule": "Revision tag R0, R1, R2...", "sample": "R3"},
                    {"name": "cadFileType", "type": "Dropdown", "mand": "Yes", "rule": ".step / .dwg / .dxf / .pdf", "sample": ".step / .pdf"}
                ]
            }
        ]
    },
    {
        "id": "5",
        "name": "Purchase, Vendor Sourcing & Demands",
        "slug": "/purchase",
        "owner": "Head of Purchase & Sourcing",
        "desc": "Calculates BOM net purchase demand (Gross BOM minus Free Store Stock), manages vendor approvals, and tracks overdue deliveries.",
        "flow": {
            "nodes": [
                {"id": "n1", "label": "BOM Release Event", "sub": "From Design Module", "x": 10, "y": 25, "w": 140, "h": 46, "type": "start"},
                {"id": "n2", "label": "BOM Net Demand Engine", "sub": "Gross BOM - Free Stock", "x": 165, "y": 25, "w": 145, "h": 46, "type": "process"},
                {"id": "n3", "label": "Auto-Reserve Stock", "sub": "To PRJ-XXXX (Zero PO)", "x": 325, "y": 25, "w": 145, "h": 46, "type": "process"},
                {"id": "n4", "label": "Purchase Requisitions", "sub": "Net Deficit Consolidation", "x": 485, "y": 25, "w": 145, "h": 46, "type": "process"},
                {"id": "n5", "label": "Multi-Tier PO Approval", "sub": "Purchase Head / Director", "x": 645, "y": 25, "w": 145, "h": 46, "type": "gate"},
                {"id": "n6", "label": "Release PO to Vendor", "sub": "Track Inward Delivery", "x": 805, "y": 25, "w": 105, "h": 46, "type": "end"}
            ],
            "connections": [
                ("n1", "n2", ""), ("n2", "n3", "Stock Exists"), ("n2", "n4", "Stock Deficit"), ("n4", "n5", ""), ("n5", "n6", "PO Approved")
            ]
        },
        "kpis": [
            {"label": "Active Committed PO Spend", "val": "₹ 62.4 Lakhs", "badge": "28 Active POs", "color": "orange"},
            {"label": "Overdue PO Deliveries", "val": "3 POs", "badge": "Expediting Active", "color": "red"},
            {"label": "Vendor OTIF Score", "val": "94.2%", "badge": "+1.8% Quality Pass", "color": "emerald"},
            {"label": "BOM Net Demand Covered", "val": "98.0%", "badge": "120/124 Parts Covered", "color": "blue"}
        ],
        "table": {
            "title": "Vendor Procurement & Overdue Delivery Queue",
            "headers": ["PO Number", "Project Spine", "Supplier Name", "Item Description", "Order Qty", "Delivery Due Date", "Overdue Aging", "PO Status"],
            "rows": [
                ["PO-2026-0142", "PRJ-2026-001", "Siemens Automation India", "750W Servo Motor with Brake", "4 SET", "2026-03-23", "3 Days Overdue", "FOLLOWUP_ACTIVE"],
                ["PO-2026-0145", "PRJ-2026-001", "SKF India Bearings Ltd", "Deep Groove Ball Bearing 6205", "8 NOS", "2026-03-20", "5 Days Overdue", "DISPATCHED_IN_TRANSIT"],
                ["PO-2026-0150", "PRJ-2026-002", "Hiwin Precision Motion", "Linear Guide Rails 25x1200mm", "12 SET", "2026-04-05", "On-Schedule", "APPROVED_SENT"],
                ["PO-2026-0154", "PRJ-2026-003", "Festo Pneumatics Pvt Ltd", "5/2 Way Solenoid Valves 24VDC", "6 NOS", "2026-04-12", "On-Schedule", "PENDING_HOD_APPROVAL"]
            ]
        },
        "widget": {
            "title": "Procurement Spend by Category",
            "items": [
                {"name": "Bought-Out Electrical & Drives", "val": "₹ 24.8 L", "pct": "40%"},
                {"name": "Bought-Out Mechanical & Motion", "val": "₹ 18.2 L", "pct": "29%"},
                {"name": "Raw Material Steels & Alloys", "val": "₹ 11.5 L", "pct": "18%"},
                {"name": "Pneumatics & Fluid Power", "val": "₹ 7.9 L", "pct": "13%"}
            ]
        },
        "masters": [
            {
                "name": "Vendor Master (vendors.xlsx)",
                "fields": [
                    {"name": "vendorCode", "type": "String", "mand": "Yes", "rule": "Unique ID format VND-XXX", "sample": "VND-001"},
                    {"name": "vendorName", "type": "String", "mand": "Yes", "rule": "Registered supplier name", "sample": "Siemens Automation India Ltd"},
                    {"name": "category", "type": "Dropdown", "mand": "Yes", "rule": "ELECTRICAL / MECHANICAL / PNEUMATICS / RM", "sample": "ELECTRICAL"},
                    {"name": "ratingScore", "type": "Number", "mand": "Yes", "rule": "1.0 to 5.0 OTIF rating", "sample": "4.8"},
                    {"name": "gstin", "type": "String", "mand": "Yes", "rule": "15-character valid GSTIN", "sample": "27AABCS1429B1Z1"},
                    {"name": "creditPeriodDays", "type": "Number", "mand": "Yes", "rule": "Agreed credit terms in days", "sample": "45"}
                ]
            },
            {
                "name": "Item Purchase Specs Master (item_specs.xlsx)",
                "fields": [
                    {"name": "itemCode", "type": "Dropdown", "mand": "Yes", "rule": "References Component / BO Master", "sample": "BO-SRV-750W"},
                    {"name": "preferredVendor", "type": "Dropdown", "mand": "Yes", "rule": "References Vendor Master", "sample": "VND-001 (Siemens)"},
                    {"name": "standardLeadDays", "type": "Number", "mand": "Yes", "rule": "Lead time in days", "sample": "21"},
                    {"name": "hsnCode", "type": "String", "mand": "Yes", "rule": "8-digit HSN code", "sample": "85015290"}
                ]
            }
        ]
    },
    {
        "id": "6",
        "name": "Quality Assurance & Inspections",
        "slug": "/quality",
        "owner": "Head of Quality Assurance",
        "desc": "3-Tier QC architecture: Inward QC (quarantine hold), Assembly In-line Stage Inspections, and Pre-Delivery Inspection (PDI).",
        "flow": {
            "nodes": [
                {"id": "n1", "label": "Security Gate Entry", "sub": "Holding slip generated", "x": 10, "y": 25, "w": 140, "h": 46, "type": "start"},
                {"id": "n2", "label": "Quarantine Yard Hold", "sub": "BIN-QC-01 Staging", "x": 165, "y": 25, "w": 145, "h": 46, "type": "process"},
                {"id": "n3", "label": "Inward QC (IQC) Gate", "sub": "Verify Drawing & MTC", "x": 325, "y": 25, "w": 145, "h": 46, "type": "gate"},
                {"id": "n4", "label": "Disposition Routing", "sub": "Accepted / Reject / Rework", "x": 485, "y": 25, "w": 145, "h": 46, "type": "process"},
                {"id": "n5", "label": "Assembly & PDI Gate", "sub": "In-line checks & trials", "x": 645, "y": 25, "w": 145, "h": 46, "type": "gate"},
                {"id": "n6", "label": "Signed PDI Certificate", "sub": "Unlocks Dispatch Pass", "x": 805, "y": 25, "w": 105, "h": 46, "type": "end"}
            ],
            "connections": [
                ("n1", "n2", ""), ("n2", "n3", ""), ("n3", "n4", "QC Inspected"), ("n4", "n5", "Store Handover"), ("n5", "n6", "Zero Snags")
            ]
        },
        "kpis": [
            {"label": "Inward QC Turnaround", "val": "4.8 Hours", "badge": "SLA < 8 Hours", "color": "emerald"},
            {"label": "First Time Pass Rate (FTPR)", "val": "96.8%", "badge": "+1.2% this month", "color": "emerald"},
            {"label": "Quarantine Holding Lots", "val": "3 Lots", "badge": "Awaiting Inspection", "color": "amber"},
            {"label": "PDI Zero-Snag Index", "val": "85.0%", "badge": "Pre-Dispatch First Pass", "color": "blue"}
        ],
        "table": {
            "title": "Pending Inward QC Quarantine Queue (Holding Bay)",
            "headers": ["Gate Entry #", "Vendor Supplier", "Item Description", "Challan Qty", "Arrival Timestamp", "Aging in Bay", "Inspection Status"],
            "rows": [
                ["GE-2026-0312", "Siemens Automation India", "750W AC Servo Motor with Brake", "4 SET", "Today 08:30 AM", "3.5 Hours", "INSPECTION_IN_PROGRESS"],
                ["GE-2026-0314", "Festo Pneumatics Pvt Ltd", "Micro Cylinders DSNU-16-50", "4 NOS", "Today 09:15 AM", "2.8 Hours", "PENDING_MTC_VERIFICATION"],
                ["GE-2026-0318", "Precision CNC Job Works", "Main Spindle Shaft Ground", "4 NOS", "Today 10:00 AM", "2.0 Hours", "QUEUED_FOR_MICROMETER"],
                ["GE-2026-0305", "Alloy Steel Corporation", "EN19 Alloy Steel Round Bar 75mm", "220 KG", "Yesterday 04:30 PM", "18.5 Hours", "ACCEPTED_CLEARED_TO_STORE"]
            ]
        },
        "widget": {
            "title": "Supplier Quality Defect Causes (Pareto)",
            "items": [
                {"name": "Dimensional Deviation (OD / Bore)", "val": "45%", "pct": "45%"},
                {"name": "Surface Finish Roughness > Ra limit", "val": "25%", "pct": "25%"},
                {"name": "Missing Material Test Certificate (MTC)", "val": "15%", "pct": "15%"},
                {"name": "Core Hardness Below Spec Range", "val": "15%", "pct": "15%"}
            ]
        },
        "masters": [
            {
                "name": "Quality Inspection Parameter Master (qc_parameters.xlsx)",
                "fields": [
                    {"name": "parameterCode", "type": "String", "mand": "Yes", "rule": "Unique ID format QC-PAR-XXX", "sample": "QC-PAR-012"},
                    {"name": "parameterName", "type": "String", "mand": "Yes", "rule": "Inspection attribute name", "sample": "Spindle Bearing Journal Diameter"},
                    {"name": "inspectionMethod", "type": "Dropdown", "mand": "Yes", "rule": "VERNIER / MICROMETER / CMM / HARDNESS", "sample": "MICROMETER"},
                    {"name": "nominalValue", "type": "Number", "mand": "Yes", "rule": "Target dimension", "sample": "25.000"},
                    {"name": "upperTolerance", "type": "Number", "mand": "Yes", "rule": "Positive tolerance", "sample": "+0.009"},
                    {"name": "lowerTolerance", "type": "Number", "mand": "Yes", "rule": "Negative tolerance", "sample": "-0.000"}
                ]
            },
            {
                "name": "Defect Code Master (defect_codes.xlsx)",
                "fields": [
                    {"name": "defectCode", "type": "String", "mand": "Yes", "rule": "Format DEF-XXX-XXX", "sample": "DEF-DIM-US"},
                    {"name": "defectDescription", "type": "String", "mand": "Yes", "rule": "Description of defect", "sample": "Dimension Out of Spec (Undersized)"},
                    {"name": "severityLevel", "type": "Dropdown", "mand": "Yes", "rule": "CRITICAL / MAJOR / MINOR", "sample": "CRITICAL"}
                ]
            }
        ]
    },
    {
        "id": "7",
        "name": "Store, Inventory & Hard Allocations",
        "slug": "/store",
        "owner": "Store In-charge & Logistics Lead",
        "desc": "Tracks 4 inventory states (Ordered, In-QC, Accepted, Issued) and locks materials to target project IDs to block unauthorized diversion.",
        "flow": {
            "nodes": [
                {"id": "n1", "label": "QC Acceptance Slip", "sub": "From Quality Module", "x": 10, "y": 25, "w": 140, "h": 46, "type": "start"},
                {"id": "n2", "label": "Bin Storage Assignment", "sub": "Racks BIN-A101 / BIN-B205", "x": 165, "y": 25, "w": 145, "h": 46, "type": "process"},
                {"id": "n3", "label": "Hard Project Lock Gate", "sub": "Reserved to PRJ-XXXX", "x": 325, "y": 25, "w": 145, "h": 46, "type": "gate"},
                {"id": "n4", "label": "Diversion Block Enforced", "sub": "Unauthorized transfer halted", "x": 485, "y": 25, "w": 145, "h": 46, "type": "freeze"},
                {"id": "n5", "label": "Project Kitting Assembly", "sub": "Material Issue Slip (MIS)", "x": 645, "y": 25, "w": 145, "h": 46, "type": "process"},
                {"id": "n6", "label": "Issue to Assembly Bay", "sub": "Moved to Issued Bucket", "x": 805, "y": 25, "w": 105, "h": 46, "type": "end"}
            ],
            "connections": [
                ("n1", "n2", ""), ("n2", "n3", ""), ("n3", "n4", "Diversion Attempted"), ("n3", "n5", "Kitting Triggered"), ("n5", "n6", "")
            ]
        },
        "kpis": [
            {"label": "Total Inventory Valuation", "val": "₹ 1.42 Cr", "badge": "Accepted Stock", "color": "orange"},
            {"label": "Hard-Allocated Proportion", "val": "82.5%", "badge": "Committed to Active PRJs", "color": "blue"},
            {"label": "Quarantine Holding Value", "val": "₹ 6.8 Lakhs", "badge": "3 Lots in IQC", "color": "amber"},
            {"label": "Missing Parts / Stockouts", "val": "0 Parts", "badge": "Assembly Kits Ready", "color": "emerald"}
        ],
        "table": {
            "title": "4-Bucket Inventory Ledger & Project Allocations",
            "headers": ["Item Code", "Item Description", "Category", "Warehouse Bin", "Ordered", "In-QC", "Accepted", "Issued", "Allocation Status"],
            "rows": [
                ["BO-SRV-750W", "750W AC Servo Motor with Brake", "BO_ELEC", "BIN-B205 (Aisle B)", "4 SET", "4 SET", "8 SET", "4 SET", "HARD_LOCKED (PRJ-2026-001)"],
                ["BO-GBX-010", "Planetary Gearbox 10:1 Ratio", "BO_MECH", "BIN-B206 (Aisle B)", "2 NOS", "0 NOS", "4 NOS", "2 NOS", "HARD_LOCKED (PRJ-2026-001)"],
                ["BO-LNR-25", "Linear Rail Guideway 25x1200mm", "BO_MECH", "BIN-B301 (Aisle B)", "12 SET", "0 SET", "12 SET", "6 SET", "HARD_LOCKED (PRJ-2026-002)"],
                ["RM-EN19-075", "EN19 Alloy Steel Round Bar 75mm", "RAW_MAT", "BIN-A101 (Aisle A)", "0 KG", "0 KG", "220 KG", "150 KG", "UNRESERVED (Free Stock 70 KG)"]
            ]
        },
        "widget": {
            "title": "Project Kitting Readiness Progress",
            "items": [
                {"name": "PRJ-2026-001 (ABB 4-Spindle Winder)", "val": "94% Kitted", "pct": "94%"},
                {"name": "PRJ-2026-002 (BHEL 5-Axis Gantry)", "val": "82% Kitted", "pct": "82%"},
                {"name": "PRJ-2026-003 (Schneider Turret)", "val": "65% Kitted", "pct": "65%"},
                {"name": "PRJ-2026-004 (Lucas TVS Dual Winder)", "val": "100% Kitted", "pct": "100%"}
            ]
        },
        "masters": [
            {
                "name": "Warehouse Location & Bin Master (locations.xlsx)",
                "fields": [
                    {"name": "locationCode", "type": "String", "mand": "Yes", "rule": "Unique ID format LOC-XXX", "sample": "LOC-002"},
                    {"name": "plantName", "type": "Dropdown", "mand": "Yes", "rule": "Unit 1 Bhosari / Unit 2 Chakan", "sample": "Unit 1 Bhosari"},
                    {"name": "warehouseType", "type": "Dropdown", "mand": "Yes", "rule": "RAW_MATERIAL / BOUGHT_OUT / QUARANTINE", "sample": "BOUGHT_OUT"},
                    {"name": "rackNumber", "type": "String", "mand": "Yes", "rule": "Racking identifier", "sample": "R-04"},
                    {"name": "binNumber", "type": "String", "mand": "Yes", "rule": "Physical bin barcode identifier", "sample": "BIN-B205"}
                ]
            },
            {
                "name": "Project Hard Allocation Ledger (stock_allocations.xlsx)",
                "fields": [
                    {"name": "allocationId", "type": "String", "mand": "Yes", "rule": "Unique ID format ALC-XXXXX", "sample": "ALC-00142"},
                    {"name": "projectId", "type": "Dropdown", "mand": "Yes", "rule": "Target Project Spine PRJ-XXXX", "sample": "PRJ-2026-001"},
                    {"name": "itemCode", "type": "Dropdown", "mand": "Yes", "rule": "References Component / BO Master", "sample": "BO-SRV-750W"},
                    {"name": "allocatedQty", "type": "Number", "mand": "Yes", "rule": "Hard reserved quantity", "sample": "4"},
                    {"name": "allocationStatus", "type": "Dropdown", "mand": "Yes", "rule": "LOCKED / TRANSFERRED / ISSUED", "sample": "LOCKED"}
                ]
            }
        ]
    },
    {
        "id": "8",
        "name": "Production, Work Centers & Machine Trials",
        "slug": "/production-trial",
        "owner": "Head of Production & Assembly",
        "desc": "Configures assembly bay routings, stage gate sign-offs, and continuous 4-hour machine trials with snag rectification tracking.",
        "flow": {
            "nodes": [
                {"id": "n1", "label": "Kitted Material Issue", "sub": "From Store Module", "x": 10, "y": 25, "w": 140, "h": 46, "type": "start"},
                {"id": "n2", "label": "Mechanical Base Assembly", "sub": "Frame leveling & gantry", "x": 165, "y": 25, "w": 145, "h": 46, "type": "process"},
                {"id": "n3", "label": "Electrical Panel Wiring", "sub": "PLC, Drives & Interlocks", "x": 325, "y": 25, "w": 145, "h": 46, "type": "process"},
                {"id": "n4", "label": "Power-On & Safety Gate", "sub": "Foreman & Lead Sign-off", "x": 485, "y": 25, "w": 145, "h": 46, "type": "gate"},
                {"id": "n5", "label": "Dry & Wet Running Trials", "sub": "Continuous 4-hour test", "x": 645, "y": 25, "w": 145, "h": 46, "type": "process"},
                {"id": "n6", "label": "Trial Snag Clearance", "sub": "To Dispatch Gate Pass", "x": 805, "y": 25, "w": 105, "h": 46, "type": "end"}
            ],
            "connections": [
                ("n1", "n2", ""), ("n2", "n3", ""), ("n3", "n4", ""), ("n4", "n5", "Safety Sign-off"), ("n5", "n6", "Zero Snags")
            ]
        },
        "kpis": [
            {"label": "Trial First Pass Yield", "val": "88.5%", "badge": "+3.5% vs baseline", "color": "emerald"},
            {"label": "Active Open Snags", "val": "4 Snags", "badge": "All Under Rectification", "color": "amber"},
            {"label": "Avg Snag Clearance Time", "val": "6.2 Hours", "badge": "SLA < 8 Hours", "color": "blue"},
            {"label": "Assembly Schedule Adherence", "val": "94.0%", "badge": "On Schedule", "color": "emerald"}
        ],
        "table": {
            "title": "Shopfloor Work Center & Machine Test Stand Matrix",
            "headers": ["Work Center Bay", "Dedicated Function", "Active Machine", "Stage In-Progress", "Assigned Foreman", "Running Hours", "Status"],
            "rows": [
                ["WC-BAY-01 (Bhosari)", "Main Frame & Gantry Assembly", "PRJ-2026-003", "Base Frame Alignment", "Santosh Shinde", "18 Hours", "ACTIVE_ASSEMBLY"],
                ["WC-BAY-02 (Bhosari)", "Precision Sub-Assembly Bay", "PRJ-2026-002", "Servo Tensioner Assembly", "Prakash Patil", "24 Hours", "ACTIVE_ASSEMBLY"],
                ["WC-BAY-03 (Bhosari)", "Electrical & Control Panels", "PRJ-2026-001", "Panel Wire Dressing", "Nitin More", "36 Hours", "ACTIVE_WIRING"],
                ["WC-BAY-04 (Chakan)", "Machine Trial & Testing Stand", "PRJ-2026-004", "Continuous 4h Dry Run", "Suresh Jadhav", "3.2 / 4.0 Hours", "TESTING_IN_PROGRESS"]
            ]
        },
        "widget": {
            "title": "Active Assembly Snags by Severity",
            "items": [
                {"name": "Critical Snags (Block Trials)", "val": "0 Critical", "pct": "0%"},
                {"name": "Major Snags (Functional Rectification)", "val": "2 Major", "pct": "50%"},
                {"name": "Minor Snags (Cosmetic / Wire Tidy)", "val": "2 Minor", "pct": "50%"},
                {"name": "Snag Clearance Turnaround SLA", "val": "6.2 Hours", "pct": "100%"}
            ]
        },
        "masters": [
            {
                "name": "Work Center & Bay Master (work_centers.xlsx)",
                "fields": [
                    {"name": "workCenterCode", "type": "String", "mand": "Yes", "rule": "Unique ID format WC-BAY-XX", "sample": "WC-BAY-04"},
                    {"name": "bayName", "type": "String", "mand": "Yes", "rule": "Descriptive bay title", "sample": "Machine Trial & Testing Stand"},
                    {"name": "plantLocation", "type": "Dropdown", "mand": "Yes", "rule": "Unit 1 Bhosari / Unit 2 Chakan", "sample": "Unit 2 Chakan"},
                    {"name": "capacity", "type": "String", "mand": "Yes", "rule": "Max machines / units in bay", "sample": "2 Machine Test Stands"}
                ]
            },
            {
                "name": "Assembly Stage Protocol Master (assembly_stages.xlsx)",
                "fields": [
                    {"name": "stageSequence", "type": "String", "mand": "Yes", "rule": "Sequence ID format STG-XX", "sample": "STG-60"},
                    {"name": "stageName", "type": "String", "mand": "Yes", "rule": "Stage title", "sample": "Machine Dry Run (Continuous 4 Hours)"},
                    {"name": "targetWorkCenter", "type": "Dropdown", "mand": "Yes", "rule": "References Work Center Master", "sample": "WC-BAY-04"},
                    {"name": "standardManHours", "type": "Number", "mand": "Yes", "rule": "Planned execution hours", "sample": "12"}
                ]
            }
        ]
    },
    {
        "id": "9",
        "name": "Dispatch, Packing & Logistics",
        "slug": "/dispatch",
        "owner": "Plant Head & Dispatch Manager",
        "desc": "Enforces the absolute zero-snag rule (100% snags resolved before gate pass unlocks), packing crate lists, and shipping dossier verification.",
        "flow": {
            "nodes": [
                {"id": "n1", "label": "Trial Run Complete", "sub": "From Production Module", "x": 10, "y": 25, "w": 140, "h": 46, "type": "start"},
                {"id": "n2", "label": "Packaging & Crating", "sub": "VCI vacuum wooden box", "x": 165, "y": 25, "w": 145, "h": 46, "type": "process"},
                {"id": "n3", "label": "Zero-Snag Block Gate", "sub": "Any open snag halts exit", "x": 325, "y": 25, "w": 145, "h": 46, "type": "freeze"},
                {"id": "n4", "label": "Commercial Clearance", "sub": "Advance & PI payment check", "x": 485, "y": 25, "w": 145, "h": 46, "type": "gate"},
                {"id": "n5", "label": "Shipping Dossier Compiled", "sub": "PDI + Manual + E-Way Bill", "x": 645, "y": 25, "w": 145, "h": 46, "type": "process"},
                {"id": "n6", "label": "Pre-Dispatch Gate Pass", "sub": "Truck Security Exit", "x": 805, "y": 25, "w": 105, "h": 46, "type": "end"}
            ],
            "connections": [
                ("n1", "n2", ""), ("n2", "n3", "Snag Scan"), ("n3", "n4", "Zero Snags Verified"), ("n4", "n5", "Payment OK"), ("n5", "n6", "Dossier Complete")
            ]
        },
        "kpis": [
            {"label": "On-Time Plant Dispatch", "val": "93.8%", "badge": "+1.8% vs benchmark", "color": "emerald"},
            {"label": "Ready-to-Ship Machines", "val": "2 Machines", "badge": "Crated & Sealed", "color": "blue"},
            {"label": "Zero-Snag Gate Pass Pass", "val": "100%", "badge": "Zero Exceptions Rule", "color": "emerald"},
            {"label": "Average Transit Lead Time", "val": "2.4 Days", "badge": "V-Trans Logistics", "color": "blue"}
        ],
        "table": {
            "title": "Ready for Dispatch Checklist & Pre-Dispatch Gate Pass Queue",
            "headers": ["Project ID", "Customer Company", "Machine Model", "Crates Count", "PDI Sign-off", "Commercial Clearance", "Gate Pass Status"],
            "rows": [
                ["PRJ-2026-004", "Lucas TVS Chennai", "Dual Spindle Automatic Winder", "3 Wooden Crates", "SIGNED (100% PASS)", "CLEARED (100% Invoiced)", "GATE_PASS_UNLOCKED"],
                ["PRJ-2026-001", "ABB Power Products Vadodara", "4-Spindle High Speed Coil Winder", "3 Wooden Crates", "SIGNED (100% PASS)", "AWAITING_BANK_UTR", "COMMERCIAL_HOLD"],
                ["PRJ-2026-003", "Schneider Electric", "Rotary Turret Indexing Station", "2 Wooden Crates", "PENDING_TRIAL_SIGN", "PENDING_FINAL_PI", "LOCKED_ZERO_SNAG"]
            ]
        },
        "widget": {
            "title": "Shipping Dossier Verification Progress",
            "items": [
                {"name": "Pre-Delivery Inspection (PDI) Signed Cert", "val": "Verified", "pct": "100%"},
                {"name": "Machine Operation & Maintenance Manual", "val": "Verified", "pct": "100%"},
                {"name": "As-Built Electrical Schematics & Schematics", "val": "Verified", "pct": "100%"},
                {"name": "Government E-Way Bill & Tax Invoice", "val": "Verified", "pct": "100%"}
            ]
        },
        "masters": [
            {
                "name": "Transporter & Carrier Master (transporters.xlsx)",
                "fields": [
                    {"name": "transporterCode", "type": "String", "mand": "Yes", "rule": "Unique ID format TRN-XXX", "sample": "TRN-001"},
                    {"name": "carrierName", "type": "String", "mand": "Yes", "rule": "Registered logistics partner", "sample": "V-Trans India Ltd"},
                    {"name": "gstin", "type": "String", "mand": "Yes", "rule": "15-character GSTIN", "sample": "27AAACV4120K1Z8"},
                    {"name": "vehicleTypes", "type": "Dropdown", "mand": "Yes", "rule": "OPEN_TRUCK_17FT / CLOSED_CONTAINER_24FT", "sample": "CLOSED_CONTAINER_24FT"}
                ]
            },
            {
                "name": "Packing List & Crate Master (packing_lists.xlsx)",
                "fields": [
                    {"name": "boxNumber", "type": "String", "mand": "Yes", "rule": "Crate number BOX-XX", "sample": "BOX-01"},
                    {"name": "dimensionsMm", "type": "String", "mand": "Yes", "rule": "L x W x H in millimeters", "sample": "2400 x 1800 x 2100"},
                    {"name": "grossWeightKg", "type": "Number", "mand": "Yes", "rule": "Total gross weight in KG", "sample": "2850"},
                    {"name": "moistureProtection", "type": "String", "mand": "Yes", "rule": "Packaging barrier method", "sample": "Vacuum VCI Bag + Silica Gel"}
                ]
            }
        ]
    },
    {
        "id": "10",
        "name": "After Sales, Warranty & Field Service",
        "slug": "/after-sales",
        "owner": "Head of After-Sales & Customer Service",
        "desc": "Post-commissioning asset history, 12-month client warranty tracking, spare parts dispatch, and preventive maintenance (PM) schedules.",
        "flow": {
            "nodes": [
                {"id": "n1", "label": "Site Commissioning", "sub": "SAT signed at client site", "x": 10, "y": 25, "w": 140, "h": 46, "type": "start"},
                {"id": "n2", "label": "Asset History Register", "sub": "12-month warranty activated", "x": 165, "y": 25, "w": 145, "h": 46, "type": "process"},
                {"id": "n3", "label": "Service Trigger Event", "sub": "Client ticket or scheduled PM", "x": 325, "y": 25, "w": 145, "h": 46, "type": "process"},
                {"id": "n4", "label": "Remote Diagnostics Gate", "sub": "PLC VPN / Video assist", "x": 485, "y": 25, "w": 145, "h": 46, "type": "gate"},
                {"id": "n5", "label": "Spares Dispatch / Site Visit", "sub": "Store issue & on-site fix", "x": 645, "y": 25, "w": 145, "h": 46, "type": "process"},
                {"id": "n6", "label": "Client Digital Sign-off", "sub": "Ticket closure & review", "x": 805, "y": 25, "w": 105, "h": 46, "type": "end"}
            ],
            "connections": [
                ("n1", "n2", ""), ("n2", "n3", ""), ("n3", "n4", ""), ("n4", "n5", "Spares / Visit Needed"), ("n5", "n6", "Resolved")
            ]
        },
        "kpis": [
            {"label": "Active Field Tickets", "val": "2 Open", "badge": "SLA Under Control", "color": "orange"},
            {"label": "Mean Time to Resolve (MTTR)", "val": "18.4 Hours", "badge": "SLA < 24 Hours", "color": "emerald"},
            {"label": "Warranty Margin Health", "val": "92.4%", "badge": "Within Warranty Budget", "color": "blue"},
            {"label": "Scheduled PM Compliance", "val": "98.0%", "badge": "Preventive Care", "color": "emerald"}
        ],
        "table": {
            "title": "Live Field Service Tickets & Support Queue",
            "headers": ["Ticket ID", "Customer Company", "Machine Asset ID", "Reported Snag Issue", "Ticket Priority", "SLA Countdown", "Assigned Engineer", "Status"],
            "rows": [
                ["SRV-2026-024", "ABB Power Products", "AST-MHT-081", "Wire breakage sensor false triggers", "MAJOR", "14 Hours Remaining", "Suresh Jadhav", "RESOLVED_CLOSED"],
                ["SRV-2026-028", "Schneider Electric", "AST-MHT-076", "Quarterly Preventive Maintenance Due", "PREVENTIVE", "5 Days Remaining", "Ganesh Pawar", "SCHEDULED_PM"],
                ["SRV-2026-031", "Lucas TVS Chennai", "AST-MHT-084", "HMI communication drop at start", "CRITICAL", "6 Hours Remaining", "Nitin More", "REMOTE_VPN_FIX"]
            ]
        },
        "widget": {
            "title": "Installed Fleet Warranty Status",
            "items": [
                {"name": "Machines Under Active OEM Warranty (12M)", "val": "18 Machines", "pct": "53%"},
                {"name": "Machines Under Annual Maintenance (AMC)", "val": "12 Machines", "pct": "35%"},
                {"name": "Machines with Expired Contracts", "val": "4 Machines", "pct": "12%"},
                {"name": "Customer Satisfaction Rating (CSAT)", "val": "4.9 / 5.0", "pct": "98%"}
            ]
        },
        "masters": [
            {
                "name": "Customer Asset Master (customer_assets.xlsx)",
                "fields": [
                    {"name": "assetId", "type": "String", "mand": "Yes", "rule": "Unique ID format AST-MHT-XXX", "sample": "AST-MHT-081"},
                    {"name": "projectId", "type": "Dropdown", "mand": "Yes", "rule": "References Project Spine", "sample": "PRJ-2026-001"},
                    {"name": "customerCode", "type": "Dropdown", "mand": "Yes", "rule": "References Customer Master", "sample": "CUST-001 (ABB)"},
                    {"name": "installationDate", "type": "Date", "mand": "Yes", "rule": "Date of SAT sign-off", "sample": "2026-05-28"},
                    {"name": "warrantyExpiryDate", "type": "Date", "mand": "Yes", "rule": "Standard 12 months from SAT", "sample": "2027-05-27"}
                ]
            },
            {
                "name": "Preventive Maintenance (PM) Checklist (pm_schedules.xlsx)",
                "fields": [
                    {"name": "pmFrequency", "type": "Dropdown", "mand": "Yes", "rule": "MONTHLY / QUARTERLY / HALF_YEARLY / YEARLY", "sample": "QUARTERLY"},
                    {"name": "systemComponent", "type": "String", "mand": "Yes", "rule": "Subsystem inspected", "sample": "Winding Spindle Bearings"},
                    {"name": "maintenanceTask", "type": "String", "mand": "Yes", "rule": "Procedure description", "sample": "Measure vibration levels and bearing temperature rise at 2000 RPM"}
                ]
            }
        ]
    }
]

# Common Foundation Masters Data
common_masters = [
    {
        "name": "Company Profile Master (company_profile.xlsx)",
        "desc": "Legal and tax configuration for all documents, invoices, delivery challans, and test certs.",
        "fields": [
            {"name": "legalEntityName", "type": "String", "mand": "Yes", "rule": "Exact registered name", "sample": "Machine House - Winding Technologies Pvt Ltd"},
            {"name": "tagline", "type": "String", "mand": "No", "rule": "Corporate slogan", "sample": "House of Innovations....."},
            {"name": "cin", "type": "String", "mand": "Yes", "rule": "21-character CIN", "sample": "U29253PN2015PTC155421"},
            {"name": "pan", "type": "String", "mand": "Yes", "rule": "10-character PAN", "sample": "AACCM8892K"},
            {"name": "gstin", "type": "String", "mand": "Yes", "rule": "15-character GSTIN", "sample": "27AACCM8892K1Z8"},
            {"name": "registeredOffice", "type": "String", "mand": "Yes", "rule": "Full registered address with PIN", "sample": "Plot No. 44, Electronic Zone, MIDC Bhosari, Pune - 411026"},
            {"name": "plantUnit1", "type": "String", "mand": "Yes", "rule": "Plant address", "sample": "Plot No. 12/B, Industrial Sector 7, Chakan Industrial Area, Pune - 410501"}
        ]
    },
    {
        "name": "Item Category & Taxonomy Master (categories.xlsx)",
        "desc": "Taxonomy governing inventory segregation, store indexing, and QC requirements.",
        "fields": [
            {"name": "categoryCode", "type": "String", "mand": "Yes", "rule": "RAW_MAT / BO_ELEC / BO_MECH / BO_PNU / MACH_PART / SUB_ASSY / FIN_MACH", "sample": "BO_ELEC"},
            {"name": "categoryName", "type": "String", "mand": "Yes", "rule": "Descriptive category title", "sample": "Bought-Out Electrical & Automation"},
            {"name": "classificationType", "type": "Dropdown", "mand": "Yes", "rule": "RM / BO / COMPONENT / SUBASSEMBLY / ASSEMBLY", "sample": "BO"},
            {"name": "requiresQc", "type": "Boolean", "mand": "Yes", "rule": "True enforces gate quarantine inspection", "sample": "TRUE"}
        ]
    },
    {
        "name": "Unit of Measure (UOM) & Dual-Unit Normalization (uoms.xlsx)",
        "desc": "Governs discrete vs continuous units and locks mathematical conversion factors (e.g. Kg vs Meters).",
        "fields": [
            {"name": "uomCode", "type": "String", "mand": "Yes", "rule": "NOS / SET / KG / MTR / LTR / BOX", "sample": "KG"},
            {"name": "uomName", "type": "String", "mand": "Yes", "rule": "Full metric name", "sample": "Kilograms"},
            {"name": "metricType", "type": "Dropdown", "mand": "Yes", "rule": "DISCRETE (Integer only) / CONTINUOUS (Fractional allowed)", "sample": "CONTINUOUS"},
            {"name": "conversionFormula", "type": "String", "mand": "Conditional", "rule": "Formula for alternate UOM (e.g. 1 Box = 50 NOS)", "sample": "weight = length * unitWeight"}
        ]
    }
]

print("Assembling HTML template...")

# Read Logos
logo_plate_b64 = get_base64_image(r"f:\mht\assets\branding\mh_logo_plate.png")
icon_b64 = get_base64_image(r"f:\mht\assets\branding\mh_icon.png")

html = []
html.append('<!DOCTYPE html>')
html.append('<html lang="en">')
html.append('<head>')
html.append('<meta charset="UTF-8">')
html.append('<title>MHT ERP — Master Operational Excellence Blueprint</title>')
html.append('''
<style>
  @page {
    size: A4 portrait;
    margin: 12mm 10mm 14mm 10mm;
    @bottom-right {
      content: "Page " counter(page);
      font-family: system-ui, sans-serif;
      font-size: 8pt;
      color: #94a3b8;
    }
    @bottom-left {
      content: "Machine House - Winding Technologies | Operational Blueprint";
      font-family: system-ui, sans-serif;
      font-size: 8pt;
      color: #94a3b8;
    }
  }

  *, *:before, *:after {
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #0f172a;
    background: #ffffff;
    margin: 0;
    padding: 0;
    font-size: 9.5pt;
    line-height: 1.35;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .page-break {
    page-break-before: always;
    break-before: page;
  }

  .avoid-break {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  /* Cover Page */
  .cover {
    height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 30px 20px;
    background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
    border: 1px solid #e2e8f0;
    border-radius: 12px;
  }

  .cover-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 2px solid #ea580c;
    padding-bottom: 18px;
  }

  .cover-title {
    margin: 40px 0 20px 0;
  }

  .cover-title h1 {
    font-size: 26pt;
    font-weight: 800;
    color: #0f172a;
    margin: 0 0 10px 0;
    letter-spacing: -0.5px;
  }

  .cover-title .subtitle {
    font-size: 13pt;
    font-weight: 600;
    color: #ea580c;
    margin: 0 0 15px 0;
  }

  .cover-title p {
    font-size: 10.5pt;
    color: #475569;
    max-width: 680px;
    line-height: 1.5;
  }

  .cover-grid {
    display: grid;
    grid-cols: 3;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    margin: 25px 0;
  }

  .cover-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 14px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }

  .cover-card h4 {
    margin: 0 0 6px 0;
    font-size: 10pt;
    color: #0f172a;
  }

  .cover-card p {
    margin: 0;
    font-size: 8.5pt;
    color: #64748b;
  }

  .cover-footer {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-top: 1px solid #e2e8f0;
    padding-top: 15px;
    font-size: 8.5pt;
    color: #64748b;
  }

  /* Section Styles */
  .section-header {
    border-top: 3px solid #ea580c;
    background: #ffffff;
    border-bottom: 1px solid #e2e8f0;
    padding: 10px 14px;
    border-radius: 6px 6px 0 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 12px;
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .section-num {
    background: #ea580c;
    color: #ffffff;
    font-weight: 800;
    font-size: 9pt;
    padding: 3px 8px;
    border-radius: 4px;
  }

  .section-name {
    font-size: 13pt;
    font-weight: 800;
    color: #0f172a;
  }

  .section-meta {
    font-size: 8.5pt;
    color: #64748b;
    font-weight: 500;
  }

  .sub-heading {
    font-size: 9.5pt;
    font-weight: 700;
    color: #0f172a;
    margin: 10px 0 4px 0;
    display: flex;
    align-items: center;
    gap: 6px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .sub-heading span {
    color: #ea580c;
  }

  /* Dashboard Mockup Container */
  .mockup-container {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 10px;
    margin: 6px 0 10px 0;
    box-shadow: 0 1px 4px rgba(0,0,0,0.03);
  }

  .mockup-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 6px 10px;
    margin-bottom: 8px;
  }

  .mockup-bar-title {
    font-size: 8.5pt;
    font-weight: 700;
    color: #0f172a;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .mockup-kpis {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-bottom: 8px;
  }

  .kpi-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 8px 10px;
  }

  .kpi-label {
    font-size: 7pt;
    font-weight: 600;
    text-transform: uppercase;
    color: #64748b;
    margin-bottom: 2px;
  }

  .kpi-val {
    font-size: 11pt;
    font-weight: 800;
    color: #0f172a;
  }

  .kpi-badge {
    display: inline-block;
    font-size: 6.5pt;
    font-weight: 700;
    padding: 1px 5px;
    border-radius: 3px;
    margin-top: 3px;
  }

  .badge-emerald { background: #d1fae5; color: #065f46; }
  .badge-orange { background: #ffedd5; color: #c2410c; }
  .badge-blue { background: #e0f2fe; color: #0369a1; }
  .badge-amber { background: #fef3c7; color: #92400e; }
  .badge-red { background: #fee2e2; color: #b91c1c; }

  /* Mockup Split Grid */
  .mockup-split {
    display: grid;
    grid-template-columns: 2.3fr 1fr;
    gap: 8px;
  }

  .mockup-box {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 8px;
  }

  .mockup-box-title {
    font-size: 8pt;
    font-weight: 700;
    color: #334155;
    margin-bottom: 6px;
    padding-bottom: 4px;
    border-bottom: 1px solid #f1f5f9;
  }

  /* Compact Data Tables */
  table.data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 7.5pt;
    margin: 4px 0;
  }

  table.data-table th {
    background: #f1f5f9;
    color: #334155;
    font-weight: 700;
    text-align: left;
    padding: 5px 6px;
    border: 1px solid #e2e8f0;
  }

  table.data-table td {
    padding: 4px 6px;
    border: 1px solid #e2e8f0;
    color: #0f172a;
    vertical-align: middle;
  }

  table.data-table tr:nth-child(even) td {
    background: #fafafa;
  }

  .tag-pill {
    display: inline-block;
    font-size: 6.5pt;
    font-weight: 700;
    padding: 1px 4px;
    border-radius: 3px;
    background: #f1f5f9;
    color: #475569;
  }

  .tag-mand {
    background: #fef2f2;
    color: #b91c1c;
    border: 1px solid #fecaca;
  }

  .widget-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 0;
    border-bottom: 1px solid #f8fafc;
    font-size: 7.5pt;
  }

  .widget-item-name {
    font-weight: 600;
    color: #334155;
  }

  .widget-item-val {
    font-weight: 700;
    color: #ea580c;
  }

  /* Master Spec Tables */
  .master-box {
    margin: 6px 0 10px 0;
  }

  .master-title {
    font-size: 8.5pt;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 4px;
  }
</style>
''')
html.append('</head>')
html.append('<body>')

# ----------------- COVER PAGE -----------------
html.append('<div class="cover avoid-break">')
html.append('  <div class="cover-header">')
if logo_plate_b64:
    html.append(f'    <img src="{logo_plate_b64}" style="height: 55px; object-fit: contain;" />')
else:
    html.append('    <div style="font-size: 16pt; font-weight: 800; color: #ea580c;">MACHINE HOUSE</div>')
html.append('    <div style="text-align: right;">')
html.append('      <div style="font-size: 10pt; font-weight: 700; color: #0f172a;">OPERATIONAL EXCELLENCE ERP PLATFORM</div>')
html.append('      <div style="font-size: 8pt; color: #ea580c; font-weight: 600;">"House of Innovations....."</div>')
html.append('    </div>')
html.append('  </div>')

html.append('  <div class="cover-title">')
html.append('    <div class="subtitle">ENTERPRISE SYSTEM BLUEPRINT & DATA COLLECTION SPECIFICATION</div>')
html.append('    <h1>Standard Master Data Formats, Process Flow Charts & Module Dashboards</h1>')
html.append('    <p>A comprehensive operational manual for department heads (Sales, Engineering, Purchase, Quality, Store, Production, Dispatch, and After Sales) defining the exact input templates, sequential stage gates, and real-time plant KPIs required for the Machine House ETO manufacturing execution platform.</p>')
html.append('  </div>')

html.append('  <div class="cover-grid">')
html.append('    <div class="cover-card">')
html.append('      <h4>1. Standardized Master Data</h4>')
html.append('      <p>Clean Excel schemas with column names, data types, mandatory flags, validation constraints, and realistic industrial winding machine values.</p>')
html.append('    </div>')
html.append('    <div class="cover-card">')
html.append('      <h4>2. Visual Process Flow Charts</h4>')
html.append('      <p>End-to-end operational sequence from lead capture to site SAT, including automated ECO freeze rules, hard allocation locks, and zero-snag stops.</p>')
html.append('    </div>')
html.append('    <div class="cover-card">')
html.append('      <h4>3. Live Module Dashboards</h4>')
html.append('      <p>Executive and shopfloor dashboards featuring 4 top-level KPI metrics, active priority queues, and real-time distribution charts.</p>')
html.append('    </div>')
html.append('  </div>')

html.append('  <div class="cover-footer">')
html.append('    <div>')
html.append('      <div><strong>Corporate Entity:</strong> Machine House - Winding Technologies Pvt Ltd</div>')
html.append('      <div><strong>Manufacturing Plants:</strong> Unit 1 Bhosari (Pune) & Unit 2 Chakan Industrial Area</div>')
html.append('    </div>')
html.append('    <div style="text-align: right;">')
html.append('      <div><strong>Version:</strong> Release 1.0 (Enterprise ETO Edition)</div>')
html.append('      <div><strong>Publish Date:</strong> October 2026 | Confidential Internal Plant Blueprint</div>')
html.append('    </div>')
html.append('  </div>')
html.append('</div>')

# ----------------- ARCHITECTURE SPINE PAGE -----------------
html.append('<div class="page-break"></div>')
html.append('<div class="section-header">')
html.append('  <div class="section-title">')
html.append('    <span class="section-num">SPINE</span>')
html.append('    <span class="section-name">ETO Manufacturing Architecture & Central Project Spine</span>')
html.append('  </div>')
html.append('  <div class="section-meta">Machine House Operations Core</div>')
html.append('</div>')

html.append('<p style="font-size: 8.5pt; color: #475569; margin: 8px 0 4px 0;">In an Engineer-to-Order (ETO) plant, every machine is engineered to specific client coil specifications. The <strong>Unique Project ID / Master Work Order ID (PRJ-XXXX / WO-XXXX)</strong> acts as the central spine connecting all downstream procurement, quality inspections, store inventory allocations, shopfloor assembly stages, dry/wet trials, and zero-snag dispatches.</p>')

html.append(build_spine_svg())

# Foundation Common Masters
html.append('<div class="sub-heading"><span>■</span> Common Foundation Masters (Shared Enterprise Lookups)</div>')
for cm in common_masters:
    html.append(f'<div class="master-box avoid-break">')
    html.append(f'  <div class="master-title">{cm["name"]} — <span style="font-size: 7.5pt; font-weight: 500; color: #64748b;">{cm["desc"]}</span></div>')
    html.append('  <table class="data-table">')
    html.append('    <thead><tr><th style="width: 22%;">Field Name (Excel Column)</th><th style="width: 14%;">Data Type</th><th style="width: 12%;">Mandatory?</th><th style="width: 26%;">Validation / Constraint</th><th style="width: 26%;">Sample Industrial Value</th></tr></thead>')
    html.append('    <tbody>')
    for f in cm["fields"]:
        mand_tag = '<span class="tag-pill tag-mand">Mandatory</span>' if f["mand"] == "Yes" else '<span class="tag-pill">Optional</span>'
        html.append(f'      <tr><td><code>{f["name"]}</code></td><td><span class="tag-pill">{f["type"]}</span></td><td>{mand_tag}</td><td>{f["rule"]}</td><td><strong>{f["sample"]}</strong></td></tr>')
    html.append('    </tbody></table></div>')

# ----------------- MODULES 1 TO 10 -----------------
for mod in modules_data:
    html.append('<div class="page-break"></div>')
    html.append('<div class="section-header">')
    html.append('  <div class="section-title">')
    html.append(f'    <span class="section-num">M{mod["id"]}</span>')
    html.append(f'    <span class="section-name">{mod["name"]}</span>')
    html.append('  </div>')
    html.append(f'  <div class="section-meta">Route: <code>{mod["slug"]}</code> | Owner: <strong>{mod["owner"]}</strong></div>')
    html.append('</div>')

    # Description
    html.append(f'<p style="font-size: 8pt; color: #475569; margin: 6px 0 2px 0;">{mod["desc"]}</p>')

    # 1. Visual Process Flow Chart
    html.append('<div class="sub-heading"><span>■</span> 1. Visual Process Flow Chart & Stage Gates</div>')
    html.append(build_svg_flowchart(mod["flow"]["nodes"], mod["flow"]["connections"]))

    # 2. Visual Dashboard Mockup
    html.append('<div class="sub-heading"><span>■</span> 2. Module Dashboard & Real-Time KPIs (What Plant Users See)</div>')
    html.append('<div class="mockup-container avoid-break">')
    html.append('  <div class="mockup-bar">')
    html.append(f'    <div class="mockup-bar-title"><span style="color:#ea580c;">●</span> {mod["name"]} Dashboard (Live Plant View)</div>')
    html.append('    <div style="font-size: 7.5pt; color: #64748b;">Real-time sync active</div>')
    html.append('  </div>')
    
    # 4 KPIs
    html.append('  <div class="mockup-kpis">')
    for kpi in mod["kpis"]:
        html.append(f'    <div class="kpi-card">')
        html.append(f'      <div class="kpi-label">{kpi["label"]}</div>')
        html.append(f'      <div class="kpi-val">{kpi["val"]}</div>')
        html.append(f'      <div class="kpi-badge badge-{kpi["color"]}">{kpi["badge"]}</div>')
        html.append('    </div>')
    html.append('  </div>')

    # Split: Table + Widget
    html.append('  <div class="mockup-split">')
    # Table Box
    html.append('    <div class="mockup-box">')
    html.append(f'      <div class="mockup-box-title">{mod["table"]["title"]}</div>')
    html.append('      <table class="data-table">')
    html.append('        <thead><tr>')
    for h in mod["table"]["headers"]:
        html.append(f'<th>{h}</th>')
    html.append('        </tr></thead><tbody>')
    for row in mod["table"]["rows"]:
        html.append('        <tr>')
        for c_idx, cell in enumerate(row):
            if c_idx == 0:
                html.append(f'<td><code>{cell}</code></td>')
            elif "PASS" in str(cell) or "ON_TRACK" in str(cell) or "SUCCESS" in str(cell) or "CLEARED" in str(cell):
                html.append(f'<td><span class="tag-pill" style="background:#d1fae5; color:#065f46; font-weight:700;">{cell}</span></td>')
            elif "OVERDUE" in str(cell) or "BLOCKED" in str(cell) or "LOCKED" in str(cell) or "DELAY" in str(cell):
                html.append(f'<td><span class="tag-pill" style="background:#fee2e2; color:#b91c1c; font-weight:700;">{cell}</span></td>')
            else:
                html.append(f'<td>{cell}</td>')
        html.append('        </tr>')
    html.append('      </tbody></table>')
    html.append('    </div>')
    
    # Widget Box
    html.append('    <div class="mockup-box">')
    html.append(f'      <div class="mockup-box-title">{mod["widget"]["title"]}</div>')
    for w in mod["widget"]["items"]:
        html.append(f'      <div class="widget-item">')
        html.append(f'        <div class="widget-item-name">{w["name"]}</div>')
        html.append(f'        <div class="widget-item-val">{w["val"]}</div>')
        html.append('      </div>')
    html.append('    </div>')

    html.append('  </div>') # mockup-split
    html.append('</div>') # mockup-container

    # 3. Master Data Requirements
    html.append('<div class="sub-heading"><span>■</span> 3. Master Data Requirements & Excel Input Schemas</div>')
    for m in mod["masters"]:
        html.append(f'<div class="master-box avoid-break">')
        html.append(f'  <div class="master-title">📁 {m["name"]}</div>')
        html.append('  <table class="data-table">')
        html.append('    <thead><tr><th style="width: 20%;">Field Name (Excel Header)</th><th style="width: 14%;">Data Type</th><th style="width: 12%;">Mandatory?</th><th style="width: 28%;">Validation Rules / Constraints</th><th style="width: 26%;">Sample Industrial Value</th></tr></thead>')
        html.append('    <tbody>')
        for f in m["fields"]:
            mand_tag = '<span class="tag-pill tag-mand">Mandatory</span>' if f["mand"] == "Yes" else '<span class="tag-pill">Optional</span>'
            html.append(f'      <tr><td><code>{f["name"]}</code></td><td><span class="tag-pill">{f["type"]}</span></td><td>{mand_tag}</td><td>{f["rule"]}</td><td><strong>{f["sample"]}</strong></td></tr>')
        html.append('    </tbody></table></div>')

# ----------------- DATA COLLECTION INGESTION PROTOCOL -----------------
html.append('<div class="page-break"></div>')
html.append('<div class="section-header">')
html.append('  <div class="section-title">')
html.append('    <span class="section-num">GUIDE</span>')
html.append('    <span class="section-name">Departmental Data Collection & System Ingestion Protocol</span>')
html.append('  </div>')
html.append('  <div class="section-meta">Operational Readiness SOP</div>')
html.append('</div>')

html.append('''
<div style="margin: 12px 0; font-size: 8.5pt; color: #334155; line-height: 1.5;">
  <p>To ensure a flawless transition into live production on the Machine House (MH) ERP platform, all department heads must adhere strictly to the following 3-step master data submission protocol:</p>
  
  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 14px 0;">
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
      <h4 style="margin: 0 0 6px 0; color: #0f172a; font-size: 9pt;">Step 1: Download Standard Excel Templates</h4>
      <p style="margin: 0; font-size: 8pt; color: #64748b;">Department leads will receive standardized .xlsx sheets matching the exact column names specified in Section 3 of this document. Columns must not be renamed, deleted, or reordered.</p>
    </div>
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
      <h4 style="margin: 0 0 6px 0; color: #0f172a; font-size: 9pt;">Step 2: Strict Data Hygiene Rules</h4>
      <p style="margin: 0; font-size: 8pt; color: #64748b;">Ensure zero duplicate codes across Item Codes (itemCode), Vendor Codes (vendorCode), and Customer Codes. Mandatory fields cannot be blank. Standard UOM tokens must be strictly used.</p>
    </div>
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
      <h4 style="margin: 0 0 6px 0; color: #0f172a; font-size: 9pt;">Step 3: Automated Dry-Run Validation</h4>
      <p style="margin: 0; font-size: 8pt; color: #64748b;">Upon uploading sheets into the MH ERP Admin/Import portal, the system runs an automated validation engine checking foreign keys and data types before committing records into MongoDB.</p>
    </div>
  </div>

  <table class="data-table" style="margin-top: 15px;">
    <thead>
      <tr>
        <th>Department</th>
        <th>Responsible Head</th>
        <th>Required Excel Templates</th>
        <th>Key Verification Checkpoint</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>IT / Administration</strong></td>
        <td>System Administrator</td>
        <td><code>company_profile.xlsx</code>, <code>users.xlsx</code>, <code>roles.xlsx</code></td>
        <td>Corporate tax IDs verified & plant IP whitelist assigned.</td>
      </tr>
      <tr>
        <td><strong>Sales / CRM</strong></td>
        <td>Business Development Head</td>
        <td><code>customers.xlsx</code>, <code>leads.xlsx</code></td>
        <td>GSTIN verified on GST portal; commercial payment terms baseline.</td>
      </tr>
      <tr>
        <td><strong>Design & Engineering</strong></td>
        <td>Design Lead</td>
        <td><code>bom_template.xlsx</code>, <code>drawings.xlsx</code></td>
        <td>3-Level BOM hierarchy verified; drawing files linked (.step/.pdf).</td>
      </tr>
      <tr>
        <td><strong>Purchase & Sourcing</strong></td>
        <td>Purchase Manager</td>
        <td><code>vendors.xlsx</code>, <code>item_specs.xlsx</code></td>
        <td>Standard lead days & MSME classification updated for suppliers.</td>
      </tr>
      <tr>
        <td><strong>Quality Assurance</strong></td>
        <td>Quality Lead</td>
        <td><code>qc_parameters.xlsx</code>, <code>defect_codes.xlsx</code></td>
        <td>Sampling plans & critical dimensional tolerances defined.</td>
      </tr>
      <tr>
        <td><strong>Store & Inventory</strong></td>
        <td>Store In-charge</td>
        <td><code>locations.xlsx</code>, <code>inventory_items.xlsx</code></td>
        <td>Physical rack/bin barcode mapping & initial stock verified.</td>
      </tr>
      <tr>
        <td><strong>Production & Assembly</strong></td>
        <td>Production Head</td>
        <td><code>work_centers.xlsx</code>, <code>assembly_stages.xlsx</code></td>
        <td>Bay capacities & standard assembly man-hours configured.</td>
      </tr>
      <tr>
        <td><strong>Dispatch & Logistics</strong></td>
        <td>Dispatch Executive</td>
        <td><code>transporters.xlsx</code>, <code>packing_lists.xlsx</code></td>
        <td>Carrier insurance verified; standard crate dimensions set.</td>
      </tr>
      <tr>
        <td><strong>After Sales Service</strong></td>
        <td>Customer Service Lead</td>
        <td><code>customer_assets.xlsx</code>, <code>pm_schedules.xlsx</code></td>
        <td>Client machine serial numbers & preventive maintenance frequency.</td>
      </tr>
    </tbody>
  </table>
</div>
''')

html.append('</body>')
html.append('</html>')

html_content = "".join(html)

html_file_path = r"f:\mht\MHT_ERP_Visual_Blueprint.html"
pdf_file_path = r"f:\mht\MHT_ERP_Operational_Excellence_Blueprint.pdf"

print(f"Writing HTML to {html_file_path}...")
with open(html_file_path, "w", encoding="utf-8") as f:
    f.write(html_content)

print(f"HTML generated successfully ({len(html_content)} bytes).")

# Run Headless Chrome to generate PDF
chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
print(f"Compiling PDF using Chrome headless: {chrome_path}...")

cmd = [
    chrome_path,
    "--headless=new",
    "--disable-gpu",
    "--no-pdf-header-footer",
    f"--print-to-pdf={pdf_file_path}",
    html_file_path
]

res = subprocess.run(cmd, capture_output=True, text=True)
print("Chrome stdout:", res.stdout)
print("Chrome stderr:", res.stderr)

if os.path.exists(pdf_file_path):
    size = os.path.getsize(pdf_file_path)
    print(f"SUCCESS! PDF created at: {pdf_file_path} (Size: {size:,} bytes)")
else:
    print("FAILED to create PDF.")
