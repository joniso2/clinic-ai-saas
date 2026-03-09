import type { BillingDocType } from '@/types/billing';

export type KPIs = {
  total_issued: number;
  total_revenue: number;
  total_cancelled: number;
  total_vat: number;
};

export const fmt = (n: number) =>
  `₪${Number(n).toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export const fmtFull = (n: number) =>
  `₪${Number(n).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' });

export const DOC_TYPE_FILTER_OPTIONS: { value: BillingDocType | ''; label: string }[] = [
  { value: '',                    label: 'כל הסוגים' },
  { value: 'receipt',             label: 'קבלות' },
  { value: 'transaction_invoice', label: 'חשבוניות עסקה' },
  { value: 'tax_invoice',         label: 'חשבוניות מס' },
  { value: 'tax_invoice_receipt', label: 'חשבוניות מס קבלה' },
  { value: 'cancellation_document', label: 'ביטולים' },
];

export const PAGE_SIZE = 20;
