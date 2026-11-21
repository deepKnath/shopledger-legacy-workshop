# ShopLedger

## Stack

- Node.js application using CommonJS modules.
- Express 4 server.
- `body-parser` for JSON request bodies.
- Static browser frontend under `public/` using HTML, CSS, and plain JavaScript.
- JSON-file persistence in `data/db.json`.
- Application entry point: `server.js`.

## Module map

- `server.js` — Express setup, static files, route registration, and invoice route.
- `routes/products.js` — product and coupon endpoints.
- `routes/orders.js` — order listing, creation, and cancellation endpoints.
- `routes/customers.js` — customer listing and Khata settlement endpoints.
- `routes/reports.js` — dashboard, pricing preview, GST reconciliation, and database export endpoints.
- `lib/store.js` — reads and writes `data/db.json`; appends audit entries.
- `lib/orders.js` — creates, retrieves, lists, and cancels orders.
- `lib/inventory.js` — product lookup, stock checks, stock changes, and inventory summaries.
- `lib/pricing.js` — subtotals, discounts, tax totals, and invoice line calculations.
- `lib/coupons.js` — coupon normalization, validation, and discount calculation.
- `lib/tax.js` — HSN-based GST rates and CGST/SGST splitting.
- `lib/ledger.js` — customer balances, Khata charges, reversals, and settlements.
- `lib/reports.js` — dashboard summaries and GST reconciliation.
- `lib/invoice.js` — printable HTML invoice rendering.
- `lib/dates.js` — date formatting and date-filter normalization.
- `config.js` — port, shop details, tax configuration, inventory defaults, coupons, and admin key.
- `public/` — browser UI and client-side API calls.

## Commands

- `npm start` — starts `server.js`.
- `npm test` — currently exits with `Error: no test specified`.

There is no other build or test command declared in `package.json`.

## Rules

- Write characterization tests before changing behaviour.
- Change only the module the ticket is about.
- Tests must never touch `data/db.json`.
- Add no dependencies.
