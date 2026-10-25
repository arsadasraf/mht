# Rule: Security, Governance & Identity Directives

This document defines the strict cybersecurity, identity management, and intellectual property governance rules for **Machine House - Winding Technologies ERP**.

> **OWASP Top 10 Reference Standard:**
> *"The OWASP Top 10 is the reference standard for the most critical web application security risks. Adopting the OWASP Top 10 is perhaps the most effective first step towards changing your software development culture focused on producing secure code."*

---

## 1. Authentication & Onboarding Security
* **Universal Dual Mode Auth:** Google OAuth 2.0 (Enterprise SSO) + Corporate Email/Password credentials.
* **Pre-Registered Accounts Only:** An Admin must first create the employee profile in the Admin Panel (`/admin/users`). Unregistered Google accounts cannot sign up or access the system.
* **No User Deletion Rule (Deactivation Only):**
  * Once a user is created, they can **NEVER be deleted** from the database to preserve permanent audit integrity and historical associations.
  * Admins can only **deactivate** users (`isActive: false`, `status: 'DEACTIVATED'`).
  * Deactivation immediately revokes all active refresh tokens, clears active sessions, and terminates all system access.
* **Universal Action Tracking Across All Schemas:**
  * Every operational schema in the database MUST explicitly record the actor and timestamp for every creation and modification:
    * `createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }`
    * `updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }`
    * `createdAt: { type: Date, default: Date.now }` (managed via timestamps)
    * `updatedAt: { type: Date, default: Date.now }`
  * Status and milestone changes must track `changedBy` (User ID) and `changedAt` (Timestamp) in a dedicated history array for front-end audit visibility.
* **Brute-Force Protection & Lockout:**
  * Accounts are locked for 15 minutes after 5 consecutive failed login attempts.
  * Every failed attempt logs an incident with IP and timestamp into the security audit log.
* **Rate Limiting:**
  * Authentication endpoints (`/api/v1/auth/*`): 10 requests per minute per IP.
  * General API endpoints: 120 requests per minute per IP.
* **Session Lifecycle, Access Tokens & Admin-Controlled Refresh Tokens:**
  * **Short-Lived Access Tokens:** 15-minute JWT used for authenticating API requests.
  * **Admin-Controlled Refresh Token Expiry:** Configured per-user directly inside the User Creation & Edit form in the Admin Panel (`/admin/users`).
  * The `User` schema stores `refreshTokenExpiry` (e.g. `8h`, `24h`, `7d`, `30d`, or custom days/hours). When generating or refreshing tokens, the auth service uses the user's specific configured duration.
  * Refresh tokens are stored in the database and rotated on each refresh cycle.
  * **Instant Session Revocation:** Changing expiry, deactivating user, logging out, or Admin kicking a session invalidates the active refresh token in MongoDB immediately.
  * Tokens transmitted via secure `HttpOnly`, `SameSite=Strict` cookies.

---

## 2. Granular Route-Based RBAC & IP Whitelisting
* **Route & Tab Level Permissions:** Permissions are assigned from the Admin panel per role and per user down to the exact URL route (e.g. `/admin/users`, `/design/bom`, `/purchase/orders`).
* **Plant & Office IP Fencing:**
  * Configurable toggle per user or department in the Admin Panel.
  * When enabled, requests originating outside whitelisted CIDR / IP ranges are blocked with HTTP 403 Forbidden.

---

## 3. CAD & Proprietary Engineering IP Protection (Module 4)
* **Watermarked In-Browser Viewing:**
  * Subcontractors, vendors, and shop-floor technicians can only view 2D/3D drawings in a secure, in-browser viewer.
  * In-browser rendering dynamically embeds a semi-transparent watermark: `[User Name | Project ID | Date & Timestamp]`.
* **Download Restrictions:**
  * Raw CAD source files (`.dwg`, `.dxf`, `.step`, `.iges`) can only be downloaded by users with explicit `DESIGN_ENGINEER` or `ADMIN` privileges.
  * All file downloads use short-lived S3 presigned URLs (15-minute expiry).

---

## 4. Immutable Audit Trail (ISO 9001 Compliance)
* **Append-Only / Write-Only:**
  * Audit logs are strictly immutable: no user, including Super Admins, has the ability to update or delete audit records.
* **Event Tracking Scope:**
  * User logins and failed login attempts.
  * Stage gate transitions and Work Order creations.
  * ECO approvals and BOM changes.
  * Purchase Order approvals and cancellations.
  * Inventory allocations, issue receipts, and stock transfer authorizations.
  * Snag creation, resolution, and pre-dispatch clearances.
  * User role and permission alterations.
* **Log Schema Fields:** `userId`, `userName`, `role`, `action`, `module`, `entityId`, `entityType`, `ipAddress`, `userAgent`, `beforeDataSnapshot`, `afterDataSnapshot`, `timestamp`.

---

## 5. File Upload Sanitation & S3 Security
* **Whitelisted Extensions & MIME Types:**
  * Engineering CAD: `.step`, `.stp`, `.dwg`, `.dxf`, `.pdf` (Max 50MB)
  * CRM & Data Sheets: `.xlsx`, `.csv` (Max 10MB)
  * Photos & Inspection Evidence: `.png`, `.jpg`, `.jpeg`, `.webp` (Max 10MB)
* **Executable Block:**
  * Files with extensions `.exe`, `.bat`, `.cmd`, `.sh`, `.php`, `.js`, `.vbs`, `.scr`, `.jar` are rejected immediately at the API gateway.
* **Storage Partitioning:**
  * S3 keys partitioned by Project ID: `projects/{projectId}/cad/`, `projects/{projectId}/qc/`, `projects/{projectId}/dispatch/`.
