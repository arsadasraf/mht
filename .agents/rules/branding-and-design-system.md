> **OWASP Top 10 Reference Standard:**
> *"The OWASP Top 10 is the reference standard for the most critical web application security risks. Adopting the OWASP Top 10 is perhaps the most effective first step towards changing your software development culture focused on producing secure code."*

---

## 1. Visual Identity Source
This design system is extracted directly from the official **Machine House - Winding Technologies** corporate brand assets:
* **Brand Name:** Machine House - Winding Technologies ("House of Innovations.....")
* **Brand Abbreviation:** MH / MHT
* **Styling Framework:** **Tailwind CSS v3 (v3.4.x)** with PostCSS and custom semantic light-theme tokens.
* **Logo Plate:** Industrial brushed aluminum plate with corner mounting rivets, bold techno-industrial "MACHINE HOUSE" lettering, precision black "WINDING TECHNOLOGIES" subtitle, and stylized "MH" monogram badge.
* **Logo Icon:** Circular badge featuring high-visibility Safety Orange field with metallic silver "M" and "H" emblem outlined in carbon black.
* **Desktop Sidebar Navigation:** Operational lifecycle order strictly without serial numbers (`1.`, `2.`, etc.).
* **Zero Narrative Blocks:** Strip verbose paragraphs and explanatory banners in tabs. Use compact KPI chips and data tables.
* **Meaningful Forms & Error Feedback:** Inline field assistance and actionable toast notifications with concrete guidance.

---

## 2. Color Palette & CSS Variables (100% Clean Light Theme — Zero Dark Mode)

All CSS styles and Tailwind utility classes across the application MUST use this standardized light palette:

```css
:root {
  /* Brand Primary: Machine House Industrial Safety Orange */
  --brand-primary: #FF6A00;
  --brand-primary-hover: #E65F00;
  --brand-primary-light: #FFF7ED;
  --brand-primary-border: #FED7AA;

  /* Clean Light Theme Surfaces: Zero Dark Mode */
  --surface-canvas: #F8FAFC;        /* Main page canvas */
  --surface-card: #FFFFFF;          /* Elevated cards and tables */
  --surface-border: #E2E8F0;        /* Subtle slate borders */
  --surface-hover: #F1F5F9;         /* Row/button hover state */

  /* High-Contrast Industrial Typography */
  --text-primary: #0F172A;          /* Headings, metrics, key values */
  --text-secondary: #475569;        /* Labels, descriptions, secondary values */
  --text-muted: #94A3B8;            /* Placeholders, disabled states */

  /* Departmental & Functional Semantic States */
  --color-success: #059669;         /* QC Passed / On Schedule / Cleared */
  --color-success-bg: #ECFDF5;
  --color-success-border: #A7F3D0;

  --color-warning: #D97706;         /* In-QC Quarantine / Pending Approvals */
  --color-warning-bg: #FFFBEB;
  --color-warning-border: #FDE68A;

  --color-danger: #DC2626;          /* Defect / ECO Freeze / Overdue */
  --color-danger-bg: #FEF2F2;
  --color-danger-border: #FECACA;

  --color-info: #0284C7;            /* CAD / Design / Information */
  --color-info-bg: #F0F9FF;
  --color-info-border: #BAE6FD;
}
```

### Layout Constants & Spacing
* `--sidebar-width: 260px`
* `--header-height: 60px`
* Zero dark mode overrides (`[data-theme="dark"]` is discontinued in favor of 100% clean light theme).
```

---

## 3. Typography Hierarchy
* **Headings & Badges (`font-heading`):** `Outfit`, system-ui, sans-serif. Modern, clean geometric sans-serif that captures industrial precision.
* **Data Grids & Technical Data (`font-mono` / `font-body`):** `Inter`, 'JetBrains Mono', monospace / sans-serif. High legibility for part numbers, CAD revisions, BOM quantities, and timestamps.

---

## 4. UI Aesthetics & Component Guidelines
1. **Header & Brand Banner:**
   * Prominently display the Machine House circular emblem (`mh_icon.png`) or full nameplate (`mh_logo_plate.png`).
   * Subtle metallic sheen gradient border on technical headers (`linear-gradient(90deg, #FF6A00 0%, #E2E6E8 50%, #FF6A00 100%)`).
2. **Work Order Pipeline Tracker:**
   * Horizontal step progression bar displaying the 8 ETO stages with current status badges:
     * Green checkmark for completed stages.
     * Glowing Orange pulse for the currently active stage.
     * Gray/Steel lock for upcoming gated stages.
3. **Buttons & Interactive CTAs:**
   * Primary action buttons: Vibrant Orange background (`#FF6A00`), bold white text, subtle hover lift (`translateY(-1px)`), and orange shadow glow.
   * Secondary action buttons: Metallic border with subtle dark/light glass background.
   * Danger buttons: High-voltage crimson with confirmation modals.
4. **Data Tables & Inventory Buckets:**
   * Tabular views for BOMs, Leads, POs, and Stores must feature sticky headers, quick filter search, status pill badges, and export actions.
5. **Button-Type Tabs & Segmented Controls (Mandatory — Zero Line-Underline Tabs):**
   * Across the entire application, all module tabs, sub-tabs, filters, and view-switchers MUST be styled as **modern button-type (pill / segmented button) tabs** (`rounded-xl` / `rounded-2xl`).
   * **Active Tab Button:** Safety Orange button fill (`bg-orange-500 text-white font-semibold shadow-xs shadow-orange-500/20`) or elevated white card button (`bg-white text-orange-600 font-bold border border-slate-200 shadow-xs`).
   * **Inactive Tab Button:** Soft hover button surface (`bg-slate-100 text-slate-600 hover:bg-slate-200` or `text-slate-600 hover:text-slate-900 hover:bg-slate-100`).
   * Traditional line-underline tabs (`border-b-2`) are strictly prohibited everywhere.
6. **Standard Form & Modal Sizing System Across Devices:**
   * Every modal dialog and creation/edit form across the ERP MUST use standardized responsive sizing tokens:
     * **Desktop (≥ 1280px / `xl:` & `2xl:`):** Master forms (Customer Master, BOM, Product Master) use `w-full max-w-6xl xl:max-w-7xl` with `max-h-[92vh]` in expansive multi-column layouts (`lg:grid-cols-12` or dual-column); standard action forms use `w-full max-w-3xl lg:max-w-4xl`; compact actions use `max-w-lg lg:max-w-xl`; confirmation dialogs use `max-w-md`.
     * **Laptop (1024px to 1279px / `lg:`):** Master forms use `w-full max-w-5xl lg:max-w-6xl` with `max-h-[90vh]` and internal scrollable body (`overflow-y-auto`); standard forms use `max-w-2xl lg:max-w-3xl`.
     * **Tablet (768px to 1023px / `md:`):** Fluid `w-full max-w-2xl` with `p-4 sm:p-5`, `max-h-[85vh]`, adaptive 1-to-2 column layout, touch targets ≥ 44px.
     * **Mobile (< 768px):** Slide-up bottom sheets or full-width sheets (`w-full inset-x-0 bottom-0 rounded-t-2xl sm:rounded-2xl`), single-column stacked layout, sticky action bar pinned above virtual keyboard.
7. **Unified Informal & Human-Friendly Tone for Messages, Alerts & Confirmations (Single Component Standard):**
   * All messages, validation errors, system notifications, and confirmation dialogs MUST adhere to a single informal, conversational, and direct human tone:
     * **Single Informal Voice:** Strictly NO robotic error codes (e.g. *"Error 500: Database insertion failed"*), NO cold legalese (e.g. *"Are you sure you want to execute permanent entity deletion?"*), and NO vague alerts (e.g. *"An error occurred"*). Always use warm, friendly, conversational, and actionable English (*"All set! Changes saved."*, *"We couldn't save this right now. Please check the required fields and try again."*, *"Delete this customer? Once removed, you won't be able to recover this record."*).
     * **Zero Native Browser Popups:** Strictly NO raw `window.confirm()` or `window.alert()`. All confirmations MUST use a unified, friendly MH Confirmation Dialog component with plain-English consequences and friendly action buttons (*"Keep it"* vs *"Yes, delete"*).
     * **Single Floating Toast Standard:** Fixed bottom-right (`fixed bottom-6 right-6 z-50`), rounded-xl, shadow-2xl, auto-dismiss 4.5s, with 4 standardized color states (Emerald for Success, Crimson for Error, Amber for Notice, Slate for Info).


