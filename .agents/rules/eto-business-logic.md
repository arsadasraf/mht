# Rule: ETO Manufacturing Business Logic & Workflow Constraints

Every machine built by **Machine House - Winding Technologies** is an Engineer-to-Order (ETO) asset governed by strict delivery timelines and zero-error tolerances. The business logic spans 10 core operational modules:

> **OWASP Top 10 Reference Standard:**
> *"The OWASP Top 10 is the reference standard for the most critical web application security risks. Adopting the OWASP Top 10 is perhaps the most effective first step towards changing your software development culture focused on producing secure code."*

---

## 1. Central Spine: Unique Project ID Creation (Module 3: Project Setup)
* **Master Spine Rule:** The lifecycle of every machine begins in **Module 3: Project Setup** where a **Unique Project ID / Master Work Order ID** (`PRJ-XXXX` / `WO-XXXX`) is minted.
* This Unique ID is the immutable reference key across the entire ERP. Every record created in subsequent modules:
  * Design (BOM & CAD drawings)
  * Purchase (Demand requisitions & POs)
  * Incoming Quality (Inspections & RTV)
  * Store (Hard-locked inventory allocations)
  * Production & Trial (Assembly tasks, test logs & snags)
  * Dispatch (Pre-dispatch gate pass & packing slips)
  * After Sales (Commissioning certificates, warranty tickets & spare parts)
  MUST reference and track progress directly against this Unique Project ID.

---

## 2. Cloned & Project-Specific BOMs (Module 4: Design)
* Base models in the Global Item Master serve as standard catalog templates.
* When a machine is initiated in Project Setup, the system **clones** the base hierarchical BOM into a dedicated `ProjectBOM` tied to the Unique Project ID.
* Any project-specific modifications, custom part numbers, or special drawing revisions must be recorded against this cloned project BOM without mutating global templates.

---

## 3. Automated ECO (Engineering Change Order) Freeze (Module 4 & 5)
* When an ECO is created and approved:
  1. The system flags all affected BOM line items with status `ECO_PENDING` or `REVISED`.
  2. The system **automatically freezes** all active Purchase Order (PO) lines referencing the affected part numbers.
  3. The system locks allocated inventory for that part to prevent shop-floor issue.
  4. An audit action item is dispatched to the Purchase Manager and Store Manager to either revise the PO line, scrap the stock, or approve a deviation.

---

## 4. Strict Hard Allocation Locking in Store (Module 7: Store)
* Materials cleared through Incoming Quality Control (QC-Accepted) are placed into the `Accepted` stock bucket and **hard-locked** to the specific originating Unique Project ID (`allocatedToProjectId: PRJ-XXXX`).
* The Store module will strictly prohibit issuing or transferring allocated stock to another machine unless an authorized **Managerial Stock Transfer Clearance** is signed by the Operations Head.

---

## 5. Absolute Zero-Snag Block at Pre-Dispatch Gate (Module 8 & 9)
* Machine assembly and trial runs log observations, tests, and snags (defects) with severities (`Critical`, `Major`, `Minor`).
* **Zero-Tolerance Gate:** Pre-dispatch inspection and shipping release are hard-blocked by the system if **even a single unresolved snag** exists on the project, regardless of severity.
* Every snag must be marked `Resolved`, accompanied by a resolution note/photo, and re-inspected by the Quality Inspector before pre-dispatch clearance documents (packing slip, dispatch dossier) can be generated.

---

## 6. Marketing & Sales Bulk Lead Ingestion (Module 2: CRM)
* The CRM module provides a standard `.xlsx` template download (`Customer Name`, `Machine Model`, `Specifications`, `Target Delivery Date`, `Estimated Budget`, `Lead Source`).
* When uploading a lead sheet:
  1. Parse the uploaded sheet and run dry-run schema validation.
  2. Present an interactive preview modal highlighting valid rows in green and malformed rows with red error hints.
  3. Allow 1-click bulk ingest of all valid rows.
  4. On order agreement, a single click passes customer specs to **Module 3: Project Setup** for unique ID minting.

---

## 7. After Sales & Warranty Tracking (Module 10: After Sales)
* Tracks commissioning sign-offs, customer handover punch-lists, and warranty periods based on the Unique Project ID.
* Logs warranty spare parts requests and field service snags with history linking back to original BOM parts and trial records.
