# Machine House Frontend Directives & Rules (Next.js + Redux + RTK Query)

> Scope: Applies to all frontend development within `f:/mht/frontend`.
> 
> **OWASP Top 10 Reference Standard:**
> *"The OWASP Top 10 is the reference standard for the most critical web application security risks. Adopting the OWASP Top 10 is perhaps the most effective first step towards changing your software development culture focused on producing secure code."*

---

## 1. Brand Identity & Visual Rules (100% Pure Tailwind CSS v3 — Modern UI/UX Mandate)
* **Brand Name:** Machine House - Winding Technologies ("House of Innovations.....")
* **Styling Framework:** **Tailwind CSS v3 (v3.4.x)** + PostCSS with configured brand colors and utility classes.
* **Mandatory Modern UI & UX Rule:**
  * **100% Tailwind CSS Everywhere:** Strictly zero ad-hoc inline `style={{ ... }}` objects and zero raw CSS variable overrides. All pages (Landing Page `/`, Login `/login`, and all 10 module dashboards) must be built exclusively with Tailwind CSS utility classes.
  * **Modern Visual Aesthetics:** Clean, executive industrial light theme with generous whitespace, crisp slate borders (`border-slate-200`), rounded cards (`rounded-xl` / `rounded-2xl`), subtle shadows (`shadow-xs` / `shadow-sm`), and responsive micro-interactions.
  * **Full Multi-Device Responsiveness:** Every layout must adapt seamlessly to **Mobile** (touch targets ≥ 44px, sticky bottom navigation, touch cards), **Tablet** (fluid 2-column grids), and **Desktop** (high-density data tables and split showcases).
  * **Mandatory Button-Type Tabs (Zero Line-Underline Tabs):** Across the ENTIRE frontend, all module tabs, sub-tabs, filter switchers, and view selectors MUST be styled as **modern button-type (pill / segmented button) tabs** (`rounded-xl` / `rounded-2xl`). Active tabs MUST use Safety Orange button fill (`bg-orange-500 text-white font-semibold shadow-xs shadow-orange-500/20`) or elevated white card button with subtle slate borders (`bg-white text-orange-600 font-bold border border-slate-200 shadow-xs`). Inactive tabs use soft hover surfaces (`bg-slate-100 text-slate-600 hover:bg-slate-200` or `text-slate-600 hover:text-slate-900 hover:bg-slate-100`). Traditional line-underline tabs (`border-b-2`) are strictly prohibited everywhere.
  * **Standardized Form & Modal Sizing System Across Devices (Desktop, Laptop, Tablet, Mobile):**
    Across the ENTIRE frontend, all creation forms, edit drawers, and modal dialogs MUST use standard sizing utility classes:
    * **Desktop Monitors (≥ 1280px / `xl:` & `2xl:`):**
      * **Master / Expansive Forms (Customer Master, BOM Configurator, Product Master, PO Builder):** Standard width `w-full max-w-6xl xl:max-w-7xl` with `max-h-[92vh]`. Spacious multi-column layout (`lg:grid-cols-12` or dual-column), generous padding (`p-6` to `p-8`), expansive whitespace, and large touch targets.
      * **Standard Action Forms (Add User, Role Assignment, Gate Entry, Log QC):** Standard width `w-full max-w-3xl lg:max-w-4xl` with `max-h-[90vh]` in a clean 2-column grid (`grid-cols-1 sm:grid-cols-2`).
      * **Compact / Quick Action Forms (Add Category, Quick Note, Status Update):** Standard width `w-full max-w-lg lg:max-w-xl`.
      * **Confirmation & Alert Dialogs:** Compact standard width `w-full max-w-md` (448px).
    * **Laptops (1024px to 1279px / `lg:`):**
      * **Master Forms:** Fluid fit `w-full max-w-5xl lg:max-w-6xl` with `max-h-[90vh]`, internal scrollable body (`overflow-y-auto`), and sticky headers/footers.
      * **Standard Action Forms:** `w-full max-w-2xl lg:max-w-3xl` with `max-h-[88vh]`.
    * **Tablets (768px to 1023px / `md:`):**
      * **All Modals:** Fluid width `w-full max-w-2xl` with `p-4 sm:p-5`, `max-h-[85vh]`, adaptive 1-to-2 column layout (`grid-cols-1 sm:grid-cols-2`), touch targets ≥ 44px, and sticky footers with touch-friendly action buttons.
    * **Mobile Phones (< 768px / Default):**
      * **All Forms & Modals:** Native slide-up bottom sheet or full-width sheet (`w-full inset-x-0 bottom-0 rounded-t-2xl sm:rounded-2xl`), single-column stacked layout (`grid-cols-1`), touch targets ≥ 44px, and sticky bottom action bar pinned above virtual keyboard.
  * **Mandatory Form & Modal Top Header Ribbon Standard (Crisp White Header with Amber/Yellow Top Accent Stripe):**
    Across the ENTIRE frontend, every modal, drawer, form card, and dialog header ribbon MUST strictly use a **Crisp White Header with an Industrial Amber/Yellow Top Accent Stripe**:
    * **Header Container:** `bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs`.
    * **High-Contrast Dark Slate Typography:** Modal titles use bold/extrabold dark slate text (`text-slate-900 text-base font-extrabold tracking-tight`); subtitles/guidance use crisp slate metadata (`text-[11px] text-slate-500 font-medium`).
    * **Accent Icon Badge:** Prominent icon badge in an energetic amber/orange surface (`w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0`).
    * **Light-Surface Close Button:** Subtle light hover close button (`text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors`).
    * **Zero Dark Mode Headers:** Strictly NO dark/black headers (`bg-slate-900` or `bg-black` are strictly prohibited) across all modals, drawers, and form cards in the application.
  * **Unified Informal & Human-Friendly Tone for Messages, Alerts & Confirmations (Single Component Standard):**
    Across the ENTIRE frontend, all user messages, validation alerts, toasts, and confirmation dialogs MUST follow a unified, informal, conversational, and direct human tone:
    * **Single Informal & Conversational Voice:** Strictly NO robotic error codes (e.g. *"Error 500: Database insertion failed"*), NO cold legalese (e.g. *"Are you sure you want to execute permanent entity deletion?"*), and NO vague alerts (e.g. *"An error occurred"*). Always use warm, friendly, conversational, and actionable English:
      * *Success:* *"All set! Customer details saved successfully."* / *"Great! Changes updated."*
      * *Helpful Fix / Error:* *"We couldn't save this right now. Please check the required fields and try again."*
      * *Confirmation:* *"Delete this customer? Once removed, you won't be able to recover this record."*
      * *Warning / Heads-Up:* *"Just a heads up: this machine has pending QC snags before dispatch can unlock."*
      * *Info:* *"Copied to clipboard!"*
    * **Zero Native Browser Popups:** Strictly NO raw `window.confirm()` or `window.alert()`. All confirmations MUST use a unified, friendly MH Confirmation Dialog component with conversational phrasing and clear, friendly buttons (*"Keep it"* vs *"Yes, delete"*).
    * **Single Floating Toast Standard:** Fixed bottom-right (`fixed bottom-6 right-6 z-50`), rounded-xl, shadow-2xl, auto-dismiss 4.5s, with 4 standardized color states (Emerald for Success, Crimson for Error, Amber for Notice, Slate for Info).
  * **Mandatory Exact Excel-Style Table Header Filters Standard:**
    Whenever an "Excel style filter" or "Excel filter" is requested for any table across the application, it MUST be implemented according to the standardized `ExcelColumnFilter` architecture:
    * **Header-Embedded Funnel Trigger (Zero Clunky Secondary Rows):** The filter trigger button (funnel icon `Filter`) MUST be embedded directly inside each table header cell (`<th className="...">`), sitting inline next to the column title. Strictly NO secondary rows of text inputs (`<input>`) or dropdown selects (`<select>`) below the header that waste vertical screen space.
    * **Floating Excel-Style Popover Dialog:** Clicking the header filter trigger opens a floating popover (`w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50`) containing:
      1. **Sorting Controls:** One-click "Sort A to Z (Ascending)" and "Sort Z to A (Descending)" buttons with active checkmark indicators.
      2. **Live In-Popover Search:** Instant search input (`Search values...`) with clear button to quickly filter down distinct value lists.
      3. **(Select All) Toggle:** Checkbox toggle that selects or deselects all currently visible values.
      4. **Distinct Values Checklist with Counts:** Scrollable checklist displaying every unique value present in the dataset along with its frequency count (e.g. `[✓] Maharashtra (12)`).
      5. **Footer Action Buttons:** Clean `Clear Filter` and Safety Orange `Apply` buttons.
    * **Safety Orange Visual Filter State:** When a column filter is actively applied, its header funnel button illuminates in Safety Orange (`bg-orange-500 text-white shadow-xs`) with a filled icon. When sorting alone is applied, it reflects an active slate state.
    * **Global "Reset Filters" Toolbar Button:** When any column filter or global search is active, the table toolbar displays a compact Safety Orange button (`Reset Filters` with `RotateCcw` icon) to clear all active column filters and search inputs in a single click.
    * **Shared Component Reference:** Always utilize or reference the shared component at `frontend/src/components/ui/ExcelColumnFilter.tsx`.
* **Color Tokens:**
  * Primary Brand Accent: Safety Orange (`#FF6A00`, hover `#E65F00`, light tint `#FFF7ED`, border `#FED7AA` / Tailwind: `bg-orange-500`, `hover:bg-orange-600`, `text-orange-600`, `border-orange-200`).
  * Canvas Background: Clean Slate Canvas (`#F8FAFC` / `bg-slate-50`) — Crisp, glare-free, executive plant aesthetic. Zero dark mode.
  * Elevated Surfaces & Cards: Crisp White (`#FFFFFF` / `bg-white`) with subtle slate borders (`border-slate-200`).
  * High-Contrast Typography: Deep Slate Charcoal (`#0F172A` / `text-slate-900`) for titles/headings, `#64748B` (`text-slate-500` / `text-slate-600`) for secondary captions.
  * Semantic Accents: Emerald (`bg-emerald-50 text-emerald-700 border-emerald-200`), Amber (`bg-amber-50 text-amber-700 border-amber-200`), Crimson (`bg-red-50 text-red-700 border-red-200`), Azure (`bg-sky-50 text-sky-700 border-sky-200`).
* **Zero Narrative Text Blocks:** Avoid verbose explanatory blocks and introductory text banners across all module tabs. Rely exclusively on compact KPI chips, clear breadcrumbs, and direct data tables.
* **Meaningful Forms & Actionable Error Messages:** Form fields include inline helper guidance; validations and API errors must provide clear, human-readable, and actionable fix instructions (surfaced via in-app toast notifications), never raw dumps or generic alerts.
* **Desktop Sidebar Navigation:** Operational lifecycle sequence without serial numbers (`1.`, `2.`, etc.).
* **Assets:**
  * Logo Icon: `/branding/mh_icon.png` (always styled with `className="object-contain"`)
  * Logo Nameplate: `/branding/mh_logo_plate.png` (always styled with `className="object-contain"`)
* **Typography:**
  * Headings & Badges: `Outfit`, system-ui, sans-serif
  * Body & Technical Grids: `Inter`, sans-serif / monospace

---

## 2. The 10 Modules & Route-Based Tab Architecture
The sidebar hosts all 10 operational modules. Every module contains sub-tabs, and **each module and sub-tab maps to a dedicated Next.js App Router URL route**:

1. **Admin (`/admin`)**
   * Tabs: `/admin/users` (User management with configurable Refresh Token Expiry field upon creation/editing), `/admin/roles`, `/admin/ip-whitelist`, `/admin/masters`, `/admin/audit-logs`
2. **CRM (`/crm`)**
   * Tabs: `/crm/leads`, `/crm/bulk-import`, `/crm/quotations`, `/crm/deals`
3. **Project Setup (`/project-setup`) [Central Spine]**
   * **Rule:** Generates the **Unique Project ID** (`PRJ-XXXX` / `WO-XXXX`). All subsequent progress across Design, Purchase, Quality, Store, Production, Dispatch, and After Sales is tracked against this unique ID.
   * Tabs: `/project-setup/projects`, `/project-setup/templates`, `/project-setup/schedule-baselines`, `/project-setup/revisions`
4. **Design (`/design`)**
   * Tabs: `/design/bom`, `/design/cad-drawings`, `/design/eco`
5. **Purchase (`/purchase`)**
   * Tabs: `/purchase/demand`, `/purchase/orders`, `/purchase/vendors`, `/purchase/follow-up`
6. **Incoming Quality (`/incoming-quality`)**
   * Tabs: `/incoming-quality/gate-entry`, `/incoming-quality/inspections`, `/incoming-quality/rtv`, `/incoming-quality/analytics`
7. **Store (`/store`)**
   * Tabs: `/store/inventory-buckets`, `/store/allocations`, `/store/material-issue`, `/store/transfers`
8. **Production & Trial (`/production-trial`)**
   * Tabs: `/production-trial/assembly-lines`, `/production-trial/stage-gates`, `/production-trial/trials-snags`
9. **Dispatch (`/dispatch`)**
   * Tabs: `/dispatch/pre-dispatch-gate`, `/dispatch/packing-slips`, `/dispatch/dossier`
10. **After Sales (`/after-sales`)**
    * Tabs: `/after-sales/commissioning`, `/after-sales/warranty`, `/after-sales/spares`, `/after-sales/service-tickets`

*(Note: Tabs will be expanded and refined incrementally as instructed).*

---

## 3. Directory Layout: Mirrored Modular Architecture
**Strict Separation of Concerns Rule:** Mirrored directly after the backend architecture, the frontend organizes each module in its own feature directory under `src/modules/<module-slug>/` with dedicated sub-folders (`components/`, `api/`, `hooks/`). Every tab has its own separate component and separate RTK Query API file:

```
frontend/
├── public/
│   └── branding/                        # mh_icon.png, mh_logo_plate.png
├── src/
│   ├── app/                             # Next.js App Router (Page Routing Layer)
│   │   ├── (auth)/
│   │   │   └── login/page.jsx           # Universal Dual Mode (Google OAuth + Password)
│   │   └── (dashboard)/
│   │       ├── layout.jsx               # Dashboard Shell (Sidebar, Header, Ctrl+K)
│   │       ├── admin/
│   │       │   ├── layout.jsx           # Admin TabNav bar layout
│   │       │   ├── page.jsx             # Redirects to /admin/users
│   │       │   ├── users/page.jsx       # Route: /admin/users
│   │       │   ├── roles/page.jsx       # Route: /admin/roles
│   │       │   ├── ip-whitelist/page.jsx # Route: /admin/ip-whitelist
│   │       │   ├── masters/page.jsx     # Route: /admin/masters
│   │       │   └── audit-logs/page.jsx  # Route: /admin/audit-logs
│   │       ├── crm/                     # Route pages for CRM tabs
│   │       ├── project-setup/           # Route pages for Project Setup tabs (Spine)
│   │       ├── design/                  # Route pages for Design tabs
│   │       ├── purchase/                # Route pages for Purchase tabs
│   │       ├── incoming-quality/        # Route pages for Quality tabs
│   │       ├── store/                   # Route pages for Store tabs
│   │       ├── production-trial/        # Route pages for Production tabs
│   │       ├── dispatch/                # Route pages for Dispatch tabs
│   │       └── after-sales/             # Route pages for After Sales tabs
│   ├── modules/                         # Modular Sub-Folder Structure (Mirrors Backend)
│   │   ├── admin/
│   │   │   ├── components/              # Separate component per tab
│   │   │   │   ├── UserManagement.jsx   # Users tab view & table
│   │   │   │   ├── RolePermissions.jsx  # Role & tab route matrix view
│   │   │   │   ├── IpWhitelist.jsx      # IP whitelist manager view
│   │   │   │   ├── GlobalMasters.jsx    # Global item & entity masters view
│   │   │   │   └── AuditLogs.jsx        # Audit log viewer
│   │   │   ├── api/                     # Separate RTK Query slice per sub-domain
│   │   │   │   ├── adminUser.api.js
│   │   │   │   ├── adminRole.api.js
│   │   │   │   ├── adminIp.api.js
│   │   │   │   ├── adminMasters.api.js
│   │   │   │   └── adminAudit.api.js
│   │   │   └── hooks/                   # useAdminUsers.js, useRolePermissions.js
│   │   ├── crm/
│   │   │   ├── components/              # LeadList.jsx, BulkExcelImport.jsx, QuoteBuilder.jsx
│   │   │   ├── api/                     # crmLead.api.js, crmQuote.api.js, crmImport.api.js
│   │   │   └── hooks/
│   │   ├── project-setup/               # Central Spine
│   │   │   ├── components/              # ProjectList.jsx, ProjectCreator.jsx, TemplateManager.jsx
│   │   │   ├── api/                     # project.api.js, template.api.js
│   │   │   └── hooks/
│   │   ├── design/
│   │   │   ├── components/              # BomTree.jsx, CadViewer.jsx, EcoManager.jsx
│   │   │   ├── api/                     # designBom.api.js, designCad.api.js, designEco.api.js
│   │   │   └── hooks/
│   │   ├── purchase/
│   │   │   ├── components/              # NetDemand.jsx, PoManager.jsx, VendorFollowup.jsx
│   │   │   ├── api/                     # purchaseDemand.api.js, purchasePo.api.js, purchaseVendor.api.js
│   │   │   └── hooks/
│   │   ├── incoming-quality/
│   │   │   ├── components/              # GateEntry.jsx, QwInspection.jsx, RtvTracker.jsx
│   │   │   ├── api/                     # qualityGate.api.js, qualityInspection.api.js, qualityRtv.api.js
│   │   │   └── hooks/
│   │   ├── store/
│   │   │   ├── components/              # StockBuckets.jsx, AllocationLocks.jsx, MaterialIssue.jsx
│   │   │   ├── api/                     # storeStock.api.js, storeAllocation.api.js, storeIssue.api.js
│   │   │   └── hooks/
│   │   ├── production-trial/
│   │   │   ├── components/              # AssemblyLine.jsx, StageGates.jsx, TrialSnags.jsx
│   │   │   ├── api/                     # productionAssembly.api.js, productionGate.api.js, productionSnag.api.js
│   │   │   └── hooks/
│   │   ├── dispatch/
│   │   │   ├── components/              # PreDispatchGate.jsx, PackingSlip.jsx, Dossier.jsx
│   │   │   ├── api/                     # dispatchGate.api.js, dispatchPacking.api.js
│   │   │   └── hooks/
│   │   └── after-sales/
│   │       ├── components/              # Commissioning.jsx, WarrantyTracker.jsx, SpareOrder.jsx
│   │       ├── api/                     # afterSalesWarranty.api.js, afterSalesSpares.api.js
│   │       └── hooks/
│   ├── components/
│   │   ├── layout/                      # Sidebar.jsx, Header.jsx, TabNav.jsx, CommandPalette.jsx (Ctrl+K)
│   │   ├── pipeline/                    # Global Project Lifecycle Tracker (Stage 1 to 10)
│   │   └── ui/                          # Button, Modal, DataTable, Badge, Input, StatusPill, Toast
│   ├── store/
│   │   ├── index.js                     # Central Redux store
│   │   ├── apiSlice.js                  # Base RTK Query apiSlice with tag types & baseQuery
│   │   └── slices/
│   │       ├── authSlice.js             # User token, profile & allowedRoutes
│   │       └── uiSlice.js               # Theme, sidebar toggle
│   ├── styles/
│   │   └── globals.css                  # CSS custom properties, brand tokens, glassmorphism utilities
│   └── utils/                           # Formatters, route permission check helpers
├── package.json
└── next.config.mjs
```

---

## 4. Mandatory Frontend Architectural Rules
1. **Mirrored Modular Separation:** Every tab has its own separate UI component in `src/modules/<module-slug>/components/<TabComponent>.jsx` and its own separate RTK Query slice in `src/modules/<module-slug>/api/<TabApi>.api.js`. No monolithic multi-thousand-line UI components!
2. **Route-Based Tab Navigation:** Active tabs are driven strictly by the URL pathname (e.g., `usePathname()`). Clicking a tab transitions to that route.
3. **Route Guard & RBAC:** Before rendering any tab, compare the active route against `auth.user.allowedRoutes`. If unauthorized, render a clean 403 Access Restricted plate.
4. **Command Palette (`Ctrl + K`):** Quick jump modal allowing instant search across projects (`PRJ-XXXX`), BOM parts, drawings, and POs.
5. **Theme Switcher:** Seamless toggle between industrial dark mode (`[data-theme="dark"]`) and crisp metallic light mode.
6. **Direct 1-to-1 Backend Module Alignment:** Frontend RTK Query endpoints map 1-to-1 to each backend module's controller routes (`/api/v1/<module-slug>/<sub-domain>`).
7. **Action Tracking & Deactivation UI:** The UI must display actor information (`createdBy`, `updatedBy`) and timestamps across record headers and tables. In User Management, users cannot be deleted; provide an Active / Deactivated toggle switch with confirmation.
8. **Mobile & Tablet Native UI (Sticky Bottom Tab Bar):** On mobile devices (`< 768px`) and portrait tablets, the desktop top TabNav transforms into a **sticky bottom icon navigation bar** (4 primary tabs + 'More (⋯)' slide-up drawer). Top header hamburger opens a slide-in drawer for the 10 core modules. Forms use slide-up bottom sheets, and wide tables transform into responsive touch-friendly cards.
9. **Context-Aware Currency Formatting:** Use `src/utils/formatters.js` to format INR values using Indian numbering (`₹12,50,000.00` via `en-IN`) and foreign currencies with international standards (`$15,000.00`). Quotes and POs show dual display (foreign amount + converted base INR value with locked exchange rate).
10. **Dual Unit Synchronized Inputs:** Forms handling materials with alternate units automatically synchronize Base and Alternate quantities bidirectionally using the item's conversion ratio, preventing decimal inputs on discrete units (`Nos`, `Pcs`).
