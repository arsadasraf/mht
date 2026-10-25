# Rule: Mobile, Tablet & Native Touch UI Architecture

This directive defines the responsive breakpoints, touch-interaction standards, and native-feeling mobile/tablet UI patterns for **Machine House - Winding Technologies ERP**.

> **OWASP Top 10 Reference Standard:**
> *"The OWASP Top 10 is the reference standard for the most critical web application security risks. Adopting the OWASP Top 10 is perhaps the most effective first step towards changing your software development culture focused on producing secure code."*

---

## 1. Responsive Viewport Breakpoints & Layout Modes
* **Mobile Phones (`< 768px`):** Native App Mode.
  * Sticky bottom navigation bar for active module's tabs.
  * Top navigation header with hamburger drawer for switching between the 10 core modules.
* **Tablets (`768px` to `1024px`):**
  * **Portrait (`orientation: portrait`):** Native App Mode (sticky bottom tab bar + top module drawer).
  * **Landscape (`orientation: landscape`):** Hybrid Mode (compact icon sidebar for 10 modules + touch-friendly top tab bar).
* **Desktop (`> 1024px`):** Enterprise Portal Mode.
  * Collapsible left sidebar for all 10 modules.
  * Top horizontal TabNav bar featuring **modern button-type (pill / segmented button) tabs** (active state filled in Safety Orange or elevated white card button, zero line-underline tabs).


---

## 2. Sticky Bottom Navigation Bar (Mobile & Portrait Tablet)
* **Tab-to-Icon Mapping:** What appears as a horizontal text/icon tab bar on desktop is transformed into a **sticky bottom bar** with native touch icons (`h-14` / `56px` height, safe-area-inset padding for iOS/Android).
* **4-Tab + 'More' Drawer Overflow:**
  * Displays the first 4 primary tabs of the active module with distinct Lucide icons and active orange indicators.
  * If a module has 5 or more tabs, the 5th slot renders a **"More (⋯)"** button.
  * Tapping "More" triggers a native slide-up bottom sheet displaying the remaining tabs with icons, labels, and badges.
* **Haptic & Visual Feedback:**
  * Active tab glows with Machine House Safety Orange (`#FF6A00`) and a subtle top indicator dot.
  * Inactive tabs render in industrial slate (`#9CA3AF`).

---

## 3. Top Header & Module Switcher Drawer
* **Sticky Top Bar:**
  * Brand emblem (`mh_icon.png` or compact nameplate).
  * Active module title and plant location badge.
  * Notification icon and Hamburger toggle.
* **Slide-In Module Drawer:**
  * Tapping the hamburger button slides open a full-height touch drawer.
  * Displays all 10 modules with icons, user profile summary, role indicator, and theme switcher.

---

## 4. Native Touch Forms & Responsive Card Views
* **Slide-Up Bottom Sheets:**
  * Instead of center-screen desktop popups, all mobile modals, creation forms (e.g. Add User, Add Snag, Log QC), and filter drawers slide up from the bottom (`bottom-0 rounded-t-2xl`).
  * Includes a drag-handle indicator at the top and a sticky primary CTA button at the bottom pinned above the virtual keyboard.
* **Card Transformation for Data Grids:**
  * Complex wide tables (BOM line items, Leads, Purchase Orders, Stock Buckets) automatically transform on mobile screens into stacked interactive cards.
  * Each card clearly showcases Part Number/Item Title, Project ID badge, Status Pill (`QC Passed`, `Quarantine`, `Zero-Snag Block`), and primary action buttons.

---

## 5. Standard Form & Modal Sizing Matrix Across Devices
Every form, modal, and drawer across the application MUST strictly adhere to this responsive sizing matrix:
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

---

## 6. Unified Informal & Human-Friendly Tone for Messages, Alerts & Confirmations
All messages, validation errors, system notifications, and confirmation dialogs across all devices MUST adhere to a single informal, conversational, and direct human tone:
* **Single Informal & Conversational Voice:** Strictly NO robotic error codes (e.g. *"Error 500: Database insertion failed"*), NO cold legalese (e.g. *"Are you sure you want to execute permanent entity deletion?"*), and NO vague alerts (e.g. *"An error occurred"*). Always use warm, friendly, conversational, and actionable English:
  * *Success:* *"All set! Customer details saved successfully."* / *"Great! Changes updated."*
  * *Helpful Fix / Error:* *"We couldn't save this right now. Please check the required fields and try again."*
  * *Confirmation:* *"Delete this customer? Once removed, you won't be able to recover this record."*
  * *Warning / Heads-Up:* *"Just a heads up: this machine has pending QC snags before dispatch can unlock."*
  * *Info:* *"Copied to clipboard!"*
* **Zero Native Browser Popups:** Strictly NO raw `window.confirm()` or `window.alert()`. All confirmations MUST use a unified, friendly MH Confirmation Dialog component with conversational phrasing and clear, friendly buttons (*"Keep it"* vs *"Yes, delete"*).
* **Single Floating Toast Standard:** Fixed bottom-right (`fixed bottom-6 right-6 z-50`), rounded-xl, shadow-2xl, auto-dismiss 4.5s, with 4 standardized color states (Emerald for Success, Crimson for Error, Amber for Notice, Slate for Info).

