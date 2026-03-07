/**
 * Billing math helpers.
 *
 * Rules:
 * - All monetary values use round-half-up to 2 decimal places.
 * - Every calculation step is rounded independently — errors do not accumulate.
 * - JS floating-point arithmetic is used here with explicit rounding.
 *   For future high-volume / edge-case hardening, replace with decimal.js.
 * - These functions are server-side only. Client UI may display previews
 *   but the values stored in billing_documents are always from here.
 */

/** Round a monetary value to 2 decimal places (round half up). */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** quantity × unit_price, rounded. */
export function calcLineTotal(quantity: number, unitPrice: number): number {
  return roundMoney(quantity * unitPrice);
}

/** Sum of already-rounded line totals. */
export function calcSubtotal(lineTotals: number[]): number {
  return roundMoney(lineTotals.reduce((acc, t) => acc + t, 0));
}

/** VAT amount from subtotal and rate (e.g. 0.18), rounded. */
export function calcVatAmount(subtotal: number, vatRate: number): number {
  return roundMoney(subtotal * vatRate);
}

/** Document total = subtotal + vatAmount (both already rounded). */
export function calcTotal(subtotal: number, vatAmount: number): number {
  return roundMoney(subtotal + vatAmount);
}

export type ComputedDocumentTotals = {
  line_totals: number[];
  subtotal: number;
  vat_amount: number;
  total: number;
};

export type RawLineItem = {
  quantity: number;
  unit_price: number;
};

/**
 * Compute all document totals from raw line items and a VAT rate.
 * Returns per-item line_totals alongside subtotal, vat_amount, total.
 */
export function computeDocumentTotals(
  items: RawLineItem[],
  vatRate: number,
): ComputedDocumentTotals {
  const line_totals = items.map((i) => calcLineTotal(i.quantity, i.unit_price));
  const subtotal = calcSubtotal(line_totals);
  const vat_amount = calcVatAmount(subtotal, vatRate);
  const total = calcTotal(subtotal, vat_amount);
  return { line_totals, subtotal, vat_amount, total };
}
