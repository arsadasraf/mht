# Machine House (MH) ERP — Master System Development Plan & Roadmap

> **Company Profile:** **Machine House - Winding Technologies** ("House of Innovations.....")  
> **System Scope:** Engineer-to-Order (ETO) Manufacturing Execution & Resource Planning System  
> **Workspace Root:** `f:/mht`  
> **Frontend Directory:** `f:/mht/frontend` (Next.js 14/15, Redux Toolkit, RTK Query, Tailwind CSS v3)  
> **Backend Directory:** `f:/mht/backend` (Node.js, Express.js, MongoDB / Mongoose, AWS S3)  
> **Operating Currency:** Base currency INR (₹, Lakhs/Crores `en-IN`), Multi-currency foreign quote support with permanently locked exchange rates.

---

## 1. Strict Agent Operating Constraints & Workflow Rules

All AI agents interacting with this repository MUST strictly adhere to the following three foundational constraints without exception:

1. **Mandatory Pre-Execution Planning:**
   * Every non-trivial task, feature addition, or system modification MUST begin with a structured, step-by-step implementation plan.
   * Agents must outline the affected frontend and backend files, data schema adjustments, validation rules, and error handling before touching code.
2. **Strictly Zero Git Commits by Agent:**
   * AI agents are **STRICTLY PROHIBITED** from executing `git commit`, running automated staging/commit scripts, or pushing branches.
   * Version control commits and repository state changes must be reviewed and executed manually by the human developer only.
3. **Strictly Zero Agent Browser Access:**
   * AI agents are **STRICTLY PROHIBITED** from initiating or using browser subagents or automated browser interaction tools (`browser_subagent`).
   * Visual verification and web inspection by the agent are disabled. All validations must be carried out via direct code inspection, terminal CLI tests (e.g. `npm test`, curl requests, lint checks), or by asking the human user for live review.

---

## 2. Core UI/UX & Architectural Directives

* **100% Pure Tailwind CSS v3 (Zero Inline Styles & Zero Dark Mode):**
  * Clean, glare-free light theme (`bg-slate-50` canvas, `bg-white` cards with `border-slate-200`).
  * Safety Orange brand accent: `#FF6A00` (`bg-orange-500 hover:bg-orange-600 active:bg-orange-700`, `text-orange-600`, `border-orange-200`).
* **Mandatory Button-Type Tabs (Zero Underline Tabs):**
  * All module tabs, sub-tabs, and view-switchers must use modern button/pill segmented controls (`rounded-xl` / `rounded-2xl`).
  * Active: Safety Orange fill (`bg-orange-500 text-white font-semibold shadow-xs`) or white card (`bg-white text-orange-600 font-bold border border-slate-200 shadow-xs`). Traditional underline tabs (`border-b-2`) are strictly forbidden.
* **Standardized Form & Modal Sizing System Across Devices:**
  * **Desktop Monitors (≥ 1280px / `xl:` & `2xl:`):**
    * Master / Expansive Forms (Customer Master, BOM Configurator, Product Master, PO Builder): `w-full max-w-6xl xl:max-w-7xl` with `max-h-[92vh]`.
    * Standard Action Forms (Add User, Role Assignment, Gate Entry, Log Inspection): `w-full max-w-3xl lg:max-w-4xl` with `max-h-[90vh]`.
    * Compact Action Forms: `w-full max-w-lg lg:max-w-xl`.
    * Confirmation Dialogs: `w-full max-w-md` (448px).
  * **Laptops (1024px to 1279px / `lg:`):** Master Forms `w-full max-w-5xl lg:max-w-6xl` (`max-h-[90vh]`); Standard Forms `w-full max-w-2xl lg:max-w-3xl`.
  * **Tablets (768px to 1023px / `md:`):** Fluid `w-full max-w-2xl` with `p-4 sm:p-5`, touch targets ≥ 44px.
  * **Mobile Phones (< 768px):** Slide-up bottom sheets (`w-full inset-x-0 bottom-0 rounded-t-2xl sm:rounded-2xl`), single-column layout, sticky bottom action bar.
* **Mandatory Header Ribbon Standard (Crisp White Header with Amber Top Accent Stripe):**
  * Container: `bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs`.
  * High-contrast slate typography (`text-slate-900 text-base font-extrabold tracking-tight`), amber icon badge (`w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40`), light close button. Strictly zero dark headers.
* **Unified Conversational & Human-Friendly Messaging Standard:**
  * Friendly, actionable English (*"All set! Changes saved."*, *"We couldn't save this right now. Please check the required fields and try again."*).
  * Strictly zero native browser `alert()` or `confirm()`. Fixed bottom-right toast (`fixed bottom-6 right-6 z-50`).
* **Standardized Excel-Style Table Header Filters:**
  * Embedded funnel trigger button (`Filter` icon) in table headers `<th>`, opening a floating popover (`w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50`) with A-Z/Z-A sorting, live search, (Select All) toggle, distinct values checklist with counts, and Safety Orange active indicator. Single-click global "Reset Filters" toolbar button.
* **OWASP Top 10 Security Architecture:**
  * Strict RBAC at module and tab route levels; Pre-registered user accounts only; No user deletion (`isActive: false` only); Universal action tracking (`createdBy`, `updatedBy`, `createdAt`, `updatedAt`); 15-minute lockout after 5 failed logins; NoSQL sanitization; short-lived AWS S3 presigned URLs with local dev mock fallback.

---

## 3. End-to-End Operational Lifecycle & Cross-Module Data Spine

The Machine House ETO workflow relies on a single continuous, unbroken digital thread:

```
[Enquiry / Lead Sheet] (CRM)
          │
          ▼
[Quotation & Customer PO] (CRM)
          │  ── Transition ──► Creates PRJ-XXXX / WO-XXXX
          ▼
[Project Setup Spine] (Unique Project ID PRJ-XXXX / WO-XXXX)
          │
          ├────────────────────────┬────────────────────────┐
          ▼                        ▼                        ▼
[Design & BOM]            [Milestone Baseline]      [Stage Gate Schedule]
(3-Level BOM: M -> SA -> Part)     │                        │
          │                        │                        │
          ▼                        │                        │
[Net Demand Calculation]           │                        │
(Gross BOM - Unreserved Stock)     │                        │
          │                        │                        │
          ▼                        │                        │
[Purchase Orders & Follow-up]      │                        │
(Multi-tier approvals)             │                        │
          │                        │                        │
          ▼                        │                        │
[Gate Entry & Inward QC]           │                        │
(Quarantine -> Accepted/RTV)       │                        │
          │                        │                        │
          ▼                        │                        │
[Store Hard-Locking]               │                        │
(Allocated to PRJ-XXXX)            │                        │
          │                        │                        │
          ▼                        ▼                        ▼
[Production Assembly & Machine Trials] ◄────────────────────┘
(Parallel/Sequential assembly, Stage checks, Snag logging)
          │
          ▼  (Enforces Absolute Zero-Snag Block)
[Pre-Dispatch Gate Pass & Shipping Dossier]
          │
          ▼
[After Sales Service, Warranty Tracking & Field Snags]
```

---

## 4. Comprehensive 10-Module Development Roadmap

### Module 1: Admin (`/admin`)
* **Purpose:** Central command center governing users, dynamic route/tab RBAC, plant IP whitelisting, session timeouts, and immutable audit trails.
* **Current State:**
  * Backend: `user.controller.js`, `role.controller.js`, `auth.controller.js`, `auditLog.controller.js`, with respective routes and Mongoose models (`User`, `Role`, `AuditLog`, `Master`).
  * Frontend: `/admin/users`, `/admin/roles`, `/admin/audit-logs`, `/admin/sessions` driven by `adminApi.ts`.
* **Planned Milestones & Enhancements:**
  1. **Granular Route-Based Permission Matrix:** Complete UI grid syncing all 10 module parent routes and their sub-tab routes with Role definitions.
  2. **Plant IP Whitelisting Sub-Tab:** Interface allowing plant administrators to define office, workshop, and kiosk CIDR IP blocks with immediate enforcement.
  3. **User Deactivation Protocol:** Audit verification ensuring user deletion is physically impossible in the UI and backend (`isActive: false` enforcement only).
  4. **Dynamic Refresh Token Expiry Configuration:** Admin slider per user to set token lifespan (8h plant kiosk, 7d/30d corporate).

---

### Module 2: CRM & Sales Pipeline (`/crm`)
* **Purpose:** Convert raw customer inquiries into confirmed projects via structured lead tracking, bulk Excel ingestion, formal quotation generation, and Customer PO validation.
* **Current State:**
  * Backend: `customer.controller.js`, `lead.controller.js`, `quotation.controller.js`, `customerPo.controller.js`, `crmMaster.controller.js` with models and routes.
  * Frontend: `/crm/overview`, `/crm/dashboard`, `/crm/leads`, `/crm/quotations`, `/crm/customer-po`, `/crm/deals`, `/crm/masters` supported by `crmApi.ts`.
* **Planned Milestones & Enhancements:**
  1. **Standardized Bulk Excel Import with Dry-Run Validation:**
     * Client-side parse via SheetJS (`xlsx`) with schema preview modal.
     * Dry-run validation highlighting invalid emails, missing GSTINs, duplicate phones, or malformed addresses before commit.
  2. **Quotation Builder with Dual Currency & Locked Exchange Rates:**
     * Multi-line item machine configuration with tax (GST/IGST) calculations.
     * Foreign currency conversion (USD, EUR, GBP, JPY) that freezes `exchangeRate` and `baseAmountINR` upon quotation issuance.
  3. **One-Click Transition to Project Setup Spine:**
     * On PO confirmation (`WON` status), auto-trigger creation of `PRJ-XXXX` / `WO-XXXX` in the Project Setup Spine with customer metadata automatically populated.

---

### Module 3: Project Setup Spine (`/project-setup`) [Central ETO Spine]
* **Purpose:** Issue and govern the **Unique Project ID / Master Work Order ID** (`PRJ-XXXX` / `WO-XXXX`) that unifies all downstream engineering, procurement, stores, assembly, quality, dispatch, and after-sales actions.
* **Current State:**
  * Backend: `project.controller.js`, `milestone.controller.js`, with `project.model.js` and `milestone.model.js`.
  * Frontend: `/project-setup/projects`, `/project-setup/milestones` supported by `projectApi.ts`.
* **Planned Milestones & Enhancements:**
  1. **Automated Project ID Sequencer:** Enforce strict atomic sequence generation (`PRJ-2026-0001` or `WO-0001`) with zero duplicate risk.
  2. **Milestone Schedule Baselines:** Baseline gantt/milestone tracker (Design Release $\rightarrow$ Procurement $\rightarrow$ Inward QC $\rightarrow$ Mechanical Assembly $\rightarrow$ Electrical Wiring $\rightarrow$ Dry/Wet Trial $\rightarrow$ Pre-Dispatch Inspection $\rightarrow$ Final Dispatch).
  3. **Project Revision & Change Log:** Append-only log tracking schedule shifts, scope changes, and project owner reassignments.

---

### Module 4: Design & Engineering (`/design`)
* **Purpose:** Manage the 3-Level Hierarchical Bill of Materials (BOM), CAD drawing repository, and Engineering Change Orders (ECO).
* **Current State:**
  * Backend: `bom.controller.js`, `drawing.controller.js`, `eco.controller.js` with respective models and routes.
  * Frontend: `/design/bom`, `/design/drawings`, `/design/eco` backed by `designApi.ts`.
* **Planned Milestones & Enhancements:**
  1. **3-Level Hierarchical BOM Configurator:**
     * Level 0: Finished Machine (`PRJ-XXXX`).
     * Level 1: Sub-Assemblies (e.g. Winding Head, Tensioning Unit, Turret Carousel).
     * Level 2: Component Parts & Raw Materials (Bearings, Servos, Sensors, Shafts, Fasteners).
     * Dual unit normalization (e.g., Kg vs Meters, Box vs Pcs).
  2. **CAD Intellectual Property Protection & Distribution:**
     * Controlled distribution of `.step`, `.dwg`, `.dxf`, and `.pdf` engineering drawings.
     * Dynamic client-side watermark overlays (User Name, Project ID, Date/Time); raw download restricted to authorized Design Engineers.
  3. **Automated ECO Freeze Rule:**
     * When an ECO is created and approved, automatically freeze active PO lines and reserved store allocations referencing modified parts until design sign-off.

---

### Module 5: Purchase & Sourcing (`/purchase`)
* **Purpose:** End-to-end procurement lifecycle from BOM demand and outward RFQ dispatch to inward vendor quotation comparison, outward PO generation, vendor purchase billing, rate price lists, and vendor/company masters.
* **Core Tab Architecture (7 Distinct Tabs):**
  1. **Dashboard (`/purchase/dashboard`):** Sourcing KPI summary (Open RFQs, Pending Vendor Quotes, POs Awaiting Approval, Pending Bills, Overdue Deliveries, Sourcing Spend Breakdown).
  2. **Outward RFQ (`/purchase/rfq`):** Creation & dispatch of Request for Quotations (RFQs) to vendors with 1-click BOM Net Demand import from `PRJ-XXXX`, submission deadlines, and specs attachments.
  3. **Inward Quotation (`/purchase/quotations`):** Logging received vendor quotes, Comparative Statement (CS) matrix with automated L1/L2/L3 tagging, commercial terms comparison, and quote approval.
  4. **Outward PO (`/purchase/orders`):** Formal Purchase Orders issued to vendors with dual UOM, multi-currency conversion, multi-tier approvals, and ECO freeze integration (`FROZEN_ECO`).
  5. **Purchase Bills (`/purchase/bills`):** Inward vendor invoices/bills matching against POs and Gate Entry MRNs (3-way matching), GST verification, payment milestones, and debit note deductions.
  6. **Price List (`/purchase/price-list`):** Item-wise historical price agreements, rate contracts, MOQ discounts, and vendor price trends.
  7. **Master (`/purchase/masters`):**
     * **Vendor Master:** Vendor profile directory, categories, GSTIN, MSME, contacts, bank details, ratings (1–5).
     * **Company Profile:** Machine House purchasing entities, factory/office billing & shipping addresses, GSTINs, bank accounts, standard PO terms & conditions.
* **Current State:**
  * Backend: `purchaseOrder.controller.js`, `vendor.controller.js` with models and routes.
  * Frontend: Configured 7 tabs in `modules.config.ts`, route pages, and dedicated components in `frontend/src/modules/purchase/components/`.
* **Phased Deliverable Roadmap:** Each tab foundational UI shell and route established immediately; deep feature workflows implemented sequentially in subsequent steps.

---

### Module 6: Quality (`/quality`)
* **Purpose:** End-to-end quality assurance spanning Incoming Inspection (Gate Entry & Goods Receipt), In-Process Assembly verification, Pre-Delivery Inspection (PDI zero-snag certification), and Quality Masters.
* **Current State:**
  * Backend: `gateEntry.controller.js`, `qcInspection.controller.js` with models and routes mounted under `/api/v1/quality`.
  * Frontend: 4 dedicated tabs configured in `modules.config.ts`, route pages in `/quality/`, and components in `frontend/src/modules/quality/components/`.
* **Configured 4 Tabs:**
  1. **Incoming Inspection (`/quality/incoming-inspection`):** Integrates Quarantine Gate Entry and Goods Receipt QC Inspection into a unified inspection console.
  2. **Process Inspection (`/quality/process-inspection`):** In-process assembly stage tolerance checks, parameter tests, and snag logging.
  3. **PDI (`/quality/pdi`):** Pre-Delivery Inspection, zero-snag checklist verification, and final trial sign-off before dispatch unlock.
  4. **Master (`/quality/master`):** Button-type sub-tabs for Checklists, Defect Codes, Acceptance Standards, and Instruments & Calibration.

---

### Module 7: Store & Material Management (`/store`)
* **Purpose:** Governs the 4-bucket inventory ledger and enforces **Hard Allocation Locking** to target Project IDs.
* **Current State:**
  * Backend: `inventory.controller.js`, `allocation.controller.js` with models and routes.
  * Frontend: `/store/inventory`, `/store/allocations` backed by `storeApi.ts`.
* **Planned Milestones & Enhancements:**
  1. **4-Bucket Inventory Ledger:**
     * `Ordered`: Open PO quantities.
     * `In-QC`: Quarantined gate inward items.
     * `Accepted`: Physical stock cleared by incoming QC.
     * `Issued`: Materials dispatched to production shop floor.
  2. **Strict Hard Allocation Locking:**
     * Material cleared for `PRJ-XXXX` is hard-locked to that specific Machine Work Order.
     * System strictly prohibits diversion to other machines unless an explicit Managerial Stock Transfer Approval is authorized and logged in the audit trail.
  3. **Material Issue Slips (MIS):** Digital shop floor requisition matching BOM part numbers with barcode/batch verification.

---

### Module 8: Production & Assembly Trials (`/production-trial`)
* **Purpose:** Orchestrates multi-stage machine assembly, stage gate role sign-offs, and machine dry/wet testing logs.
* **Current State:**
  * Backend: `assembly.controller.js`, `trial.controller.js` with models and routes.
  * Frontend: `/production-trial/assembly`, `/production-trial/trials` backed by `productionTrialApi.ts`.
* **Planned Milestones & Enhancements:**
  1. **Configurable Assembly Workflow:** Support parallel sub-assembly lines (Mechanical frame, Pneumatics, Electrical panel) converging into main assembly.
  2. **Stage Gate Quality Sign-Offs:** Mandatory sign-offs by Assembly Lead, Electrical Lead, and Plant QC Engineer before proceeding to trial phase.
  3. **Machine Dry & Wet Run Trial Logs:**
     * Trial test run parameters (RPM, winding tension, cycle time, thermal rise, vibration).
     * Snag Logging: Capture snags with severity (`Critical`, `Major`, `Minor`), description, photos, and designated technician.

---

### Module 9: Dispatch & Pre-Shipment Clearance (`/dispatch`)
* **Purpose:** Enforces pre-dispatch gating, packing list validation, shipping dossier compilation, and project completion.
* **Current State:**
  * Backend: `dispatch.controller.js` with `dispatchOrder.model.js`.
  * Frontend: `/dispatch/verification` backed by `dispatchApi.ts`.
* **Planned Milestones & Enhancements:**
  1. **Absolute Zero-Snag Block:**
     * Pre-dispatch gate pass button is hard-disabled until 100% of reported assembly and trial snags (regardless of severity) are verified as resolved and signed off by QC.
  2. **Comprehensive Shipping Dossier:**
     * Automatically compiles FAT report, signed QC inspection sheet, calibration certificates, machine electrical schematic, and customer manual.
  3. **Multi-Crate Packing List Builder:** Track box dimensions, gross/net weight, and center of gravity for export/domestic transport.

---

### Module 10: After Sales Service & Warranty (`/after-sales`)
* **Purpose:** Post-commissioning support, warranty monitoring, field service snags, and spare parts ordering.
* **Current State:**
  * Backend: `serviceTicket.controller.js` with `serviceTicket.model.js`.
  * Frontend: `/after-sales/warranty` backed by `afterSalesApi.ts`.
* **Planned Milestones & Enhancements:**
  1. **Machine Warranty Ledger:** Calculates warranty expiry based on dispatch date or commissioning sign-off date.
  2. **Field Service Ticket Management:** Service engineer visit logging, field snag resolution, and customer satisfaction sign-offs.
  3. **Preventive Maintenance Schedules (PMS):** Automated schedule reminders for 30-day, 90-day, and 1-year lubrication, belt tensioning, and sensor calibration.
  4. **Emergency Spare Parts Dispatch:** Fast-track requisition linked back to the original machine BOM part numbers.

---

### Module 11: Master Data Management (`/masters`)
* **Purpose:** Single source of truth for enterprise master records. Employs a Dual-Tier Access Architecture: Universal read-only API access (`/api/masters/lookup`) across all operational modules for dropdowns/lookups, while management screens and mutations are strictly protected by RBAC (Super Admin, Master Data Administrator).
* **The 11 Dedicated Tabs:**
  1. **Vendor (`/masters/vendors`):** Approved supplier directory, GSTIN, MSME, bank details, ratings (1–5), categories.
  2. **Customer (`/masters/customers`):** Enterprise buyer directory, industrial segments, GSTIN, billing/shipping contacts.
  3. **Store Location (`/masters/locations`):** Plants (Unit 1 Bhosari, Unit 2 Chakan), warehouse zones, racks, and bin coordinates for stock hard-locking.
  4. **Category (`/masters/categories`):** Enterprise classification for RM, BO, Machined Components, Subassemblies, and Finished Machines.
  5. **RM Items (`/masters/rm-items`):** Raw materials (bright steel bars, alloy steels, aluminum plates, stainless sheets) with grades and standard cost/KG.
  6. **BO Items (`/masters/bo-items`):** Bought-out components (servo motors, planetary gearboxes, linear rails, valves, bearings) with approved brands and mandatory QC toggles.
  7. **Component (`/masters/components`):** Machined/fabricated parts (spindles, flanges, brackets) linked to RM references and CAD drawings.
  8. **Subassembly (`/masters/subassemblies`):** Modular Level 1 assemblies (winding heads, tensioners, turret carousels) for production assembly stages.
  9. **Assembly (`/masters/assemblies`):** Level 0 complete finished machine models (coil winders, 5-axis CNC platforms) with lead times and base prices.
  10. **Company Profile (`/masters/company-profile`):** MH purchasing/selling entities, factory plant addresses, GSTIN, PAN, bank accounts, and PO/Quote legal terms.
  11. **Setting (`/masters/settings`):** System-wide settings: UOM directory with discrete/continuous validation, currencies with permanent exchange rate locking, and GST tax slabs.
* **Current State:**
  * Backend: `master.controller.js` with 11 domain handlers and universal `/lookup` endpoint mounted at `/api/v1/masters` and `/api/masters`.
  * Frontend: Configured 11 tabs in `modules.config.ts`, 11 tab components in `frontend/src/modules/masters/components/`, route pages in `frontend/src/app/(dashboard)/masters/`, RTK query slice `mastersApi.ts`, and shared hook `useMasterLookup.ts`.

---

## 5. Implementation Phases & Milestones

| Phase | Scope | Focus Areas | Deliverables |
|---|---|---|---|
| **Phase 1** | **Core Spine & CRM Lead-to-Order** | Modules 1, 2, 3 | Granular RBAC, Excel Bulk Import, Quotations with locked exchange rates, `PRJ-XXXX` atomic creation. |
| **Phase 2** | **Engineering BOM & Net Procurement** | Modules 4, 5 | 3-Level BOM configurator, CAD watermarking, ECO Freeze, Net Demand calculation, Multi-tier PO approvals. |
| **Phase 3** | **Quality Inward & Store Hard-Locking** | Modules 6, 7 | Gate Entry, Quarantine holding, QC clearance, 4-Bucket inventory, Hard Project Allocation Locking. |
| **Phase 4** | **Production Assembly, Trials & Snags** | Module 8 | Multi-stage assembly gates, Trial run parameter logs, Snag tracking engine. |
| **Phase 5** | **Zero-Snag Dispatch & Project Closure** | Module 9 | Absolute Zero-Snag Block enforcement, Shipping dossier compilation, Gate Pass issuance. |
| **Phase 6** | **After Sales, Warranty & Field Maintenance** | Module 10 | Warranty ledger, Service ticket workflow, PMS reminders, Spare parts linkage to BOM. |

---

## 6. Verification & Quality Standards (Agent Compliance)

* **No Automated Browser Subagents:** All verification must be performed using command-line tools (e.g. `curl`, node scripts, `npm test`) or code inspection.
* **No Git Commits by Agent:** All git commits must be performed manually by the human user.
* **High Contrast & Responsive UI:** Verified across mobile (< 768px), tablet (768px-1023px), and desktop (≥ 1280px).
* **Pure Tailwind CSS v3:** Zero inline `style={{ ... }}` objects; standard tokens for button-type tabs, modals, and white amber-stripe header ribbons.
