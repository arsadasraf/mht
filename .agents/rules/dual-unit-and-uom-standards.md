# Rule: Dual Unit (Alternate UOM) & Inventory Calculation Standards

This document defines the mathematical rules, schema patterns, precision constraints, and net demand calculation standards for items tracked in **Dual Units (Primary & Alternate UOM)** across **Machine House - Winding Technologies ERP**.

> **OWASP Top 10 Reference Standard:**
> *"The OWASP Top 10 is the reference standard for the most critical web application security risks. Adopting the OWASP Top 10 is perhaps the most effective first step towards changing your software development culture focused on producing secure code."*

---

## 1. Item Master UOM Architecture
In industrial machinery manufacturing, items are frequently procured, stocked, and consumed in different units (e.g., Steel Rods in *Meters vs Kg*, Fasteners in *Boxes vs Nos*, Wire in *Kg vs Meters*).

Each item in the Global Item Master defines:
* **`baseUom` (Mandatory & Immutable):** The single authoritative accounting unit used for all inventory ledgers, valuation, and BOM net demand calculations (e.g., `Meters` or `Nos`).
* **`hasAlternateUom` (Boolean):** Flag indicating if the item supports a secondary transactional unit.
* **`alternateUom` (Optional):** The secondary unit (e.g., `Kg` or `Boxes`).
* **`conversionRatio` (Number):** The exact physical conversion ratio between the Base UOM and Alternate UOM:
  * Formula: $\text{Base Quantity} \times \text{Conversion Ratio} = \text{Alternate Quantity}$  
    *(e.g., 1 Meter $\times$ 3.85 = 3.85 Kg, or 1 Box $\times$ 50 = 50 Nos)*.

---

## 2. Discrete vs Continuous Precision Rules
To prevent impossible fractional physical items (e.g. 1.34 pieces of a motor or bolt):
* **Discrete Units (`isFractional: false`):**
  * Units such as `Nos`, `Pcs`, `Sets`, `Units`, `Boxes` MUST be whole integers (`0` decimal places).
  * Backend validator strictly enforces `Number.isInteger(qty) === true`.
* **Continuous Units (`isFractional: true`):**
  * Units such as `Kg`, `Grams`, `Meters`, `Liters`, `Sq.M` support high-precision decimal measurements (up to `3` or `4` decimal places).
  * Standard rounding helper `round3(val) = Math.round(val * 1000) / 1000`.

---

## 3. Bidirectional Synchronized Input & Dual-Quantity Schema
Users can enter quantities in EITHER the Base UOM or Alternate UOM across Quotes, BOMs, Purchase Orders, Gate Inward, and Material Issue. The UI auto-populates the counterpart field, and the database stores both while normalizing stock to the Base UOM:

```javascript
// Reusable sub-schema for dual-unit quantities
const DualQuantitySchema = new mongoose.Schema(
  {
    baseQty: {
      type: Number,
      required: true,
      min: 0
    },
    baseUom: {
      type: String,
      required: true,
      uppercase: true,
      trim: true // e.g. 'METERS', 'NOS'
    },
    altQty: {
      type: Number,
      min: 0
    },
    altUom: {
      type: String,
      uppercase: true,
      trim: true // e.g. 'KG', 'BOXES'
    },
    conversionRatio: {
      type: Number,
      min: 0.000001
    }
  },
  { _id: false }
);
```

* **Backend Pre-Save Normalization:** If `altQty` is provided without `baseQty`, the server computes `baseQty = altQty / conversionRatio` before saving, ensuring the stock ledger is 100% normalized to `baseUom`.

---

## 4. Error-Free BOM Net Demand & Stock Allocation
* **Stock Ledger Normalization:**
  * All 4 Store buckets (`Ordered`, `In-QC`, `Accepted`, `Issued`) are mathematically computed and tracked in `baseUom`.
* **Net Procurement Demand Formula:**
  $$\text{Net Demand}_{\text{Base}} = \text{Gross BOM Demand}_{\text{Base}} - (\text{Available Free Stock}_{\text{Base}} + \text{Active PO Lines}_{\text{Base}})$$
* **Dual Display on Procurement Requisitions:**
  * When material shortage is identified, the Purchase module displays the requisition in both units:  
    * Example: *"Net Shortage: 250 Meters (212.50 Kg @ 0.85 Kg/Meter)"*.
  * Purchase Orders can be sent to vendors in their preferred billing unit (e.g., Kg), with the backend converting and tracking fulfillment against the machine's BOM demand in Base UOM without divergence.
