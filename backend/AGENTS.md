# Machine House Backend Directives & Rules (Express.js + MongoDB)

> Scope: Applies to all backend development within `f:/mht/backend`.
> 
> **OWASP Top 10 Reference Standard:**
> *"The OWASP Top 10 is the reference standard for the most critical web application security risks. Adopting the OWASP Top 10 is perhaps the most effective first step towards changing your software development culture focused on producing secure code."*

---

## 1. Backend Architecture & Technologies
* **Framework:** Express.js (Node.js ES modules).
* **Database:** MongoDB via Mongoose.
* **Storage:** AWS S3 (`@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`) for direct upload/download presigned URLs with local filesystem fallback.
* **Authentication:** Universal Dual Mode (Google OAuth 2.0 via `google-auth-library` + Email/Password with `bcryptjs` and JWT).

---

## 2. Directory Layout: Modular Sub-Folder Architecture
**Strict Separation of Concerns Rule:** To prevent bloated, unmaintainable monolithic files, each module is organized with dedicated sub-folders (`controllers/`, `routes/`, `models/`). Whenever a module has multiple features/sub-domains or tabs, **each one MUST have its own separate, dedicated file**:

* **Separate Controller File per Sub-Domain:** Each controller handles only its specific entity/tab (e.g., `user.controller.js`, `role.controller.js`).
* **Separate Route File per Sub-Domain:** Each route file defines routes for that specific entity (e.g., `user.routes.js`, `role.routes.js`), corresponding directly to the frontend's modern button-type tabs, with an `index.js` in `routes/` aggregating them into the main module router.
* **Separate Model File per Entity:** Each Mongoose schema resides in its own file (e.g., `user.model.js`, `role.model.js`).
* **Maximum Readability:** Developers can immediately locate, read, test, and modify specific logic without wading through unrelated code.

### Structure:
```
backend/
├── src/
│   ├── config/                          # Central Configuration
│   │   ├── db.config.js                 # MongoDB connection & hooks
│   │   └── s3.config.js                 # AWS S3 client & presigner
│   ├── middleware/                      # Shared System Middlewares
│   │   ├── auth.middleware.js           # JWT & Google OAuth verification
│   │   ├── rbac.middleware.js           # Route & tab-level authorization
│   │   ├── ipWhitelist.middleware.js    # Plant & office IP restriction
│   │   └── error.middleware.js          # Central error handling
│   ├── modules/                         # The 10 Core Modules
│   │   ├── admin/
│   │   │   ├── controllers/
│   │   │   │   ├── user.controller.js
│   │   │   │   ├── role.controller.js
│   │   │   │   ├── ipWhitelist.controller.js
│   │   │   │   ├── masters.controller.js
│   │   │   │   └── auditLog.controller.js
│   │   │   ├── routes/
│   │   │   │   ├── user.routes.js
│   │   │   │   ├── role.routes.js
│   │   │   │   ├── ipWhitelist.routes.js
│   │   │   │   ├── masters.routes.js
│   │   │   │   ├── auditLog.routes.js
│   │   │   │   └── index.js             # Aggregates admin routes to /api/v1/admin
│   │   │   └── models/
│   │   │       ├── user.model.js
│   │   │       ├── role.model.js
│   │   │       ├── ipWhitelist.model.js
│   │   │       ├── masterItem.model.js
│   │   │       └── auditLog.model.js
│   │   ├── crm/
│   │   │   ├── controllers/             # lead.controller.js, quote.controller.js, import.controller.js
│   │   │   ├── routes/                  # lead.routes.js, quote.routes.js, import.routes.js, index.js
│   │   │   └── models/                  # lead.model.js, quote.model.js
│   │   ├── project-setup/               # Central Spine
│   │   │   ├── controllers/             # project.controller.js, template.controller.js, baseline.controller.js
│   │   │   ├── routes/                  # project.routes.js, template.routes.js, baseline.routes.js, index.js
│   │   │   └── models/                  # project.model.js (Mints Unique Project ID PRJ-XXXX), template.model.js
│   │   ├── design/
│   │   │   ├── controllers/             # bom.controller.js, cad.controller.js, eco.controller.js
│   │   │   ├── routes/                  # bom.routes.js, cad.routes.js, eco.routes.js, index.js
│   │   │   └── models/                  # bom.model.js, eco.model.js
│   │   ├── purchase/
│   │   │   ├── controllers/             # demand.controller.js, po.controller.js, vendor.controller.js
│   │   │   ├── routes/                  # demand.routes.js, po.routes.js, vendor.routes.js, index.js
│   │   │   └── models/                  # po.model.js, vendor.model.js
│   │   ├── incoming-quality/
│   │   │   ├── controllers/             # gateEntry.controller.js, inspection.controller.js, rtv.controller.js
│   │   │   ├── routes/                  # gateEntry.routes.js, inspection.routes.js, rtv.routes.js, index.js
│   │   │   └── models/                  # gateEntry.model.js, inspection.model.js
│   │   ├── store/
│   │   │   ├── controllers/             # stockBucket.controller.js, allocation.controller.js, issue.controller.js
│   │   │   ├── routes/                  # stockBucket.routes.js, allocation.routes.js, issue.routes.js, index.js
│   │   │   └── models/                  # inventory.model.js, allocationTransfer.model.js
│   │   ├── production-trial/
│   │   │   ├── controllers/             # assembly.controller.js, stageGate.controller.js, trialSnag.controller.js
│   │   │   ├── routes/                  # assembly.routes.js, stageGate.routes.js, trialSnag.routes.js, index.js
│   │   │   └── models/                  # assemblyStage.model.js, trialLog.model.js, snag.model.js
│   │   ├── dispatch/
│   │   │   ├── controllers/             # preDispatch.controller.js, packingList.controller.js, dossier.controller.js
│   │   │   ├── routes/                  # preDispatch.routes.js, packingList.routes.js, dossier.routes.js, index.js
│   │   │   └── models/                  # dispatchGate.model.js, packingList.model.js
│   │   └── after-sales/
│   │       ├── controllers/             # commissioning.controller.js, warranty.controller.js, sparePart.controller.js, ticket.controller.js
│   │       ├── routes/                  # commissioning.routes.js, warranty.routes.js, sparePart.routes.js, ticket.routes.js, index.js
│   │       └── models/                  # warranty.model.js, spareOrder.model.js, serviceTicket.model.js
│   ├── services/                        # Shared business utilities
│   │   ├── s3.service.js                # Presigned URL generation
│   │   └── ecoFreeze.service.js         # ECO PO/stock freeze engine
│   ├── seed/
│   │   └── seed.js                      # Industrial demo dataset
│   └── app.js                           # Express app assembling all 10 module routers
├── package.json
└── server.js                            # Server entry point
```

---

## 3. The 10 Modules & Route-Based RBAC Permissions
The system governs 10 distinct modules, with granular access control assigned per role and per user from the Admin panel:
1. `admin` (`/admin`) — System governance, user & role management, route/tab permissions matrix, IP whitelists.
2. `crm` (`/crm`) — Leads, bulk Excel import, quotes, deals.
3. `project-setup` (`/project-setup`) — **Unique Project ID / Master Work Order spine creation** (`PRJ-XXXX` / `WO-XXXX`). All subsequent progress across stages is tracked strictly against this unique ID.
4. `design` (`/design`) — Cloned project BOMs, CAD files (S3), ECO generation and approval.
5. `purchase` (`/purchase`) — BOM-driven procurement, PO approval workflows, supplier lead times.
6. `incoming-quality` (`/incoming-quality`) — Inward gate entries, quarantine holding, QC inspections (Accept/Reject/Rework), RTV vendor tracking.
7. `store` (`/store`) — Stock buckets (Ordered, In-QC, Accepted, Issued), strict hard reservation locked to Project ID.
8. `production-trial` (`/production-trial`) — Assembly stages, stage gate checklist sign-offs, machine trial logs, snag logging.
9. `dispatch` (`/dispatch`) — Pre-dispatch gate with Absolute Zero-Snag Block, packing lists, shipping dossiers.
10. `after-sales` (`/after-sales`) — Commissioning sign-off, warranty tracking, spare parts dispatch, maintenance visits.

### Route & Tab-Level RBAC Enforcement
* Every module and each of its sub-tabs corresponds to a distinct URL route (e.g. `/crm/leads`, `/project-setup/work-orders`).
* Middleware `authorizeRouteAccess` validates incoming requests against the authenticated user's assigned module/tab routes.

---

## 4. Strict Backend Business Rules
1. **Separation of Files:** Each controller, route, and model schema MUST be its own distinct file within `controllers/`, `routes/`, and `models/` sub-folders of the module. No mixed monolithic controller files.
2. **Unique Project ID Spine (Module 3):** Every project originates in `project-setup`. The generated ID (`PRJ-XXXX` / `WO-XXXX`) is an indexed foreign key required by all downstream records.
3. **ECO Freeze Engine (Module 4):** When an ECO status updates to `APPROVED`, immediately flag associated PO lines as `FROZEN_BY_ECO` and freeze the corresponding stock reservation.
4. **Hard Allocation Locking (Module 7):** When materials pass incoming QC, update `Inventory` with status `ACCEPTED` and `allocatedToProjectId: <ProjectId>`. Disallow issue endpoints without an active managerial transfer authorization.
5. **Absolute Zero-Snag Dispatch Validation (Module 9):** Before issuing a pre-dispatch clearance certificate or packing slip, the backend query MUST verify `count({ project: id, status: { $ne: 'RESOLVED' } }) === 0`.
6. **IP & Geo-Fencing Middleware:** Inspect incoming client IP against the user's or department's whitelisted IPs if restrictions are enabled.
7. **Admin-Controlled Refresh Token Expiry:** The `User` model includes `refreshTokenExpiry` (e.g. `8h`, `24h`, `7d`, `30d`), configured when creating/editing the user in the Admin panel. The auth service dynamically signs refresh tokens using each user's specific duration.
8. **Strict User Deactivation Only:** User accounts must NEVER be hard deleted. Deletion endpoints must be replaced by deactivation (`status: 'DEACTIVATED'`, `isActive: false`), instantly revoking their active sessions.
9. **Universal Schema Action Tracking:** Every schema across all 10 modules MUST include `createdBy`, `updatedBy`, and `{ timestamps: true }`. Status transitions must maintain an audit history array with `changedBy` and `changedAt`.
10. **Dual Currency & Locked Exchange Rate Rule:** Base operating currency is INR (₹). All monetary fields store `{ currency, amount, exchangeRate, baseAmountINR }`. The applied `exchangeRate` is permanently locked on quotation and PO creation, unaffected by future rate changes.
11. **Dual Unit & Base UOM Normalization Rule:** Items supporting alternate units store `{ baseQty, baseUom, altQty, altUom, conversionRatio }`. Stock ledgers and Net BOM Demand calculations MUST normalize to `baseUom`. Discrete units (`Nos`, `Pcs`, `Sets`) strictly enforce integer values.
12. **Human-Friendly, Conversational API Error Messages:** Controllers and error-handling middlewares MUST return conversational, human-friendly, informal messages in `{ message: "..." }` explaining the situation and actionable fix in clear, everyday English, avoiding raw database dumps, stack traces, or robotic error codes.

