> **OWASP Top 10 Reference Standard:**
> *"The OWASP Top 10 is the reference standard for the most critical web application security risks. Adopting the OWASP Top 10 is perhaps the most effective first step towards changing your software development culture focused on producing secure code."*

---

## 1. System Components
```
f:/mht/
├── assets/
│   └── branding/              # Company brand assets (mh_icon.png, mh_logo_plate.png)
├── backend/                   # Express.js REST API + MongoDB Mongoose + AWS S3 + Helmet
└── frontend/                  # Next.js (App Router) + Redux Toolkit + RTK Query + Tailwind CSS v3
```

---

## 2. The 10 System Modules & Route-Based RBAC Architecture
The system is divided into 10 core operational modules accessible from the sidebar. Each module contains sub-tabs, with **every module and tab having its own dedicated URL route**:
1. **Admin** (`/admin`)
2. **CRM** (`/crm`)
3. **Project Setup** (`/project-setup`) — *Central Spine creating the Unique Project ID (`PRJ-XXXX` / `WO-XXXX`) that links all subsequent stages*
4. **Design** (`/design`)
5. **Purchase** (`/purchase`)
6. **Incoming Quality** (`/incoming-quality`)
7. **Store** (`/store`)
8. **Production & Trial** (`/production-trial`)
9. **Dispatch** (`/dispatch`)
10. **After Sales** (`/after-sales`)

### Granular Route-Based Permission Model
* Permissions in the Admin Panel are assigned per role and per user directly to specific URL routes (e.g. `/crm/leads`, `/purchase/orders`, `/project-setup/*`).
* Both client-side route guards (Next.js) and backend middleware (Express) enforce authorization based on these exact URL paths.

---

## 3. Frontend Standards & Mirrored Modular Architecture (Next.js + Redux + RTK Query)
* **Framework:** Next.js 14+ (App Router).
* **Mirrored Modular Sub-Folder Structure:**
  * Clean, human-readable directory hierarchy under `frontend/src/modules/<module-slug>/` with `components/`, `api/`, and `hooks/` sub-folders.
  * Dedicated UI component for each tab (e.g., `modules/admin/components/UserManagement.jsx`, `RolePermissions.jsx`).
  * Dedicated RTK Query endpoint slice for each sub-domain (e.g., `modules/admin/api/adminUser.api.js`, `adminRole.api.js`).
  * Dedicated custom hooks (e.g., `modules/admin/hooks/useAdminUsers.js`).
* **Route & Tab Hierarchy (Next.js App Router):**
  * Route pages reside in `src/app/(dashboard)/<module-slug>/<tab-slug>/page.jsx`, rendering the corresponding modular component.
  * Active tabs are controlled by URL route matching (`usePathname()`), allowing bookmarks, deep linking, and browser navigation.
* **State Management:**
  * Global client state in Redux slices (`authSlice`, `uiSlice`).
  * Server state managed through **RTK Query** (`apiSlice.js` with module code splitting).
  * Tag-based cache invalidation (`providesTags` / `invalidatesTags`) to synchronize data immediately across departments.
* **Global Layout & Primitives:**
  * `components/layout/`: Sidebar (10 modules), Header, TabNav (route-based), Command Palette (`Ctrl+K`), theme switcher.
  * `components/pipeline/`: Global Project Lifecycle Pipeline tracker.
  * `components/ui/`: Reusable design system primitives (Buttons, Modals, Badges, Tabs, DataTables, FileUploads).

---

## 4. Backend Standards & Modular Architecture (Express.js + MongoDB + AWS S3)
* **Framework:** Express.js with ES modules (`import`/`export`).
* **Modular Sub-Folder Organization Rule:**
  * Clean, human-readable directory structure under `backend/src/modules/<module-slug>/` containing `controllers/`, `routes/`, and `models/` sub-folders.
  * Whenever a module has multiple sub-domains, tabs, or entities, **each entity MUST have its own separate, dedicated controller file, route file, and model schema**:
    * `controllers/<entity>.controller.js`
    * `routes/<entity>.routes.js` (with `routes/index.js` aggregating them into the module router)
    * `models/<entity>.model.js`
  * Guarantees high readability, prevents bloated single files, and makes debugging and feature changes fast and isolated.
* **Database & Modeling:** MongoDB using Mongoose with strict schema validation, timestamps, and indexes on Project ID, part numbers, and user emails.
* **AWS S3 File Storage:**
  * AWS SDK v3 (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`).
  * Direct client uploads and secure downloads via presigned URLs (`getSignedUrl` with 15-minute expiry).
  * Automatic local disk fallback when AWS credentials are not yet configured or in offline dev mode.
* **Authentication & Authorization:**
  * `Universal Dual Mode`: Google OAuth 2.0 verification via Google Auth Library / GIS token decode + Email/Password with `bcryptjs` hashing.
  * JWT access tokens (short-lived, 1 hour) and refresh tokens (long-lived, 7 days) stored securely.
  * Route-based RBAC middleware validating `req.user.allowedRoutes` against `req.baseUrl + req.path`.
  * Dynamic IP & Geo-fencing middleware (`ipRestrictionMiddleware.js`) checking client IP against company plant whitelists.
