# Rule: Currency & Financial Standards

This document defines the currency handling, foreign exchange (Forex) locking, database schema representation, and UI formatting rules for **Machine House - Winding Technologies ERP**.

> **OWASP Top 10 Reference Standard:**
> *"The OWASP Top 10 is the reference standard for the most critical web application security risks. Adopting the OWASP Top 10 is perhaps the most effective first step towards changing your software development culture focused on producing secure code."*

---

## 1. Base Currency & Multi-Currency Scope
* **Default Base Currency:** **INR (₹ - Indian Rupee)** is the primary operational and inventory valuation currency.
* **Configurable Base:** The company base currency can be configured by Admins in Global Masters (`/admin/masters`).
* **Multi-Currency Transactions:**
  * Module 02 (CRM): Customer quotations and sales deals can be quoted in foreign currencies (e.g., `USD`, `EUR`, `GBP`, `AED`).
  * Module 05 (Purchase): Purchase orders for imported components, drives, sensors, and PLCs can be issued in vendor currencies (e.g., `USD`, `EUR`, `JPY`).

---

## 2. Exchange Rate Master & Transaction Locking
* **Admin Exchange Rate Master:**
  * Admin maintains standard conversion rates in `/admin/masters` (e.g. `1 USD = 83.50 INR`, `1 EUR = 90.20 INR`).
* **Rate Auto-Population & Locking:**
  * When selecting a foreign currency on a Quote or PO, the system auto-populates the current Admin rate.
  * Authorized sales or procurement personnel may enter a locked negotiated conversion rate.
  * **Immutable Transaction Rate:** Once a Quote or PO is created/approved, the applied `exchangeRate` is permanently locked to that record. Future exchange rate updates in masters do NOT alter historical transactions.

---

## 3. Database Schema: Dual-Amount Structure
To guarantee financial precision and prevent float arithmetic inaccuracies, all monetary fields in Mongoose schemas MUST implement the **Dual-Amount Pattern**:

```javascript
// Reusable sub-schema for monetary fields
const MonetaryAmountSchema = new mongoose.Schema(
  {
    currency: {
      type: String,
      required: true,
      default: 'INR',
      uppercase: true,
      trim: true // e.g. 'INR', 'USD', 'EUR'
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
      set: (val) => Math.round(val * 100) / 100 // 2-decimal rounding
    },
    exchangeRate: {
      type: Number,
      required: true,
      default: 1.0,
      min: 0.0001
    },
    baseAmountINR: {
      type: Number,
      required: true,
      min: 0,
      set: (val) => Math.round(val * 100) / 100 // 2-decimal rounding
    }
  },
  { _id: false }
);
```

* **Calculation Hook:** Before saving any document with monetary amounts, pre-save middleware ensures `baseAmountINR = Math.round((amount * exchangeRate) * 100) / 100`.

---

## 4. Frontend Formatting & Numbering Systems
* **Formatting Utility (`src/utils/formatters.js`):**
  * **INR (Indian Rupee):** Formatted using the Indian numbering system (Lakhs and Crores):
    * `formatCurrency(1250000, 'INR')` $\rightarrow$ `₹12,50,000.00`
  * **Foreign Currencies:** Formatted using standard international grouping (Millions/Thousands):
    * `formatCurrency(15000, 'USD')` $\rightarrow$ `$15,000.00`
    * `formatCurrency(15000, 'EUR')` $\rightarrow$ `€15,000.00`
* **Dual Currency UI Display:**
  * On foreign currency Quotes and POs, the UI displays both the transactional amount and its equivalent base value:
    * Primary display: `$15,000.00`
    * Sub-text badge: `(₹12,52,500.00 @ ₹83.50/USD)`
