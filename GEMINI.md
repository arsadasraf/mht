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
> **Unified Informal & Human-Friendly Messaging, Alerts & Confirmations:**
> All messages, validation errors, toasts, and confirmation dialogs MUST speak in a single, friendly, conversational, and direct human tone:
> * **Single Informal Voice:** Strictly NO robotic error codes or stiff legalese. Always use warm, direct, conversational English (*"All set! Changes saved."*, *"We couldn't save this right now. Please check the required fields and try again."*, *"Delete this? Once removed, you won't be able to recover this record."*).
> * **Zero Raw Browser Popups:** Strictly NO `window.confirm()` or `window.alert()`. Use custom MH confirmation modals with plain-English consequences and friendly action buttons (*"Keep it"* vs *"Yes, delete"*).
> * **Single Toast Standard:** Floating bottom-right (`fixed bottom-6 right-6 z-50`) auto-dismissing toast with standardized Emerald/Crimson/Amber/Slate states.
> 
> **Mandatory Exact Excel-Style Table Header Filters Standard:**
> Whenever an "Excel style filter" or "Excel filter" is requested for any table across the application, it MUST be implemented according to the standardized `ExcelColumnFilter` architecture:
> * **Header-Embedded Funnel Trigger (Zero Clunky Secondary Rows):** Filter trigger (`Filter` icon) embedded directly inside each header cell (`<th>`), sitting inline next to the column title. Strictly NO secondary rows of text inputs (`<input>`) or dropdown selects (`<select>`) below the header that waste vertical screen space.
> * **Floating Excel-Style Popover Dialog:** Clicking the trigger opens a floating popover (`w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50`) containing:
>   1. **Sorting Controls:** One-click "Sort A to Z (Ascending)" and "Sort Z to A (Descending)" buttons with active checkmark indicators.
>   2. **Live In-Popover Search:** Instant search input (`Search values...`) with clear button.
>   3. **(Select All) Toggle:** Checkbox toggle selecting or deselecting all currently visible values.
>   4. **Distinct Values Checklist with Counts:** Scrollable checklist displaying every unique value present in the dataset with its frequency count (e.g. `[✓] Maharashtra (12)`).
>   5. **Footer Action Buttons:** Clean `Clear Filter` and Safety Orange `Apply` buttons.
> * **Safety Orange Active Indicator:** Active column filter illuminates the header funnel button in Safety Orange (`bg-orange-500 text-white shadow-xs`) with a filled icon.
> * **Global "Reset Filters" Toolbar Button:** A compact Safety Orange button (`Reset Filters` with `RotateCcw` icon) in the table toolbar to reset all active column filters and search inputs at once.
> * **Shared Component Reference:** Always utilize or reference the shared component at `frontend/src/components/ui/ExcelColumnFilter.tsx`.
> 
> **OWASP Top 10 Reference Standard:**
> *"The OWASP Top 10 is the reference standard for the most critical web application security risks. Adopting the OWASP Top 10 is perhaps the most effective first step towards changing your software development culture focused on producing secure code."*
