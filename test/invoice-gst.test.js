const test = require('node:test');
const assert = require('node:assert/strict');

const pricing = require('../lib/pricing');
const invoice = require('../lib/invoice');
const reports = require('../lib/reports');

function riceItem(overrides) {
  return Object.assign({
    id: 1,
    sku: 'GRN-001',
    name: 'Indrayani Basmati Rice 5kg',
    hsn: '1006',
    price: 640,
    qty: 1
  }, overrides || {});
}

function billedOrder(overrides) {
  return Object.assign({
    id: 1001,
    date: '21/11/2026',
    customer: 'Walk-in',
    paymentMode: 'cash',
    status: 'completed',
    items: [riceItem()],
    coupon: '',
    subtotal: 640,
    discount: 0,
    tax: 32,
    total: 672
  }, overrides || {});
}

test('CURRENT BEHAVIOUR: order pricing applies the HSN GST slab before calculating the billed total', () => {
  const totals = pricing.computeTotals([riceItem()], '');

  assert.deepEqual({
    subtotal: totals.subtotal,
    discount: totals.discount,
    taxable: totals.taxable,
    tax: totals.tax,
    cgst: totals.cgst,
    sgst: totals.sgst,
    total: totals.total
  }, {
    subtotal: 640,
    discount: 0,
    taxable: 640,
    tax: 32,
    cgst: 16,
    sgst: 16,
    total: 672
  });
  assert.equal(totals.lines[0].gstPercent, 5);
  assert.equal(totals.lines[0].tax, 32);
});

test('invoice calculation uses the HSN GST slab for an HSN-only order line', () => {
  const figures = invoice.computeInvoiceFigures(billedOrder());

  assert.deepEqual({
    subtotal: figures.subtotal,
    discount: figures.discount,
    tax: figures.tax,
    cgst: figures.cgst,
    sgst: figures.sgst,
    total: figures.total
  }, {
    subtotal: 640,
    discount: 0,
    tax: 32,
    cgst: 16,
    sgst: 16,
    total: 672
  });
  assert.equal(figures.rows[0].gstPercent, 5);
  assert.equal(figures.rows[0].lineTax, 32);
});

test('invoice total and GST match the amount billed for an HSN-only order line', () => {
  const order = billedOrder();
  const figures = invoice.computeInvoiceFigures(order);

  assert.equal(order.tax, 32);
  assert.equal(order.total, 672);
  assert.equal(Number((figures.tax - order.tax).toFixed(2)), 0);
  assert.equal(Number((figures.total - order.total).toFixed(2)), 0);
});

test('invoice discount, GST, and total use the same basis as order pricing', () => {
  const items = [riceItem()];
  const totals = pricing.computeTotals(items, 'SAVE10');
  const order = billedOrder({
    coupon: 'SAVE10',
    discount: totals.discount,
    tax: totals.tax,
    total: totals.total
  });
  const figures = invoice.computeInvoiceFigures(order);

  assert.deepEqual({
    orderDiscount: order.discount,
    orderTax: order.tax,
    orderTotal: order.total
  }, {
    orderDiscount: 64,
    orderTax: 28.8,
    orderTotal: 604.8
  });
  assert.deepEqual({
    invoiceDiscount: figures.discount,
    invoiceTax: figures.tax,
    invoiceTotal: figures.total
  }, {
    invoiceDiscount: 64,
    invoiceTax: 28.8,
    invoiceTotal: 604.8
  });
});

test('GST reconciliation reports a matched active order when invoice and ledger figures agree', () => {
  const result = reports.getGstReconciliation({
    orders: [billedOrder()]
  });

  assert.equal(result.totalChecked, 1);
  assert.equal(result.mismatchCount, 0);
  assert.equal(result.totalDelta, 0);
  assert.deepEqual(result.rows[0], {
    orderId: 1001,
    date: '21/11/2026',
    customer: 'Walk-in',
    coupon: '',
    ledgerSubtotal: 640,
    ledgerDiscount: 0,
    ledgerTax: 32,
    ledgerTotal: 672,
    invoiceDiscount: 0,
    invoiceTax: 32,
    invoiceTotal: 672,
    delta: 0,
    matched: true
  });
});

test('CURRENT BEHAVIOUR: invoice uses an explicit gstRate only when the order line contains one', () => {
  const figures = invoice.computeInvoiceFigures(billedOrder({
    items: [riceItem({ gstRate: 5 })]
  }));

  assert.equal(figures.rows[0].gstPercent, 5);
  assert.equal(figures.tax, 32);
  assert.equal(figures.total, 672);
});

test('invoice total and GST breakdown match what the customer was billed', () => {
  const order = billedOrder();
  const figures = invoice.computeInvoiceFigures(order);

  assert.equal(figures.tax, order.tax);
  assert.equal(figures.cgst, 16);
  assert.equal(figures.sgst, 16);
  assert.equal(figures.total, order.total);
});
