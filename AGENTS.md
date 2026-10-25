# Machine House (MH) ERP — Master System Directives & Rules

> **Company Profile:** **Machine House - Winding Technologies** ("House of Innovations.....")  
> **System Scope:** Engineer-to-Order (ETO) Manufacturing Execution & Resource Planning System  
> **Workspace Root:** `f:/mht`  
> **Frontend Directory:** `f:/mht/frontend` (Next.js, Redux Toolkit, RTK Query)  
> **Backend Directory:** `f:/mht/backend` (Express.js, MongoDB / Mongoose, AWS S3)

---

## 1. Brand Identity & Modern UI/UX Mandate (100% Pure Tailwind CSS v3 — Zero Dark Mode, Zero Inline Styles)
The entire user interface and user experience across the Landing Page (`/`), ERP Authentication (`/login`), and all 10 Module Dashboards MUST strictly adhere to the official corporate identity of **Machine House - Winding Technologies** in a modern, responsive, high-contrast, clean **Light Theme using pure Tailwind CSS utility classes exclusively**:
* **Mandatory Tailwind CSS Standard:**
  * **100% Tailwind CSS Everywhere:** Every single page, component, modal, drawer, form, card, and table MUST be styled using configured Tailwind CSS utility classes. Strictly NO ad-hoc inline `style={{ ... }}` objects and NO legacy CSS variable overrides.
  * **Modern Industrial UI & UX:** Ultra-modern aesthetic with generous whitespace, subtle slate borders (`border-slate-200`), rounded industrial surfaces (`rounded-xl` / `rounded-2xl`), refined drop shadows (`shadow-xs` / `shadow-sm`), and smooth hover micro-animations (`transition-all duration-150`).
  * **Full Multi-Device Responsiveness:** Pixel-perfect layouts adapted seamlessly for **Mobile Phones** (touch targets ≥ 44px, bottom sticky navigation, collapsible accordions), **Tablets** (fluid 2-column grids), and **Desktop Monitors** (high-density split views and data tables).
  * **Mandatory Button-Type Tabs (Zero Line-Underline Tabs):** Across the ENTIRE application, all module tabs, sub-tabs, filters, and view-switchers MUST be styled as **modern button-type (pill / segmented button) tabs** (`rounded-xl` / `rounded-2xl`). Active tabs MUST use Safety Orange button fill (`bg-orange-500 text-white font-semibold shadow-xs shadow-orange-500/20`) or elevated white card button with subtle slate borders (`bg-white text-orange-600 font-bold border border-slate-200 shadow-xs`). Inactive tabs use soft hover surfaces (`bg-slate-100 text-slate-600 hover:bg-slate-200` or `text-slate-600 hover:text-slate-900 hover:bg-slate-100`). Traditional line-underline tabs (`border-b-2`) are strictly prohibited everywhere.
  * **Standardized Form & Modal Sizing Across Devices (Desktop, Laptop, Tablet, Mobile):**
    Across the ENTIRE application, all modals, dialogs, drawers, and creation/edit forms MUST follow strict standard sizing tokens:
    * **Desktop Monitors (≥ 1280px / `xl:` & `2xl:`):**
      * **Master / Expansive Forms (e.g. Customer Master, BOM Configurator, Product Master, PO Builder):** Standard width `w-full max-w-6xl xl:max-w-7xl` with `max-h-[92vh]`. Spacious multi-column layout (`lg:grid-cols-12` or dual-column), generous whitespace (`p-6` to `p-8`), expansive viewing room, and large touch targets.
      * **Standard Action Forms (e.g. Add User, Role Assignment, Gate Entry, Log Inspection):** Standard width `w-full max-w-3xl lg:max-w-4xl` with `max-h-[90vh]` in a clean 2-column grid (`grid-cols-1 sm:grid-cols-2`).
      * **Compact / Quick Action Forms (e.g. Add Category, Quick Note, Status Update):** Standard width `w-full max-w-lg lg:max-w-xl`.
      * **Confirmation & Alert Dialogs:** Compact standard width `w-full max-w-md` (448px).
    * **Laptops (1024px to 1279px / `lg:`):**
      * **Master Forms:** Fluid fit `w-full max-w-5xl lg:max-w-6xl` with `max-h-[90vh]`, internal scrollable body (`overflow-y-auto`), and sticky headers/footers.
      * **Standard Action Forms:** `w-full max-w-2xl lg:max-w-3xl` with `max-h-[88vh]`.
    * **Tablets (768px to 1023px / `md:`):**
      * **All Modals:** Fluid width `w-full max-w-2xl` with `p-4 sm:p-5`, `max-h-[85vh]`, adaptive 1-to-2 column layout (`grid-cols-1 sm:grid-cols-2`), touch targets ≥ 44px, and sticky footers with touch-friendly action buttons.
    * **Mobile Phones (< 768px / Default):**
      * **All Forms & Modals:** Native slide-up bottom sheet or full-width sheet (`w-full inset-x-0 bottom-0 rounded-t-2xl sm:rounded-2xl`), single-column stacked layout (`grid-cols-1`), touch targets ≥ 44px, and sticky bottom action bar pinned above virtual keyboard.
  * **Mandatory Form & Modal Top Header Ribbon Standard (Crisp White Header with Amber/Yellow Top Accent Stripe):**
    Across the ENTIRE application, every modal, drawer, form card, and dialog header ribbon MUST strictly use a **Crisp White Header with an Industrial Amber/Yellow Top Accent Stripe**:
    * **Header Container:** `bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs`.
    * **High-Contrast Dark Slate Typography:** Modal titles use bold/extrabold dark slate text (`text-slate-900 text-base font-extrabold tracking-tight`); subtitles/guidance use crisp slate metadata (`text-[11px] text-slate-500 font-medium`).
    * **Accent Icon Badge:** Prominent icon badge in an energetic amber/orange surface (`w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0`).
    * **Light-Surface Close Button:** Subtle light hover close button (`text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors`).
    * **Zero Dark Mode Headers:** Strictly NO dark/black headers (`bg-slate-900` or `bg-black` are strictly prohibited) across all modals, drawers, and form cards in the application.
  * **Unified Informal & Human-Friendly Tone for Messages, Alerts & Confirmations (Single Component Standard):**
    Across the ENTIRE application, all user messages, validation alerts, system toasts, and confirmation dialogs MUST follow a unified, informal, conversational, and direct human tone:
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
* **Primary Brand Accent (Safety Orange):** `#FF6A00` / `#FF7700` (`bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white`, `text-orange-600`, `border-orange-200`) — Used for primary CTAs, active indicators, milestone progress, and interactive highlights.
* **Main Canvas Background:** `#F8FAFC` (`bg-slate-50`) — Crisp, glare-free, executive plant aesthetic. Zero dark mode.
* **Elevated Surface / Cards / Header:** `#FFFFFF` (`bg-white`) with subtle slate borders (`border-slate-200`).
* **High-Contrast Industrial Typography:** `#0F172A` (`text-slate-900`) for headings/data, `#64748B` (`text-slate-500` / `text-slate-600`) for crisp secondary metadata.
* **Component States:**
  * **QC Accepted / Pass:** Industrial Emerald (`#059669` / Surface: `bg-emerald-50` / Border: `border-emerald-200` / Text: `text-emerald-700`)
  * **Quarantine / In-QC / Pending:** Safety Amber (`#D97706` / Surface: `bg-amber-50` / Border: `border-amber-200` / Text: `text-amber-700`)
  * **Defects / Snags / ECO Freeze:** High-Voltage Crimson (`#DC2626` / Surface: `bg-red-50` / Border: `border-red-200` / Text: `text-red-700`)
  * **CAD / Engineering Blue:** Precision Azure (`#0284C7` / Surface: `bg-sky-50` / Border: `border-sky-200` / Text: `text-sky-700`)
* **Brand Assets:**
  * Circular Icon: `assets/branding/mh_icon.png` (or `/branding/mh_icon.png` in frontend with `className="object-contain"`)
  * Corporate Nameplate: `assets/branding/mh_logo_plate.png` (or `/branding/mh_logo_plate.png` in frontend with `className="object-contain"`)

---

## 2. Core Architecture & Tech Stack Rules
1. **Frontend Architecture & Mirrored Modular Structure:**
   * **Framework:** Next.js (App Router, React 19 / 18).
   * **Styling Framework:** **Tailwind CSS v3 (v3.4.x)** + PostCSS with configured brand colors, clean light surfaces, and utility classes.
   * **State & Data Fetching:** Redux Toolkit (`@reduxjs/toolkit`) + **RTK Query** for all server API endpoints, optimistic updates, and cache invalidation.
   * **Mirrored Modular Sub-Folder Rule:**
     * Structured under `frontend/src/modules/<module-slug>/` with dedicated `components/`, `api/` (RTK Query), and `hooks/` sub-folders.
     * Route pages map 1-to-1 in `src/app/(dashboard)/<module-slug>/<tab-slug>/page.jsx`.
     * Each tab has its own separate UI component and separate RTK Query endpoint file, preventing UI file bloat and maximizing human readability.
   * **Zero Narrative Text Blocks:** Strictly avoid verbose explanatory paragraphs and introductory text banners in UI tabs. Rely exclusively on compact KPI chips, clear breadcrumbs, and direct data tables.
   * **Meaningful Forms & Actionable Error Messages:** Form fields include inline helper guidance; validations and API errors must provide clear, human-readable, and actionable fix instructions (surfaced via in-app toast notifications), never raw dumps or generic alerts.
   * **Desktop Sidebar Navigation (Un-numbered Lifecycle Order):** Modules follow the exact operational lifecycle sequence (Project Setup Spine, CRM, Design, Purchase, Quality, Store, Production & Trial, Dispatch, After Sales, Admin), strictly without serial numbers (`1.`, `2.`, etc.).
   * **Mobile & Tablet Native UI (Sticky Bottom Tab Bar):** On mobile phones and portrait tablets, desktop horizontal tabs transform into a **sticky bottom icon navigation bar** (4 tabs + 'More (⋯)' slide-up sheet); top hamburger drawer switches between the 10 overarching modules; forms use slide-up bottom sheets; wide tables transform into touch cards.
2. **Backend Architecture & Modular Sub-Folder Structure:**
   * **Runtime & Framework:** Node.js + Express.js.
   * **Database:** MongoDB via Mongoose ORM.
   * **Object Storage:** AWS S3 via AWS SDK v3 using secure, short-lived **Presigned URLs** for CAD drawings, QC photos, and dispatch documents (with local development mock fallback).
   * **Authentication:** **Universal Dual Mode** supporting Google OAuth 2.0 and Corporate Email/Password credentials with JWT HttpOnly cookies + Refresh token rotation.
   * **Strict Separation of Concerns & Clean File Structure Rule:**
     * Organized under `backend/src/modules/<module-slug>/` with dedicated `controllers/`, `routes/`, and `models/` sub-folders.
     * Each distinct feature, sub-domain, or tab within a module MUST have its own separate, dedicated controller file (e.g. `user.controller.js`, `role.controller.js`), route file (e.g. `user.routes.js`, `role.routes.js`), and model file (e.g. `user.model.js`, `role.model.js`).
     * Prevents monolithic file bloat; guarantees high human readability, isolated testing, and effortless maintenance.
3. **Security, Governance & OWASP Top 10 Standards:**
   * **OWASP Top 10 Compliance:**
     > *"The OWASP Top 10 is the reference standard for the most critical web application security risks. Adopting the OWASP Top 10 is perhaps the most effective first step towards changing your software development culture focused on producing secure code."*
     The entire architecture implements controls for all 10 categories (Broken Access Control, Cryptographic Failures, Injection, Insecure Design, Security Misconfiguration, Vulnerable Components, Auth Failures, Software/Data Integrity, Logging Failures, SSRF).
   * **Pre-Registered Accounts Only:** Admins must first provision user profiles; unregistered Google accounts cannot sign up or access the system.
   * **URL Route-Based RBAC:** Every module and tab has a dedicated URL route. The Admin Panel grants and revokes access per role and per user down to the module and tab route level.
   * **IP & Location Restrictions:** Admin-configurable IP whitelisting and geo-fencing toggles per user/department.
   * **CAD Intellectual Property Protection:** View-only in-browser rendering with dynamic watermarking (User ID, Project ID, Timestamp); raw CAD downloads restricted to authorized Design Engineers.
   * **Strict User Deactivation Only:** Once created, a user account can NEVER be deleted from the database. Admins may only toggle active/deactivated status (`isActive: false`), instantly revoking access and preserving historical data integrity.
   * **Universal Action Tracking:** Every operational database schema across all 10 modules tracks `createdBy`, `updatedBy`, `createdAt`, and `updatedAt`, logging who performed each action and when.
   * **Account Lockout & Rate Limiting:** 15-minute account lockout after 5 consecutive failed login attempts; authentication endpoints capped at 10 requests/min per IP.
   * **Admin-Controlled Refresh Token Expiry:** Configured per-user during creation/editing in the Admin Panel (`/admin/users`), dynamically governing that user's session refresh lifespan (e.g. 8h for plant kiosks, 7d/30d for office staff).
   * **Immutable Audit Trail:** Append-only logging of all stage transitions, approvals, ECOs, stock movements, and access changes (tamper-proof for ISO compliance).
   * **Strict File Sanitation:** MIME-type & extension whitelisting (.step, .dwg, .dxf, .pdf, .xlsx, images) with strict rejection of executable/script extensions.
   * **Dual Currency & Locked Exchange Rates:** Base operating currency is INR (₹) with Indian numbering format (`en-IN`: Lakhs/Crores). CRM quotes and POs support foreign currencies (USD, EUR, GBP, JPY), storing `{ currency, amount, exchangeRate, baseAmountINR }` with the conversion rate permanently locked upon record creation.
   * **Dual Unit (Alternate UOM) Mathematical Normalization:** Materials supporting secondary units (e.g. Kg vs Meters, Boxes vs Pcs) store `{ baseQty, baseUom, altQty, altUom, conversionRatio }`. Inventory ledgers and BOM net purchase demand calculations normalize strictly to `baseUom`, while discrete units enforce integer constraints.

---

## 3. The 10 Core Modules & URL Route-Based Tab Architecture

All 10 modules reside in the primary sidebar navigation. Each module contains multiple sub-tabs, with **every module and tab bound to a dedicated URL route** (`/<module-slug>/<tab-slug>`), enabling direct deep-linking, browser history, and granular permission assignment from the Admin Panel.

1. **Module 1: Admin (`/admin`)**
   * Central control center for user management, role assignments, route/tab permissions matrix, plant IP whitelists, system audit logs, and global masters.
2. **Module 2: CRM (`/crm`)**
   * Customer enquiry management, lead sheets, standardized bulk Excel import with dry-run validation preview, quotations, and 1-click transition to confirmed project.
3. **Module 3: Project Setup (`/project-setup`) [Central Spine]**
   * **Core Rule:** Creates the **Unique Project ID / Master Work Order ID** (`PRJ-XXXX` / `WO-XXXX`).
   * This Unique ID serves as the single uninterrupted reference spine across the entire machine lifecycle. All subsequent progress across Design, Purchase, Quality, Store, Production & Trial, Dispatch, and After Sales is tracked and linked to this ID.
   * Project templates, milestone schedule baselines, and revision change logs.
4. **Module 4: Design (`/design`)**
   * 3-Level Hierarchical BOM (Machine $\rightarrow$ Sub-Assembly $\rightarrow$ Part Components) cloned per project.
   * AWS S3-backed controlled CAD/drawing distribution.
   * **Automated ECO Freeze Rule:** Approving an Engineering Change Order automatically freezes affected active PO lines and reserved stores stock.
5. **Module 5: Purchase (`/purchase`)**
   * BOM-driven net purchase demand calculation (Gross BOM Demand minus Available Unreserved Inventory).
   * Multi-level PO approval hierarchy, vendor follow-up tracking, and overdue delivery alerts.
6. **Module 6: Incoming Quality (`/incoming-quality`)**
   * Inward gate entry with quarantine status holding until QC clearance.
   * Goods Receipt QC logging (Accepted, Rejected, Rework).
   * Vendor Return to Vendor (RTV) tracking and Defect Root-Cause analytics.
7. **Module 7: Store (`/store`)**
   * 4-Bucket inventory states: `Ordered`, `In-QC`, `Accepted`, `Issued`.
   * **Strict Hard Allocation Locking:** QC-accepted materials are hard-locked to the target Unique Project ID; unauthorized diversion to other machines is strictly blocked without Managerial Transfer Approval.
8. **Module 8: Production & Trial (`/production-trial`)**
   * Configurable assembly workflows (parallel/sequential sub-assemblies).
   * Stage Gate Checks with mandatory role sign-offs.
   * Dry/wet run machine trials, test logs, and snag tracking.
9. **Module 9: Dispatch (`/dispatch`)**
   * **Absolute Zero-Snag Block:** 100% of snags (regardless of severity) must be resolved and QC re-inspected before pre-dispatch gate pass can unlock.
   * Packing list generation, shipping dossier, and project closure.
10. **Module 10: After Sales (`/after-sales`)**
    * Post-commissioning support, client warranty tracking, spare parts dispatch, preventive maintenance schedules, and field service snags.

*(Note: Specific sub-tabs for each module will be added and configured one by one as defined in subsequent development steps).*

---

## 4. Code & Implementation Standards
* No placeholder text or broken mock states.
* Clickable file links must always use GitHub markdown format: `[filename](file:///path/to/file)`.
* Comprehensive error handling on both client and server with descriptive toast/banner notifications.
* Complete industrial seed script provisioning realistic machine orders (*Automated Bottling Line* and *5-Axis CNC Gantry*) with active multi-level BOMs, CAD files, POs, and test accounts.
