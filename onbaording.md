# ShopLedger Onboarding

## Overview

ShopLedger is an internal Express application for a kirana and wholesale shop. It provides:

- POS order creation
- Inventory tracking
- Coupon and GST calculation
- Customer Khata credit accounts
- Khata payment settlements
- Order history and cancellation
- Printable HTML invoices
- Dashboard and GST reconciliation reports

The application stores its data in a single JSON file: `data/db.json`.

## Repository map

```text
server.js
├── Express setup and static frontend
├── /api/products and /api/coupons        routes/products.js
├── /api/orders                           routes/orders.js
├── /api/customers                        routes/customers.js
├── /api/reports and /api/pricing/preview routes/reports.js
└── /orders/:id/invoice                   lib/invoice.js

lib/
├── store.js       Reads/writes data/db.json and maintains the audit log
├── orders.js      Creates, lists, fetches, and cancels orders
├── inventory.js   Stock checks, deductions, releases, and summaries
├── pricing.js     Subtotals, discounts, and GST totals
├── coupons.js     Coupon validation and discount calculation
├── tax.js         HSN-based GST resolution and CGST/SGST splitting
├── ledger.js      Khata balances, credit limits, and settlements
├── reports.js     Dashboard and GST reconciliation reports
├── invoice.js     Printable HTML invoice generation
└── dates.js       Date formatting and filtering

public/
├── index.html     POS, order history, Khata, and audit screens
├── js/app.js      Browser behavior and API calls
└── css/style.css  UI styling

config.js          Shop settings, tax slabs, coupons, and admin key
data/db.json       Products, customers, orders, settlements, and audit log
```

## Main request areas

| Area | Endpoints | Main implementation |
|---|---|---|
| Products | `GET /api/products` | `routes/products.js` |
| Coupons | `GET /api/coupons` | `routes/products.js`, `lib/coupons.js` |
| Orders | `GET/POST /api/orders` | `routes/orders.js`, `lib/orders.js` |
| Cancellation | `POST /api/orders/:id/cancel` | `routes/orders.js`, `lib/orders.js` |
| Customers | `GET /api/customers` | `routes/customers.js`, `lib/ledger.js` |
| Settlements | `POST /api/customers/:id/settle` | `routes/customers.js`, `lib/ledger.js` |
| Pricing preview | `POST /api/pricing/preview` | `routes/reports.js`, `lib/pricing.js` |
| Dashboard | `GET /api/reports/dashboard` | `routes/reports.js`, `lib/reports.js` |
| GST reconciliation | `GET /api/reports/gst-reconciliation` | `lib/reports.js`, `lib/invoice.js` |
| Database export | `GET /api/admin/export?key=...` | `routes/reports.js`, `lib/store.js` |
| Invoice | `GET /orders/:id/invoice` | `lib/invoice.js` |

## Order lifecycle

1. The browser loads products from `GET /api/products`.
2. Cart changes call `POST /api/pricing/preview` for live totals.
3. The browser submits `POST /api/orders`.
4. The server reads `data/db.json` and validates the cart.
5. Each product ID is resolved against the database.
6. Quantities are parsed and stock is checked.
7. Coupon codes are normalized and validated.
8. Pricing is recalculated server-side using `lib/pricing.js` and `lib/tax.js`.
9. For Khata payments, the customer account and credit limit are checked.
10. Product stock is decremented.
11. A new order receives `db.nextOrderId` and is appended to `db.orders`.
12. An `ORDER_CREATED` audit entry is added.
13. The full database is written back to `data/db.json`.
14. The created order is returned with HTTP 201.

## Pricing and tax behavior

- Product prices and quantities determine the gross subtotal.
- Coupons are normalized to uppercase.
- Coupon discounts are calculated at cart level and apportioned across line items.
- GST is resolved from the item HSN code when configured.
- The default GST fallback is 18%.
- GST is split equally into CGST and SGST for the configured intra-state scenario.

## Khata behavior

For a Khata order:

- `customerId` is required.
- The current balance plus the order total is compared with `creditLimit`.
- `totalBilled` is increased when the order is created.
- Settlements increase `totalSettled` and reduce the calculated balance.
- Cancellation attempts to reverse the order debit.

## Confirmed risks and defects

These are directly supported by the current source code.

### Inventory cancellation is broken

New order items store `id`, but `inventory.release()` searches for `productId`. Cancellation therefore usually does not restore inventory. See `routes/orders.js`, `lib/orders.js`, and `lib/inventory.js`.

### Exact-stock orders are rejected

`inventory.check()` rejects `qty >= sellable`. A customer cannot purchase exactly the remaining sellable quantity; only quantities greater than available stock should be rejected.

### Inventory semantics are inconsistent

New orders decrement `stock`, while sellable stock also subtracts `reserved`. Cancellation attempts to adjust `reserved` instead of restoring `stock`.

### Invoice totals can differ from order totals

Order pricing uses HSN-based GST and discounts before tax. Invoice pricing defaults to 18% unless an item contains `gstRate`, and percentage discounts are calculated differently. The reconciliation report exists because these calculations can diverge.

### No normal API authentication

There is no authentication middleware protecting orders, cancellations, customer data, settlements, or reports.

### Hard-coded database export credential

`config.js` contains the admin key used by `/api/admin/export`. The endpoint returns the entire database, including customer and financial information.

### JSON-file persistence is not transactional

The application synchronously reads and rewrites one JSON file. Concurrent requests can lose updates, and a failed write could leave the application without a reliable recovery path.

### No meaningful automated tests

The `npm test` script exits with `Error: no test specified`.

### Other validation and security concerns

- Invalid quantities are converted to `1`.
- Arbitrary payment-mode strings are accepted.
- Invalid customer IDs are silently ignored for non-Khata orders.
- Settlement amounts are passed directly from request data.
- Several frontend values are inserted into HTML without escaping.
- Dates use `DD/MM/YYYY` and are compared lexicographically.
- The audit log retains only 100 entries.
- There is no backup, migration, schema version, locking, or crash-recovery mechanism.

## Suspected or needing confirmation

These points are plausible interpretations and should be confirmed with the team:

- The application may have been intended for a trusted local network or a single operator.
- The `reserved` inventory field may be leftover from an unfinished wholesale-quote workflow.
- The GST reconciliation feature may have been added after the invoice and order calculations diverged.
- The configured GSTIN, shop identity, coupons, and tax slabs may be sample or legacy values.
- Pending orders appear to consume stock immediately, but the intended dispatch policy is unclear.
- The hard-coded admin key suggests the original deployment relied on network-level trust.

## Recommended first checks

Before using this system for live sales, verify:

1. Inventory after cancelling a completed order.
2. Invoice totals for products using 5%, 12%, and 18% GST slabs.
3. Behavior when two orders are submitted concurrently.
4. Whether the server is reachable outside the trusted shop network.
5. Whether the configured GSTIN, address, coupons, and tax rules are current.
6. Whether pending orders should reserve stock or deduct it immediately.

## Development notes

- Entry point: `server.js`
- Start command declared in `package.json`: `npm start`
- Default port: `3000`, configurable through `PORT`
- Data file: `data/db.json`
- Application version shown in the UI: `0.8.4`
- Several comments identify changes made in 2021, so legacy behavior should be expected.
