'use client';

import { useState } from 'react';
import { X, Download, XCircle, FileText, User, Building2, MessageCircle, Mail, Copy, Check } from 'lucide-react';
import type { BillingDocumentWithItems } from '@/types/billing';
import { DOC_TYPE_LABELS, PAYMENT_METHOD_LABELS } from '@/types/billing';

type Props = {
  doc: BillingDocumentWithItems | null;
  open: boolean;
  onClose: () => void;
  onCancelled: (docId: string) => void;
};

const fmt = (n: number) =>
  `₪${Number(n).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' });

export function DocumentDrawer({ doc, open, onClose, onCancelled }: Props) {
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!open || !doc) return null;

  const handleDownloadPDF = () => {
    window.open(`/api/billing-documents/${doc.id}/pdf`, '_blank');
  };

  const handleWhatsApp = () => {
    const phone = doc.customer_phone?.replace(/\D/g, '') ?? '';
    const normalized = phone.startsWith('0') ? `972${phone.slice(1)}` : phone;
    const total = `₪${Number(doc.total).toLocaleString('he-IL', { minimumFractionDigits: 2 })}`;
    const text = encodeURIComponent(
      `שלום ${doc.customer_name},\nמצורף ${DOC_TYPE_LABELS[doc.doc_type]} מספר ${doc.doc_number} על סך ${total}.\nניתן לצפות בפרטים המלאים בפנייה לקליניקה.`
    );
    const href = normalized
      ? `https://wa.me/${normalized}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(href, '_blank');
  };

  const handleEmail = () => {
    const total = `₪${Number(doc.total).toLocaleString('he-IL', { minimumFractionDigits: 2 })}`;
    const subject = encodeURIComponent(`${DOC_TYPE_LABELS[doc.doc_type]} מספר ${doc.doc_number}`);
    const body = encodeURIComponent(
      `שלום ${doc.customer_name},\n\nמצורף ${DOC_TYPE_LABELS[doc.doc_type]} מספר ${doc.doc_number} על סך ${total}.\n\nלפרטים נוספים ניתן לפנות אלינו.\n\nבברכה,\n${doc.business_name}`
    );
    const email = doc.customer_email ?? '';
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  };

  const handleCopyDocNumber = () => {
    navigator.clipboard.writeText(doc.doc_number).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleCancel = async () => {
    setCancelError(null);
    setCancelling(true);
    try {
      const res = await fetch(`/api/billing-documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'שגיאה בביטול');
      onCancelled(doc.id);
      setConfirmCancel(false);
      onClose();
    } catch (e) {
      setCancelError(e instanceof Error ? e.message : 'שגיאה בביטול המסמך');
    } finally {
      setCancelling(false);
    }
  };

  const vatPct = Math.round(Number(doc.vat_rate) * 100);

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className="fixed top-0 left-0 bottom-0 z-50 w-full max-w-md bg-white dark:bg-zinc-900
          shadow-2xl flex flex-col overflow-hidden"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-zinc-800">
              <FileText className="h-4 w-4 text-slate-600 dark:text-zinc-400" />
            </div>
            <div>
              <p className="font-mono text-sm font-semibold text-slate-900 dark:text-zinc-100">
                {doc.doc_number}
              </p>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                {DOC_TYPE_LABELS[doc.doc_type]}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:text-zinc-500
              dark:hover:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Status badge */}
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium
              ${doc.status === 'issued'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
              }`}>
              {doc.status === 'issued' ? 'הופק' : 'בוטל'}
            </span>
            <span className="text-xs text-slate-400 dark:text-zinc-500">{fmtDate(doc.issued_at)}</span>
          </div>

          {/* Customer info */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <User className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-500" />
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-500">
                פרטי לקוח
              </h3>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-zinc-800 p-4 space-y-2">
              <p className="text-sm font-medium text-slate-900 dark:text-zinc-100">{doc.customer_name}</p>
              {doc.customer_phone && (
                <p className="text-xs text-slate-500 dark:text-zinc-400">{doc.customer_phone}</p>
              )}
              {doc.customer_email && (
                <p className="text-xs text-slate-500 dark:text-zinc-400">{doc.customer_email}</p>
              )}
              {doc.customer_address && (
                <p className="text-xs text-slate-500 dark:text-zinc-400">{doc.customer_address}</p>
              )}
              {doc.customer_type === 'business' && doc.customer_business_number && (
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  ח.פ / ע.מ: {doc.customer_business_number}
                </p>
              )}
            </div>
          </section>

          {/* Business info */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-500" />
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-500">
                פרטי מנפיק
              </h3>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-zinc-800 p-4 space-y-2">
              <p className="text-sm font-medium text-slate-900 dark:text-zinc-100">{doc.business_name}</p>
              <p className="text-xs text-slate-500 dark:text-zinc-400">מס׳ עסק: {doc.business_number}</p>
              {doc.vat_number && (
                <p className="text-xs text-slate-500 dark:text-zinc-400">עוסק מורשה: {doc.vat_number}</p>
              )}
              {doc.business_address && (
                <p className="text-xs text-slate-500 dark:text-zinc-400">{doc.business_address}</p>
              )}
            </div>
          </section>

          {/* Line items */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-500" />
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-500">
                פריטים
              </h3>
            </div>
            <div className="rounded-lg border border-slate-100 dark:border-zinc-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-zinc-800 border-b border-slate-100 dark:border-zinc-700">
                    <th className="py-2 px-3 text-right text-xs font-medium text-slate-500 dark:text-zinc-400">תיאור</th>
                    <th className="py-2 px-3 text-center text-xs font-medium text-slate-500 dark:text-zinc-400 w-12">כמות</th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-slate-500 dark:text-zinc-400 w-24">מחיר</th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-slate-500 dark:text-zinc-400 w-24">סה״כ</th>
                  </tr>
                </thead>
                <tbody>
                  {(doc.billing_document_items ?? []).map((item) => (
                    <tr key={item.id} className="border-b border-slate-50 dark:border-zinc-800/60 last:border-0">
                      <td className="py-2.5 px-3 text-slate-700 dark:text-zinc-300">{item.description}</td>
                      <td className="py-2.5 px-3 text-center text-slate-500 dark:text-zinc-400 tabular-nums">{item.quantity}</td>
                      <td className="py-2.5 px-3 text-left text-slate-500 dark:text-zinc-400 tabular-nums">{fmt(item.unit_price)}</td>
                      <td className="py-2.5 px-3 text-left text-slate-700 dark:text-zinc-300 tabular-nums font-medium">{fmt(item.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Totals */}
          <section>
            <div className="rounded-lg bg-slate-50 dark:bg-zinc-800 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-zinc-400 tabular-nums">{fmt(doc.subtotal)}</span>
                <span className="text-slate-600 dark:text-zinc-400">סכום לפני מע״מ</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-zinc-400 tabular-nums">{fmt(doc.vat_amount)}</span>
                <span className="text-slate-600 dark:text-zinc-400">מע״מ ({vatPct}%)</span>
              </div>
              <div className="border-t border-slate-200 dark:border-zinc-700 pt-2 mt-1 flex justify-between">
                <span className="font-bold text-slate-900 dark:text-zinc-100 tabular-nums text-base">{fmt(doc.total)}</span>
                <span className="font-semibold text-slate-700 dark:text-zinc-300">סה״כ לתשלום</span>
              </div>
            </div>
          </section>

          {/* Cancellation info */}
          {doc.status === 'cancelled' && doc.cancellation_doc_id && (
            <div className="rounded-lg border border-red-100 dark:border-red-800/40 bg-red-50 dark:bg-red-900/10 p-4">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="h-4 w-4 text-red-500" />
                <p className="text-sm font-medium text-red-700 dark:text-red-400">מסמך זה בוטל</p>
              </div>
              {doc.cancelled_at && (
                <p className="text-xs text-red-500 dark:text-red-400/70">
                  תאריך ביטול: {fmtDate(doc.cancelled_at)}
                </p>
              )}
            </div>
          )}

          {/* Cancel confirm */}
          {confirmCancel && doc.status === 'issued' && (
            <div className="rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4 space-y-3">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                ביטול מסמך — פעולה זו אינה הפיכה
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                יונפק מסמך ביטול (BTL) המקושר למסמך זה. שני המסמכים יישמרו לצורכי ביקורת.
              </p>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="סיבת הביטול (אופציונלי)"
                className="w-full rounded-lg border border-amber-200 dark:border-amber-700 bg-white dark:bg-zinc-800
                  px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              {cancelError && (
                <p className="text-xs text-red-600 dark:text-red-400">{cancelError}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => { setConfirmCancel(false); setCancelError(null); }}
                  disabled={cancelling}
                  className="flex-1 rounded-lg border border-slate-200 dark:border-zinc-700 px-3 py-2 text-xs
                    text-slate-600 dark:text-zinc-300 hover:bg-slate-50 transition-colors disabled:opacity-40"
                >
                  חזרה
                </button>
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white
                    hover:bg-red-700 transition-colors disabled:opacity-40"
                >
                  {cancelling ? 'מבטל...' : 'אשר ביטול'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="border-t border-slate-100 dark:border-zinc-800 px-6 py-4 space-y-2 shrink-0">
          {/* Primary: download */}
          <button
            onClick={handleDownloadPDF}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900
              dark:bg-zinc-100 px-4 py-2.5 text-sm font-medium text-white dark:text-zinc-900
              hover:bg-slate-700 dark:hover:bg-zinc-300 transition-colors"
          >
            <Download className="h-4 w-4" />
            הורדת PDF
          </button>

          {/* Secondary: WhatsApp + Email + Copy */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleWhatsApp}
              title="שלח בוואטסאפ"
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border
                border-green-200 dark:border-green-800/50 bg-green-50 dark:bg-green-900/20
                px-3 py-2 text-xs font-medium text-green-700 dark:text-green-400
                hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              וואטסאפ
            </button>
            <button
              onClick={handleEmail}
              title="שלח במייל"
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border
                border-blue-200 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-900/20
                px-3 py-2 text-xs font-medium text-blue-700 dark:text-blue-400
                hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              <Mail className="h-3.5 w-3.5" />
              מייל
            </button>
            <button
              onClick={handleCopyDocNumber}
              title="העתק מספר מסמך"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border
                border-slate-200 dark:border-zinc-700 px-3 py-2 text-xs font-medium
                text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800
                transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>

          {/* Cancel */}
          {doc.status === 'issued' && !confirmCancel && (
            <button
              onClick={() => setConfirmCancel(true)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-red-200
                dark:border-red-800 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400
                hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <XCircle className="h-4 w-4" />
              בטל מסמך
            </button>
          )}
        </div>
      </div>
    </>
  );
}
