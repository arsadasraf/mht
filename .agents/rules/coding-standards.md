> **OWASP Top 10 Reference Standard:**
> *"The OWASP Top 10 is the reference standard for the most critical web application security risks. Adopting the OWASP Top 10 is perhaps the most effective first step towards changing your software development culture focused on producing secure code."*

---

## 1. General Principles
* **Clean Light UI Standard:** Clean Slate canvas (`#F8FAFC`), crisp white cards (`#FFFFFF`), subtle slate borders (`#E2E8F0`), high-contrast dark typography (`#0F172A`), and Machine House Safety Orange (`#FF6A00`) brand accents. Zero dark mode.
* **Styling with Tailwind CSS v3:** Build UI components using Tailwind CSS v3 utility classes and configured semantic tokens.
* **Zero Narrative Text Blocks:** Avoid lengthy introductory paragraphs or verbose banners in UI tabs. Use clean KPI cards, breadcrumbs, and tables.
* **Meaningful Forms & Error Feedback:** Form validation and API error handlers must deliver descriptive, helpful, and actionable instructions via in-app toasts. Never display raw unformatted errors.
* **Standard Form & Modal Sizing System Across Devices:**
  * **Desktop Monitors (≥ 1280px / `xl:` & `2xl:`):** Master forms use `w-full max-w-6xl xl:max-w-7xl` with `max-h-[92vh]`; standard action forms use `w-full max-w-3xl lg:max-w-4xl`; compact actions use `max-w-lg lg:max-w-xl`; confirmation dialogs use `max-w-md`.
  * **Laptops (1024px to 1279px / `lg:`):** Master forms use `w-full max-w-5xl lg:max-w-6xl` with `max-h-[90vh]` and internal scrolling; standard forms use `max-w-2xl lg:max-w-3xl`.
  * **Tablets (768px to 1023px / `md:`):** Fluid `w-full max-w-2xl` with `p-4 sm:p-5`, `max-h-[85vh]`, adaptive 1-to-2 column layout, touch targets ≥ 44px.
  * **Mobile Phones (< 768px):** Slide-up bottom sheets or full-width sheets (`w-full inset-x-0 bottom-0 rounded-t-2xl sm:rounded-2xl`), single-column stacked layout, sticky action bar pinned above virtual keyboard.
* **Mandatory Form & Modal Top Header Ribbon Standard (Crisp White Header with Amber/Yellow Top Accent Stripe):**
  Across the ENTIRE application, every modal, drawer, form card, and dialog header ribbon MUST strictly use a **Crisp White Header with an Industrial Amber/Yellow Top Accent Stripe**:
  * **Header Container:** `bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs`.
  * **High-Contrast Dark Slate Typography:** Modal titles use bold/extrabold dark slate text (`text-slate-900 text-base font-extrabold tracking-tight`); subtitles/guidance use crisp slate metadata (`text-[11px] text-slate-500 font-medium`).
  * **Accent Icon Badge:** Prominent icon badge in an energetic amber/orange surface (`w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0`).
  * **Light-Surface Close Button:** Subtle light hover close button (`text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors`).
  * **Zero Dark Mode Headers:** Strictly NO dark/black headers (`bg-slate-900` or `bg-black` are strictly prohibited) across all modals, drawers, and form cards in the application.
* **Unified Informal & Human-Friendly Tone for Messages, Alerts & Confirmations:**
  * **Single Informal Voice:** Strictly NO robotic error codes or stiff legalese. Always use warm, direct, conversational English (*"All set! Changes saved."*, *"We couldn't save this right now. Please check the required fields and try again."*, *"Delete this? Once removed, you won't be able to recover this record."*).
  * **Zero Raw Browser Popups:** Strictly NO `window.confirm()` or `window.alert()`. All confirmations MUST use a unified, friendly MH Confirmation Dialog component with conversational phrasing and clear, friendly buttons (*"Keep it"* vs *"Yes, delete"*).
  * **Single Floating Toast Standard:** Fixed bottom-right (`fixed bottom-6 right-6 z-50`), rounded-xl, shadow-2xl, auto-dismiss 4.5s, with 4 standardized color states (Emerald for Success, Crimson for Error, Amber for Notice, Slate for Info).
* **Mandatory Exact Excel-Style Table Header Filters Standard:**
  Whenever an "Excel style filter" or "Excel filter" is requested for any table across the application, it MUST be implemented according to the standardized `ExcelColumnFilter` architecture:
  * **Header-Embedded Funnel Trigger (Zero Clunky Secondary Rows):** Filter trigger (`Filter` icon) embedded directly inside each header cell (`<th>`), sitting inline next to the column title. Strictly NO secondary rows of text inputs (`<input>`) or dropdown selects (`<select>`) below the header that waste vertical screen space.
  * **Floating Excel-Style Popover Dialog:** Clicking the trigger opens a floating popover (`w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50`) containing:
    1. **Sorting Controls:** One-click "Sort A to Z (Ascending)" and "Sort Z to A (Descending)" buttons with active checkmark indicators.
    2. **Live In-Popover Search:** Instant search input (`Search values...`) with clear button.
    3. **(Select All) Toggle:** Checkbox toggle selecting or deselecting all currently visible values.
    4. **Distinct Values Checklist with Counts:** Scrollable checklist displaying every unique value present in the dataset with its frequency count (e.g. `[✓] Maharashtra (12)`).
    5. **Footer Action Buttons:** Clean `Clear Filter` and Safety Orange `Apply` buttons.
  * **Safety Orange Active Indicator:** Active column filter illuminates the header funnel button in Safety Orange (`bg-orange-500 text-white shadow-xs`) with a filled icon.
  * **Global "Reset Filters" Toolbar Button:** A compact Safety Orange button (`Reset Filters` with `RotateCcw` icon) in the table toolbar to reset all active column filters and search inputs at once.
  * **Shared Component Reference:** Always utilize or reference the shared component at `frontend/src/components/ui/ExcelColumnFilter.tsx`.
* **Desktop Sidebar Navigation:** Maintain operational lifecycle order strictly without serial numbers (`1.`, `2.`, etc.).
* **Resilient Error Handling:** Every API call and async operation must be wrapped in try/catch or RTK Query error handlers. Errors must present actionable notifications to the user.
* **Descriptive Naming:** Use domain-specific terminology (`ProjectSetup`, `UniqueProjectId`, `BOM`, `SubAssembly`, `PurchaseOrder`, `GateCheck`, `Snag`, `AllocationLock`, `AfterSalesTicket`).


---

## 2. Frontend Development Standards (Next.js)
* **Mirrored Modular File Structure:**
  * Clean, human-readable directory structure under `frontend/src/modules/<module-slug>/` with dedicated `components/`, `api/`, and `hooks/` sub-folders.
  * Dedicated, separate UI component for each tab in `modules/<module-slug>/components/<TabComponent>.jsx` in PascalCase (e.g. `UserManagement.jsx`, `RolePermissions.jsx`).
  * Dedicated RTK Query endpoint slice for each sub-domain in `modules/<module-slug>/api/<tabApi>.api.js` injecting into the central `apiSlice.js`.
  * Dedicated custom hooks in `modules/<module-slug>/hooks/`.
  * App Router pages in `src/app/(dashboard)/<module-slug>/<tab-slug>/page.jsx` which cleanly import and render the modular tab component.
  * Shared UI primitives under `src/components/ui/` and layout components under `src/components/layout/`.
* **State Updates & Navigation:**
  * Active tabs are strictly synchronized with the browser URL route (`usePathname()`).
  * Route guard components check user route permissions against `auth.user.allowedRoutes`.
  * Use RTK Query's automated cache tag invalidation (`providesTags` / `invalidatesTags`) to ensure multi-user operations instantly reflect in the UI.
* **Asset Handling:**
  * Reference brand assets using `/branding/mh_icon.png` and `/branding/mh_logo_plate.png`.

---

## 3. Backend Development Standards (Express + MongoDB)
* **Modular Separation of Concerns:**
  * Clean, human-readable directory structure under `backend/src/modules/<module-slug>/` with `controllers/`, `routes/`, and `models/` sub-folders.
  * Whenever a module has multiple controllers/sub-domains, **each controller MUST be a separate file** (e.g., `user.controller.js`, `role.controller.js`), accompanied by its own routes file (`user.routes.js`, `role.routes.js`) and model schema (`user.model.js`, `role.model.js`).
  * An `index.js` inside `routes/` aggregates the sub-routes and mounts them cleanly to the module's base URL route.
  * Ensures files remain concise, single-purpose, easily readable, and safe to modify without collateral bugs.
* **API Endpoints:**
  * RESTful URL structure aligned with the 10 core modules:
    * `/api/v1/admin`
    * `/api/v1/crm`
    * `/api/v1/project-setup`
    * `/api/v1/design`
    * `/api/v1/purchase`
    * `/api/v1/incoming-quality`
    * `/api/v1/store`
    * `/api/v1/production-trial`
    * `/api/v1/dispatch`
    * `/api/v1/after-sales`
* **Route-Based Permission Middleware:**
  * Every endpoint passes through `authorizeRouteAccess` verifying that the requesting user's assigned role has clearance for that module and sub-route.
* **Schema Design & Universal Action Tracking:**
  * **Mandatory Actor & Timestamp Fields:** Every schema across all 10 modules MUST track:
    * `createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }`
    * `updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }`
    * Enabled `{ timestamps: true }` to automatically track `createdAt` and `updatedAt`.
  * **No Hard User Deletion:** Users can NEVER be deleted. Use soft-delete / status toggling (`isActive: Boolean`, `status: 'ACTIVE' | 'DEACTIVATED'`). API endpoints must reject hard delete operations.
  * **Dual-Amount Monetary Fields:** All financial fields (quotes, PO lines, total costs) must store `{ currency, amount, exchangeRate, baseAmountINR }` rounded to 2 decimals.
  * **Dual-Quantity UOM Pattern:** Material quantities supporting alternate units must store `{ baseQty, baseUom, altQty, altUom, conversionRatio }` normalized to `baseUom`, enforcing integers on discrete units.
  * Index the central spine key `projectId` (`PRJ-XXXX` / `WO-XXXX`) across all downstream schemas.
* **Security & Tokens:**
  * Do not store raw passwords; always hash with `bcryptjs`.
  * Validate Google OAuth ID tokens using `google-auth-library`.
  * Enforce role-based middlewares and IP restriction checks on all sensitive endpoints.
