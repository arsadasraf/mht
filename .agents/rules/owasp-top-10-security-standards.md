# Rule: OWASP Top 10 Security Reference Standard & Controls

> **OWASP Top 10 Reference Standard:**
> *"The OWASP Top 10 is the reference standard for the most critical web application security risks. Adopting the OWASP Top 10 is perhaps the most effective first step towards changing your software development culture focused on producing secure code."*

This document outlines the required architectural and implementation controls across **Machine House - Winding Technologies ERP** to eliminate vulnerabilities defined in the OWASP Top 10 standard.

---

## 1. A01:2021 — Broken Access Control
* **Pre-Registered User Accounts Only:** Unregistered users cannot authenticate or access endpoints.
* **URL Route-Based RBAC:** Access control is enforced both on frontend Next.js App Router guards and backend Express API middleware down to exact module/tab routes.
* **No User Deletion Rule:** User records cannot be deleted (`isActive: false` only) preserving complete historical integrity.
* **CAD Drawing IP Protection:** Raw CAD files (.step, .dwg) are restricted to authorized design engineers; others view watermarked previews.
* **Hard Store Allocation Locking:** Materials accepted into inventory are locked to the target Unique Project ID (`PRJ-XXXX`). Cross-machine diversions are rejected without managerial override.

---

## 2. A02:2021 — Cryptographic Failures
* **Password Hashing:** Passwords hashed with `bcryptjs` using a salt work factor $\ge 10$.
* **Session & Cookie Security:** JWT access and refresh tokens stored in `HttpOnly`, `SameSite=Strict`, `Secure` cookies.
* **Pre-signed Cloud URLs:** AWS S3 access for CAD drawings and QC images uses short-lived (15-minute) presigned URLs.

---

## 3. A03:2021 — Injection
* **NoSQL Query Injection Prevention:** Strict sanitization of query parameters and request bodies stripping Mongo operator prefixes (`$`, `.`).
* **Mongoose Schema Type Validation:** All inputs strictly cast and validated against strict schema types.
* **Presigned S3 Upload Whitelist:** File extensions restricted to approved CAD, PDF, spreadsheet, and image types; executables strictly rejected.

---

## 4. A04:2021 — Insecure Design
* **Central Spine Integrity:** All machine operations revolve around the master Unique Project ID (`PRJ-XXXX`), preventing orphaned or mismatched production records.
* **Zero-Snag Dispatch Gate:** Pre-dispatch gate passes strictly require 100% snag resolution verified by QC inspection sign-off.
* **Automated ECO Freeze:** Engineering Change Orders immediately freeze connected PO lines and store stock.

---

## 5. A05:2021 — Security Misconfiguration
* **Security Headers via Helmet:** Express API uses `helmet()` to enforce strict CSP, HSTS, X-Content-Type-Options, Frameguard (anti-clickjacking), and Referrer-Policy.
* **Sanitized Meaningful Errors:** Error middleware suppresses raw stack traces, database details, and internal server paths in responses, providing meaningful and human-readable guidance.

---

## 6. A06:2021 — Vulnerable and Outdated Components
* Regular dependency auditing via `npm audit`.
* Lockfile pinning (`package-lock.json`).

---

## 7. A07:2021 — Identification and Authentication Failures
* **Brute-Force Lockout:** Account locked for 15 minutes after 5 consecutive failed login attempts.
* **Rate Limiting:** Auth endpoints capped at 10 requests/minute per IP; general API capped at 120 requests/minute per IP.
* **Admin-Controlled Refresh Token Expiry:** Configurable session refresh lifetime per user profile (`8h`, `24h`, `7d`, `30d`).
* **Refresh Token Rotation & Invalidation:** One-time use refresh tokens stored in MongoDB with immediate revocation upon user deactivation or admin termination.

---

## 8. A08:2021 — Software and Data Integrity Failures
* **Immutable Audit Trail:** Append-only logging of critical state transitions, approvals, ECOs, and stock issues.
* **Universal Action Tracking:** Every operational schema records `createdBy`, `updatedBy`, `createdAt`, and `updatedAt`.

---

## 9. A09:2021 — Security Logging and Monitoring Failures
* **Security Event Logging:** Failed login attempts, permission violations, IP fence violations, and sensitive entity modifications logged to `AuditLog`.

---

## 10. A10:2021 — Server-Side Request Forgery (SSRF)
* Outbound network requests (e.g. Google OAuth validation, AWS S3 API) use strictly validated, hardcoded Google and AWS endpoint domains with zero user-controlled remote URL fetching.
