# Zero Default Text-Based Information & Zero Dummy Data Directive

> **Scope:** Entire Machine House (MH) ERP Application (All 10 Modules, Modals, Forms, Tables, and Cards)  
> **Enforcement:** Mandatory for all AI agents and human developers.

---

## 1. Strictly Zero Default Text-Based Information Across Entire Application

The application interface must maintain a modern, uncluttered, high-contrast industrial plant aesthetic. All pages, tabs, modals, dialogs, cards, and forms must eliminate unnecessary explanatory prose and filler descriptions:

1. **Zero Subtitle & Explanatory Blurbs under Headers:**
   * Page, section, and modal headers must contain ONLY the title and icon.
   * Strictly NO explanatory subtext, guiding subtitles, or introductory paragraphs (e.g., strictly NO *"Creates the unique PRJ-XXXX / WO-XXXX master lifecycle reference spine"*, NO *"Reusable Lifecycle Stage Templates & Schedule Baselines"*, NO *"Auto-populates customer, machine, and commercial data"*).

2. **Zero Introductory / Narrative Banners:**
   * Strictly NO descriptive narrative banners or instruction paragraphs at the top of tabs, drawers, or tables.
   * Rely exclusively on compact KPI chips, direct breadcrumbs, clean data tables, and actionable controls.

3. **Compact KPI Chips (Label + Value Only):**
   * KPI cards must display ONLY the metric label and the metric value.
   * Strictly NO tertiary filler subtext (e.g., strictly NO *"Lifecycle Tracking Active"*, NO *"Design & CAD Freeze"*, NO *"Kickoff to Zero-Snag Dispatch"*, NO *"Weighted Progress Formula"*).

4. **Concise Field Labels & Minimal Placeholders:**
   * Form inputs and filters must have short, direct labels (e.g. `Project Name`, `Customer`, `Machine Model`, `Target Date`).
   * Placeholders must be short and direct (e.g. `placeholder="Search..."`, `placeholder="Project name"`), NEVER long conversational sentences or instructions.

5. **Clean Modal & Drawer Header Ribbons:**
   * Modal header ribbons strictly contain: Accent Icon Badge + Bold Title + Close Button.
   * Zero secondary explanatory paragraphs inside modal header ribbons.

---

## 2. Strictly Zero Hardcoded Dummy Data Everywhere

1. **No Hardcoded Fallback IDs or Strings:**
   * Strictly NO hardcoded fallback values in queries or state (e.g., strictly NO `activeProjectId || 'PRJ-2026-001'`).
   * When no active record is selected, UI must either default dynamically to the first available API record or prompt the user to select one.

2. **Data Sourced Exclusively via Database & APIs:**
   * All lists, cards, tables, Kanban boards, and remark feeds must be populated strictly from MongoDB via RTK Query endpoints.
   * Never inject mock arrays or fake placeholder cards into production tabs.

3. **Clean Empty States:**
   * When an API returns 0 records, show a clean, minimal empty state with an actionable button, never fake dummy records.

---

## 3. Project Setup Module Naming
* The module name is strictly **"Project Setup"** (NOT *"Project Setup Spine"*).
