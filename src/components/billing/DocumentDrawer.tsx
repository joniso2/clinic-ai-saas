'use client';

import { useState } from 'react';
import { X, Download, XCircle, FileText, User, Building2, MessageCircle, Mail, Copy, Check, Hash } from 'lucide-react';
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
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  if (!open || !doc) return null;

  const handleDownloadPDF = async () => {
    setPdfError(null);
    setPdfLoading(true);
    try {
      const res = await fetch(`/api/billing-documents/${doc.id}/pdf`);
      if (!res.ok) {
        const text = await res.text();
        console.error(`[DocumentDrawer] PDF download failed (${res.status}):`, text);
        let errorMsg = 'שגיאה בהורדת PDF';
        try { errorMsg = (JSON.parse(text) as { error?: string }).error ?? errorMsg; } catch {}
        throw new Error(errorMsg);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.doc_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setPdfError(e instanceof Error ? e.message : 'שגיאה בהורדת PDF');
    } finally {
      setPdfLoading(false);
    }
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
          shadow-[0_10px_30px_rgba(0,0,0,0.12),0_4px_8px_rgba(0,0,0,0.06)]
          dark:shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/30">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-mono text-[15px] font-bold text-slate-900 dark:text-zinc-100">
                  {doc.doc_number}
                </p>
                <button
                  onClick={handleCopyDocNumber}
                  className="rounded-md p-1 text-slate-300 hover:text-slate-500 dark:text-zinc-600 dark:hover:text-zinc-400 transition-colors"
                  title="העתק מספר מסמך"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
              <p className="text-[13px] text-slate-500 dark:text-zinc-400">
                {DOC_TYPE_LABELS[doc.doc_type]}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400
              hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200
              transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Status + Date banner */}
          <div className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-zinc-800/50 px-4 py-3">
            <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-[5px] text-[12px] font-medium border leading-none
              ${doc.status === 'issued'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40'
                : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/40'
              }`}>
              {doc.status === 'issued' ? <Check className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
              {doc.status === 'issued' ? 'הופק' : 'בוטל'}
            </span>
            <span className="text-[13px] text-slate-500 dark:text-zinc-400 tabular-nums">{fmtDate(doc.issued_at)}</span>
          </div>

          {/* Total highlight */}
          <div className="rounded-xl bg-gradient-to-l from-blue-50/50 to-white dark:from-blue-950/10 dark:to-zinc-900
            border border-blue-100/60 dark:border-blue-900/30 p-5 text-center">
            <p className="text-[13px] text-slate-500 dark:text-zinc-400 mb-1">סה״כ לתשלום</p>
            <p className="text-[32px] font-bold text-slate-900 dark:text-zinc-100 tabular-nums leading-none">
              {fmt(doc.total)}
            </p>
            <div className="mt-2 flex items-center justify-center gap-4">
              <span className="text-[12px] text-slate-400 dark:text-zinc-500 tabular-nums">
                לפני מע״מ: {fmt(doc.subtotal)}
              </span>
              <span className="text-[12px] text-slate-400 dark:text-zinc-500 tabular-nums">
                מע״מ ({vatPct}%): {fmt(doc.vat_amount)}
              </span>
            </div>
          </div>

          {/* Customer info */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <User className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-500" />
              <h3 className="text-[12px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
                פרטי לקוח
              </h3>
            </div>
            <div className="rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/40 p-4 space-y-2">
              <p className="text-[14px] font-semibold text-slate-900 dark:text-zinc-100">{doc.customer_name}</p>
              {doc.customer_phone && (
                <p className="text-[13px] text-slate-500 dark:text-zinc-400 tabular-nums">{doc.customer_phone}</p>
              )}
              {doc.customer_email && (
                <p className="text-[13px] text-slate-500 dark:text-zinc-400">{doc.customer_email}</p>
              )}
              {doc.customer_address && (
                <p className="text-[13px] text-slate-500 dark:text-zinc-400">{doc.customer_address}</p>
              )}
              {doc.customer_type === 'business' && doc.customer_business_number && (
                <p className="text-[13px] text-slate-500 dark:text-zinc-400">
                  ח.פ / ע.מ: <span className="font-medium text-slate-600 dark:text-zinc-300">{doc.customer_business_number}</span>
                </p>
              )}
            </div>
          </section>

          {/* Business info */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-500" />
              <h3 className="text-[12px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
                פרטי מנפיק
              </h3>
            </div>
            <div className="rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/40 p-4 space-y-2">
              <p className="text-[14px] font-semibold text-slate-900 dark:text-zinc-100">{doc.business_name}</p>
              <p className="text-[13px] text-slate-500 dark:text-zinc-400">מס׳ עסק: <span className="font-medium text-slate-600 dark:text-zinc-300">{doc.business_number}</span></p>
              {doc.vat_number && (
                <p className="text-[13px] text-slate-500 dark:text-zinc-400">עוסק מורשה: <span className="font-medium text-slate-600 dark:text-zinc-300">{doc.vat_number}</span></p>
              )}
              {doc.business_address && (
                <p className="text-[13px] text-slate-500 dark:text-zinc-400">{doc.business_address}</p>
              )}
            </div>
          </section>

          {/* Line items */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Hash className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-500" />
              <h3 className="text-[12px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
                פריטים
              </h3>
            </div>
            <div className="rounded-xl border border-slate-100 dark:border-zinc-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/70 dark:bg-zinc-800/80 border-b border-slate-200 dark:border-zinc-700">
                    <th className="py-2.5 px-3 text-right text-[12px] font-semibold text-slate-500 dark:text-zinc-400 tracking-wide">תיאור</th>
                    <th className="py-2.5 px-3 text-center text-[12px] font-semibold text-slate-500 dark:text-zinc-400 tracking-wide w-12">כמות</th>
                    <th className="py-2.5 px-3 text-left text-[12px] font-semibold text-slate-500 dark:text-zinc-400 tracking-wide w-24">מחיר</th>
                    <th className="py-2.5 px-3 text-left text-[12px] font-semibold text-slate-500 dark:text-zinc-400 tracking-wide w-24">סה״כ</th>
                  </tr>
                </thead>
                <tbody>
                  {(doc.billing_document_items ?? []).map((item) => (
                    <tr key={item.id} className="border-b border-slate-50 dark:border-zinc-800/60 last:border-0">
                      <td className="py-3 px-3 text-[13px] text-slate-700 dark:text-zinc-300">{item.description}</td>
                      <td className="py-3 px-3 text-center text-[13px] text-slate-500 dark:text-zinc-400 tabular-nums">{item.quantity}</td>
                      <td className="py-3 px-3 text-left text-[13px] text-slate-500 dark:text-zinc-400 tabular-nums">{fmt(item.unit_price)}</td>
                      <td className="py-3 px-3 text-left text-[13px] text-slate-700 dark:text-zinc-300 tabular-nums font-semibold">{fmt(item.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Cancellation info */}
          {doc.status === 'cancelled' && doc.cancellation_doc_id && (
            <div className="rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50/80 dark:bg-red-900/10 p-4">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="h-4 w-4 text-red-500" />
                <p className="text-[14px] font-semibold text-red-700 dark:text-red-400">מסמך זה בוטל</p>
              </div>
              {doc.cancelled_at && (
                <p className="text-[13px] text-red-500 dark:text-red-400/70">
                  תאריך ביטול: {fmtDate(doc.cancelled_at)}
                </p>
              )}
            </div>
          )}

          {/* Cancel confirm */}
          {confirmCancel && doc.status === 'issued' && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4 space-y-3">
              <p className="text-[14px] font-semibold text-amber-800 dark:text-amber-200">
                ביטול מסמך — פעולה זו אינה הפיכה
              </p>
              <p className="text-[13px] text-amber-700 dark:text-amber-300">
                יונפק מסמך ביטול (BTL) המקושר למסמך זה. שני המסמכים יישמרו לצורכי ביקורת.
              </p>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="סיבת הביטול (אופציונלי)"
                className="w-full rounded-lg border border-amber-200 dark:border-amber-700 bg-white dark:bg-zinc-800
                  px-3 h-11 text-sm text-right focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all"
              />
              {cancelError && (
                <p className="text-[13px] text-red-600 dark:text-red-400">{cancelError}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => { setConfirmCancel(false); setCancelError(null); }}
                  disabled={cancelling}
                  className="flex-1 rounded-lg border border-slate-200 dark:border-zinc-700 px-3 h-10 text-sm
                    text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40"
                >
                  חזרה
                </button>
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="flex-1 rounded-lg bg-red-600 px-3 h-10 text-sm font-semibold text-white
                    hover:bg-red-700 transition-colors disabled:opacity-40 shadow-sm"
                >
                  {cancelling ? 'מבטל...' : 'אשר ביטול'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="border-t border-slate-100 dark:border-zinc-800 px-6 py-4 space-y-2.5 shrink-0">
          {/* Primary: download */}
          <button
            onClick={handleDownloadPDF}
            disabled={pdfLoading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600
              h-11 text-sm font-semibold text-white hover:bg-blue-700 transition-colors
              shadow-sm disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {pdfLoading ? 'מוריד...' : 'הורדת PDF'}
          </button>
          {pdfError && (
            <p className="text-[13px] text-red-600 dark:text-red-400 text-center">{pdfError}</p>
          )}

          {/* Secondary: WhatsApp + Email */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleWhatsApp}
              title="שלח בוואטסאפ"
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border
                border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-900/20
                h-10 text-[13px] font-semibold text-emerald-700 dark:text-emerald-400
                hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              וואטסאפ
            </button>
            <button
              onClick={handleEmail}
              title="שלח במייל"
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border
                border-blue-200 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-900/20
                h-10 text-[13px] font-semibold text-blue-700 dark:text-blue-400
                hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              <Mail className="h-3.5 w-3.5" />
              מייל
            </button>
          </div>

          {/* Cancel */}
          {doc.status === 'issued' && !confirmCancel && (
            <button
              onClick={() => setConfirmCancel(true)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-red-200
                dark:border-red-800 h-10 text-sm font-medium text-red-600 dark:text-red-400
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
