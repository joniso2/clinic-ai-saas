// ── Enums ──────────────────────────────────────────────────────────────────

export type BillingBusinessType = 'osek_patur' | 'osek_murshe' | 'chevra';

export type BillingDocType =
  | 'receipt'
  | 'transaction_invoice'
  | 'tax_invoice'
  | 'tax_invoice_receipt'
  | 'cancellation_document';

export type BillingDocStatus = 'issued' | 'cancelled';

export type AllocationStatus = 'not_required' | 'pending' | 'approved' | 'rejected' | 'error';

export type BillingCustomerType = 'private' | 'business';

export type PaymentMethod = 'cash' | 'credit' | 'bit' | 'paybox' | 'bank_transfer' | 'other';

export type PaymentStatus = 'pending' | 'received' | 'failed' | 'refunded';

export type AuditEventType =
  | 'document_issued'
  | 'document_viewed'
  | 'pdf_downloaded'
  | 'cancellation_created'
  | 'allocation_requested'
  | 'allocation_approved'
  | 'allocation_rejected'
  | 'payment_linked'
  | 'payment_refunded'
  | 'settings_updated';

// ── Entities ───────────────────────────────────────────────────────────────

export type BillingSettings = {
  clinic_id: string;
  business_name: string;
  business_number: string;
  business_type: BillingBusinessType;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  vat_number: string | null;
  updated_at: string;
};

export type VatRate = {
  id: string;
  rate: number;
  effective_from: string;
  effective_until: string | null;
  label: string | null;
  created_at: string;
};

export type IsraelInvoiceThreshold = {
  id: string;
  amount_before_vat: number;
  effective_from: string;
  effective_until: string | null;
  notes: string | null;
  created_at: string;
};

export type BillingDocumentItem = {
  id: string;
  document_id: string;
  service_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export type BillingDocument = {
  id: string;
  clinic_id: string;
  doc_type: BillingDocType;
  doc_number: string;
  seq_number: number;
  document_year: number;

  patient_id: string | null;
  appointment_id: string | null;

  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  customer_type: BillingCustomerType;
  customer_business_number: string | null;
  customer_address: string | null;

  business_name: string;
  business_number: string;
  business_address: string | null;
  vat_number: string | null;

  subtotal: number;
  vat_rate: number;
  vat_amount: number;
  total: number;
  currency: string;

  pdf_url: string | null;

  status: BillingDocStatus;
  cancelled_at: string | null;
  cancellation_doc_id: string | null;
  cancels_document_id: string | null;

  tax_authority_allocation_number: string | null;
  allocation_status: AllocationStatus;
  allocation_requested_at: string | null;
  allocation_response_at: string | null;
  allocation_raw_response: Record<string, unknown> | null;

  issued_at: string;
  created_at: string;
};

export type BillingDocumentWithItems = BillingDocument & {
  billing_document_items: BillingDocumentItem[];
};

export type Payment = {
  id: string;
  clinic_id: string;
  appointment_id: string | null;
  patient_id: string | null;
  amount: number;
  currency: string;
  payment_method: PaymentMethod;
  payment_date: string;
  reference_number: string | null;
  is_refund: boolean;
  refund_for_id: string | null;
  refund_reason: string | null;
  status: PaymentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type BillingDocumentPayment = {
  id: string;
  document_id: string;
  payment_id: string;
  allocated_amount: number;
};

export type BillingAuditLog = {
  id: string;
  clinic_id: string;
  document_id: string | null;
  payment_id: string | null;
  event_type: AuditEventType;
  actor_user_id: string | null;
  event_payload: Record<string, unknown> | null;
  created_at: string;
};

// ── Request / Response types ───────────────────────────────────────────────

export type CreateDocumentItem = {
  service_id?: string | null;
  description: string;
  quantity: number;
  unit_price: number;
};

export type CreateDocumentBody = {
  doc_type: BillingDocType;
  patient_id?: string | null;
  appointment_id?: string | null;
  customer_name: string;
  customer_phone?: string | null;
  customer_email?: string | null;
  customer_type?: BillingCustomerType;
  customer_business_number?: string | null;
  customer_address?: string | null;
  items: CreateDocumentItem[];
};

export type UpdateBillingSettingsBody = {
  business_name?: string;
  business_number?: string;
  business_type?: BillingBusinessType;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logo_url?: string | null;
  vat_number?: string | null;
};

export type CreatePaymentBody = {
  appointment_id?: string | null;
  patient_id?: string | null;
  amount: number;
  payment_method: PaymentMethod;
  payment_date: string;
  reference_number?: string | null;
  notes?: string | null;
};

// ── Constants ──────────────────────────────────────────────────────────────

export const DOC_TYPE_PREFIXES: Record<BillingDocType, string> = {
  receipt:                'KBL',
  transaction_invoice:    'CSK',
  tax_invoice:            'CMT',
  tax_invoice_receipt:    'CMTK',
  cancellation_document:  'BTL',
};

export const DOC_TYPE_LABELS: Record<BillingDocType, string> = {
  receipt:                'קבלה',
  transaction_invoice:    'חשבונית עסקה',
  tax_invoice:            'חשבונית מס',
  tax_invoice_receipt:    'חשבונית מס קבלה',
  cancellation_document:  'מסמך ביטול',
};

export const ALLOWED_DOC_TYPES: Record<BillingBusinessType, BillingDocType[]> = {
  osek_patur:   ['receipt', 'transaction_invoice'],
  osek_murshe:  ['receipt', 'transaction_invoice', 'tax_invoice', 'tax_invoice_receipt'],
  chevra:       ['receipt', 'transaction_invoice', 'tax_invoice', 'tax_invoice_receipt'],
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash:           'מזומן',
  credit:         'אשראי',
  bit:            'ביט',
  paybox:         'פייבוקס',
  bank_transfer:  'העברה בנקאית',
  other:          'אחר',
};

export const BILLING_BUSINESS_TYPE_LABELS: Record<BillingBusinessType, string> = {
  osek_patur:   'עוסק פטור',
  osek_murshe:  'עוסק מורשה',
  chevra:       'חברה',
};
