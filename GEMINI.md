# Machine House (MH) ERP — Master System Directives & Rules

> See the comprehensive rules and system specifications in [AGENTS.md](file:///f:/mht/AGENTS.md).
> All directives, color tokens (Clean Light Theme with Safety Orange `#FF6A00`), 100% pure Tailwind CSS v3 architecture (strictly zero inline styles), modern responsive UI & UX across mobile/tablet/desktop, un-numbered sidebar navigation, meaningful forms/errors, the 10 core operational modules, URL route-based tab navigation, and ETO operational rules defined in `AGENTS.md` apply to all agent interactions across this repository.
> 
> **Mandatory UI/UX & Tailwind CSS Directive:**
> The entire frontend (Landing Page `/`, ERP Login `/login`, and all 10 Module Dashboards) MUST use **Tailwind CSS v3 exclusively with modern, world-class UI & UX standards**: clean light theme, generous whitespace, high-contrast industrial typography, rounded cards with subtle borders, smooth micro-interactions, **modern button-type (pill / segmented button) tabs everywhere with zero line-underline tabs**, and pixel-perfect responsiveness across mobile, tablet, and desktop devices.
> 
> **Standardized Form & Modal Sizing System Across Devices:**
> Every form and modal dialog across the application MUST strictly adhere to standard sizing tokens:
> * **Desktop (≥ 1280px / `xl:` & `2xl:`):** Master/expansive forms (Customer Master, BOM, Product Master) use `w-full max-w-6xl xl:max-w-7xl` with `max-h-[92vh]`; standard action forms use `w-full max-w-3xl lg:max-w-4xl`; compact actions use `max-w-lg lg:max-w-xl`; confirmation dialogs use `max-w-md`.
> * **Laptop (1024px to 1279px / `lg:`):** Master forms use `w-full max-w-5xl lg:max-w-6xl` with `max-h-[90vh]` and internal scrolling; standard forms use `max-w-2xl lg:max-w-3xl`.
> * **Tablet (768px to 1023px / `md:`):** Fluid `w-full max-w-2xl` with `p-4 sm:p-5`, `max-h-[85vh]`, adaptive 1-to-2 column layout, touch targets ≥ 44px.
> * **Mobile (< 768px):** Slide-up bottom sheets or full-width sheets (`w-full inset-x-0 bottom-0 rounded-t-2xl sm:rounded-2xl`), single-column stacked layout, sticky action bar pinned above virtual keyboard.
> 
> **Mandatory Form & Modal Top Header Ribbon Standard (Crisp White Header with Amber/Yellow Top Accent Stripe):**
> Across the ENTIRE application, every modal, drawer, form card, and dialog header ribbon MUST strictly use a **Crisp White Header with an Industrial Amber/Yellow Top Accent Stripe**:
> * **Header Container:** `bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs`.
> * **High-Contrast Dark Slate Typography:** Modal titles use bold/extrabold dark slate text (`text-slate-900 text-base font-extrabold tracking-tight`); subtitles/guidance use crisp slate metadata (`text-[11px] text-slate-500 font-medium`).
> * **Accent Icon Badge:** Prominent icon badge in an energetic amber/orange surface (`w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0`).
> * **Light-Surface Close Button:** Subtle light hover close button (`text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors`).
> * **Zero Dark Mode Headers:** Strictly NO dark/black headers (`bg-slate-900` or `bg-black` are strictly prohibited) across all modals, drawers, and form cards in the application.
> 
> **Strictly Zero Default Text-Based Information & Zero Dummy Data Everywhere:**
> Across the entire application, eliminate all default narrative explanatory prose, filler sub-headings, and subtitles under titles:
> * **Zero Header Subtitles:** Page and modal headers contain ONLY the title and icon. Strictly NO explanatory subtext (e.g. no *"Creates the unique PRJ-XXXX / WO-XXXX master lifecycle reference spine"*).
> * **Clean Industrial KPI Chips:** KPI cards display ONLY the metric label and numeric value. Strictly NO tertiary commentary or filler sub-captions (e.g. no *"Lifecycle Tracking Active"*, no *"Kickoff to Zero-Snag Dispatch"*).
> * **Concise Inputs & Placeholders:** Input labels must be short and direct. Placeholders must be minimal (e.g. `placeholder="Project name"` or `placeholder="Search..."`), NEVER lengthy sentence instructions.
> * **Strictly ZERO Hardcoded Dummy Data:** Strictly NO fallback fake IDs (e.g. `'PRJ-2026-001'`) or static dummy cards. If an API returns no data, show a clean, minimal empty state. Real data is sourced exclusively from the database/API.
> * **Strictly Zero In-Code Data Creation & Zero Auto-Seeding (Never Create Data From Code):** Backend controllers, services, and route handlers MUST NEVER automatically create, seed, or inject mock, sample, or default records into the database (strictly NO `if (count === 0) create(...)` and NO hardcoded seed data arrays in controllers). If a table has 0 records, the API must return an empty array `[]` (with `count: 0`), and the UI must present a clean, minimal empty state. Real data originates exclusively from genuine user creation via the frontend UI.
> * **Project Setup Naming:** The module name is strictly **"Project Setup"** (NOT *"Project Setup Spine"*).
> 
> **Unified Informal & Human-Friendly Messaging, Alerts & Confirmations:**
> All messages, validation errors, toasts, and confirmation dialogs MUST speak in a single, friendly, conversational, and direct human tone:
> * **Single Informal Voice:** Strictly NO robotic error codes or stiff legalese. Always use warm, direct, conversational English (*"All set! Changes saved."*, *"We couldn't save this right now. Please check the required fields and try again."*, *"Delete this? Once removed, you won't be able to recover this record."*).
> * **Zero Raw Browser Popups:** Strictly NO `window.confirm()` or `window.alert()`. Use custom MH confirmation modals with plain-English consequences and friendly action buttons (*"Keep it"* vs *"Yes, delete"*).
> * **Single Toast Standard:** Floating bottom-right (`fixed bottom-6 right-6 z-50`) auto-dismissing toast with standardized Emerald/Crimson/Amber/Slate states.
> 
> **Mandatory Universal Table Architecture (Dedicated Search Bar on Left, Add New Button on Right, Column-Based Excel Filters on Relevant Columns Only):**
> Every data table across the ENTIRE application MUST strictly follow the standardized table architecture:
> * **Top Dedicated In-Line Table Toolbar:** Every table MUST have its own dedicated toolbar sitting immediately above it:
>   * **Left Side:** Dedicated In-Line Search Bar with search icon, instant search filtering, and clear (`X`) button.
>   * **Right Side:** Primary "Add New" button (e.g. `Add RM Item`, `Add Customer`, `Add BO Item`) in Safety Orange (`bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl`), alongside a compact "Reset Filters" button (`RotateCcw` icon) that automatically appears whenever any column filter or search term is active.
> * **Column-Based Excel-Style Header Filters (`ExcelColumnFilter`):** Every data column with distinct values or sorting needs (e.g. Item Name, Code, Make, Category, UOM, HSN, Status, Location) MUST feature a header-embedded Excel column filter popover (`ExcelColumnFilter`):
>   * **Header-Embedded Funnel Trigger (Zero Clunky Secondary Rows):** Filter trigger (`Filter` icon) embedded directly inside each header cell (`<th>`), sitting inline next to the column title. Strictly NO secondary rows of text inputs (`<input>`) or dropdown selects (`<select>`) below the header that waste vertical screen space.
>   * **Floating Excel-Style Popover Dialog:** Clicking the trigger opens a floating popover (`w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50`) containing:
>     1. **Sorting Controls:** One-click "Sort A to Z (Ascending)" and "Sort Z to A (Descending)" buttons with active checkmark indicators.
>     2. **Live In-Popover Search:** Instant search input (`Search values...`) with clear button.
>     3. **(Select All) Toggle:** Checkbox toggle selecting or deselecting all currently visible values.
>     4. **Distinct Values Checklist with Counts:** Scrollable checklist displaying every unique value present in the dataset with its frequency count (e.g. `[✓] Tata Steel (3)`).
>     5. **Footer Action Buttons:** Clean `Clear Filter` and Safety Orange `Apply` buttons.
>   * **Safety Orange Active Indicator:** Active column filter illuminates the header funnel button in Safety Orange (`bg-orange-500 text-white shadow-xs`) with a filled icon.
> * **Clean Plain Headers for Non-Filter Columns (Zero Unneeded Filter Icons):** Columns where filtering is not needed (such as `#` serial row numbers, row action buttons/icons, or purely decorative columns) MUST have clean, plain headers without any filter funnel icon.
> * **Strictly Zero Duplicate Header Titles (Use `ExcelColumnFilter` Alone — Zero Extra `<span>Title</span>` in Filter Headers):** The `<ExcelColumnFilter title="Column Name" ... />` component already encapsulates and renders both the column title text (`title`) and the filter funnel trigger button internally. Therefore, inside any filterable table header cell (`<th className="...">`), you MUST place `<ExcelColumnFilter ... />` directly by itself. Strictly NEVER wrap or prefix it with an extra `<span>Column Name</span>` or outer `<div>` containing the title again (e.g. NEVER do `<div><span>Project ID</span><ExcelColumnFilter title="Project ID" /></div>`). Doing so causes unsightly duplicate column titles on screen. For non-filter columns (such as `#`, row actions, progress bars), render clean plain text headers (e.g. `<th className="...">#</th>`).
> * **Shared Component Reference:** Always utilize or reference the shared component at `frontend/src/components/ui/ExcelColumnFilter.tsx`.
> 
> **Mandatory Clickable Row Preview & Complete Audit Trail Standard:**
> Across the ENTIRE application, every data table MUST support an interactive **Clickable Row Preview**:
> * **Clickable Row Identifier:** Clicking on the primary entity identifier (e.g. Raw Material Name, Customer Name, Item Code, Work Order ID) or clicking an eye/preview action button (`Eye` icon) MUST open a high-density, informative **Preview Dossier / Modal**.
> * **Standard Modal Sizing & Crisp White Ribbon:** Adheres to standard modal sizing tokens (`max-w-3xl lg:max-w-4xl` for items/records, `max-w-6xl xl:max-w-7xl` for master/expansive records) and strictly uses the **Crisp White Header with Amber/Yellow Top Accent Stripe** (`border-t-4 border-t-amber-400`), high-contrast dark slate typography, accent icon badge, and a direct "Edit" button to seamlessly jump into editing.
> * **Comprehensive Details View:** Clean categorized view of all specifications, technical properties, categories, pricing, units, and active states.
> * **Mandatory Universal Action Tracking / Audit Section:** Every preview dossier MUST feature a prominent dual-card audit trail display:
>   1. **Created By & Timestamp:** Creator's full name (`createdByName`), email/role, and exact creation timestamp (`createdAt` formatted in local date and time).
>   2. **Last Updated By & Timestamp:** Last updater's full name (`updatedByName`), email/role, and exact last updated timestamp (`updatedAt` formatted in local date and time).
> 
> **Mandatory Item Attachments & S3 Subfolder Separation Standard (Photos & PDF Technical Documents):**
> Across the ENTIRE application, items and masters that support media attachments (e.g. RM & BO Items, Machine Models, Tooling, QC Inspection Records) MUST adhere to strict S3 file/folder separation and unified preview behavior:
> * **Dedicated S3 Folder Hierarchy:** Strictly NO flat or cluttered root uploads. Every file saved to S3 MUST be organized into dedicated semantic subfolders:
>   * **Photos / Images:** `<module>/items/photos/<item-slug>/<timestamp>_<clean-filename>`
>   * **Technical Documents / PDFs:** `<module>/items/documents/<item-slug>/<timestamp>_<clean-filename>`
> * **Add/Edit Form Media Handlers:**
>   * **Item Photos:** Supports multiple image selection (`image/*`), immediate visual thumbnails for existing/new photos, and individual remove (`X`) buttons.
>   * **Technical PDF Datasheet:** Dedicated PDF document uploader with clear file badge, "Replace" option, and "Remove" action.
> * **Clickable Preview Dossier Media Rendering:**
>   * **Photo Gallery:** If photos exist, render a clean multi-photo visual gallery with click-to-enlarge fullscreen modal (`ZoomIn`).
>   * **Technical PDF Document Card:** If a PDF exists, render a dedicated document card featuring two explicit action buttons:
>     1. **"See PDF"** (`<a target="_blank" rel="noopener noreferrer">` with `ExternalLink` icon) to open the document in a new browser tab.
>     2. **"Download PDF"** (`<a download="..." >` with `Download` icon) to instantly trigger direct file download.
> 
> **OWASP Top 10 Reference Standard:**
> *"The OWASP Top 10 is the reference standard for the most critical web application security risks. Adopting the OWASP Top 10 is perhaps the most effective first step towards changing your software development culture focused on producing secure code."*
> 
> **Mandatory Dedicated URL Route for Every Tab & Sub-Tab (Zero State-Only Sub-Tabs, Especially in Masters):**
> Whenever any tab or sub-tab is created anywhere across the application (especially in Master tabs across all modules), it MUST have its own dedicated URL route (`/<module-slug>/<tab-slug>` or `/<module-slug>/<tab-slug>/<sub-tab-slug>`) with a dedicated `page.tsx` file and Next.js `<Link href="...">` navigation, plus conditional RTK Query `skip` flags so each view only fetches and renders what it needs for fast page loads, direct deep-linking, and URL route-based RBAC.
> 
> **Mandatory Universal Action Tracking (Schema & Backend by Default, Selective Frontend Display):**
> Every database schema (`backend/prisma/schema/<module>/<entity>.prisma`) and backend create/update transaction MUST capture `createdAt`, `updatedAt`, `createdById` / `createdBy`, `createdByName`, `updatedById` / `updatedBy`, and `updatedByName` (with the acting user's full name) by default. On the frontend, we decide selectively where to display these audit fields (e.g. inside Preview Dossiers or detail views).
> 
> **Strict Agent Operating Constraints & Workflow Rules:**
> * **Mandatory Pre-Execution Planning:** The AI agent must ALWAYS create, present, and align on a clear, structured implementation plan BEFORE modifying code or executing feature implementations.
> * **Strictly Zero Git Commits by Agent:** Under NO circumstances should any AI agent run `git commit`, stage-and-commit scripts, or create automated git commits. All git commits and repository pushes are reserved exclusively for the human developer.
> * **Strictly Zero Agent Browser Access:** Under NO circumstances should any AI agent invoke browser subagents or automated browser interaction tools (`browser_subagent`). Visual inspections and web browsing by the agent are disabled; verification must be conducted via direct code inspection, terminal CLI tests, or by asking the user for review.

