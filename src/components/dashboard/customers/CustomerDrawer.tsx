'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  X, Phone, Calendar, MessageCircle, Archive, FileText,
  Bell, BellRing, Sparkles, Clock, TrendingUp, ReceiptText,
} from 'lucide-react';
import type { Patient } from '@/types/patients';
import type { CompletedAppointmentRow } from '@/repositories/appointment.repository';
import { formatCurrencyILS, formatPhoneILS } from '@/lib/hebrew';
import type { BillingDocumentWithItems, BillingSettings } from '@/types/billing';
import { DOC_TYPE_LABELS } from '@/types/billing';
import { DocumentDrawer } from '@/components/billing/DocumentDrawer';
import { CreateDocumentModal } from '@/components/billing/CreateDocumentModal';
import {
  type RecallEntry,
  getStatusBadgeStyle,
  getAvatarColor,
  getInitials,
  formatDate,
  daysSince,
  getValuePatient,
} from './customers-helpers';

// ─── Suggested actions ────────────────────────────────────────────────────────

type Suggestion = { icon: React.ReactNode; text: string; color: 'amber' | 'indigo' | 'emerald' | 'slate' };

function computeSuggestions(customer: Patient | null, allCustomers: Patient[]): Suggestion[] {
  if (!customer) return [];
  const out: Suggestion[] = [];
  const days = daysSince(customer.last_visit_date);

  if (days !== null && days >= 60)
    out.push({ icon: <Clock className="h-4 w-4" />, text: `לא ביקר/ה כבר ${days} יום — מומלץ ליצור קשר`, color: 'amber' });

  if (customer.visits_count === 1)
    out.push({ icon: <Sparkles className="h-4 w-4" />, text: 'ביקור ראשון בלבד — מומלץ לעשות פולואפ', color: 'indigo' });

  const revenues = allCustomers.map(getValuePatient).filter((v) => v > 0).sort((a, b) => b - a);
  if (revenues.length > 0) {
    const threshold = revenues[Math.max(0, Math.floor(revenues.length * 0.2) - 1)];
    if (getValuePatient(customer) >= threshold && threshold > 0)
      out.push({ icon: <TrendingUp className="h-4 w-4" />, text: 'לקוח ערך גבוה — שקול הצעת טיפול נאמנות', color: 'emerald' });
  }

  if (days !== null && days >= 30 && days < 60)
    out.push({ icon: <Bell className="h-4 w-4" />, text: 'חודש ללא ביקור — זמן טוב לשלוח תזכורת', color: 'slate' });

  return out;
}

// ─── Customer Drawer ──────────────────────────────────────────────────────────

export function CustomerDrawer({
  customer, appointments, loading, allCustomers,
  recall, onRecallChange, onClose, onSchedule, onDelete,
}: {
  customer: Patient | null;
  appointments: CompletedAppointmentRow[];
  loading: boolean;
  allCustomers: Patient[];
  recall: RecallEntry;
  onRecallChange: (r: RecallEntry) => void;
  onClose: () => void;
  onSchedule: () => void;
  onDelete: () => void;
}) {
  const suggestions = useMemo(() => computeSuggestions(customer, allCustomers), [customer, allCustomers]);
  const statusBadge = customer ? getStatusBadgeStyle(customer.status) : null;
  const avatarColor = customer ? getAvatarColor(customer.id) : 'bg-slate-400';
  const initials = getInitials(customer?.full_name);
  const daysAgo = daysSince(customer?.last_visit_date ?? null);

  // Billing state
  const [billingDocs, setBillingDocs] = useState<BillingDocumentWithItems[]>([]);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [selectedBillingDoc, setSelectedBillingDoc] = useState<BillingDocumentWithItems | null>(null);
  const [billingDrawerOpen, setBillingDrawerOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createModalAppointment, setCreateModalAppointment] = useState<CompletedAppointmentRow | null>(null);
  const [billingSettingsData, setBillingSettingsData] = useState<BillingSettings | null | 'loading' | 'none'>(null);

  // Reset when customer changes
  useEffect(() => { setBillingDocs([]); setCreateModalAppointment(null); }, [customer?.id]);

  // Map: appointment_id → billing doc (for duplicate protection)
  const appointmentDocMap = useMemo(() => {
    const map = new Map<string, BillingDocumentWithItems>();
    for (const doc of billingDocs) {
      if (doc.appointment_id && doc.status !== 'cancelled') {
        map.set(doc.appointment_id, doc);
      }
    }
    return map;
  }, [billingDocs]);

  // Revenue derived from billing docs when available
  const billingDocsTotal = useMemo(() => {
    const issued = billingDocs.filter((d) => d.status === 'issued');
    if (issued.length === 0) return null;
    return issued.reduce((sum, d) => sum + Number(d.total), 0);
  }, [billingDocs]);

  const loadBillingDocs = useCallback(async () => {
    if (!customer?.id) return;
    setBillingLoading(true);
    setBillingError(null);
    try {
      const res = await fetch(`/api/billing-documents?patient_id=${customer.id}&limit=50`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'שגיאה');
      setBillingDocs(data.documents ?? []);
    } catch {
      setBillingError('שגיאה בטעינת מסמכים');
    } finally {
      setBillingLoading(false);
    }
  }, [customer?.id]);

  // Load billing docs whenever the customer changes
  useEffect(() => {
    loadBillingDocs();
  }, [loadBillingDocs]);

  const handleOpenCreateModal = useCallback(async (apt?: CompletedAppointmentRow) => {
    setCreateModalAppointment(apt ?? null);
    if (billingSettingsData && billingSettingsData !== 'loading' && billingSettingsData !== 'none') {
      setCreateModalOpen(true);
      return;
    }
    setBillingSettingsData('loading');
    try {
      const res = await fetch('/api/billing-settings');
      const data = res.ok ? await res.json() : null;
      const s: BillingSettings | null = data?.settings ?? null;
      setBillingSettingsData(s ?? 'none');
      if (s) setCreateModalOpen(true);
      else alert('נדרש להגדיר פרטי עסק תחילה');
    } catch {
      setBillingSettingsData('none');
    }
  }, [billingSettingsData]);

  const SUGGESTION_CLS: Record<string, string> = {
    amber:   'bg-amber-50 border-amber-200/70 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800/40 dark:text-amber-300',
    indigo:  'bg-indigo-50 border-indigo-200/70 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-800/40 dark:text-indigo-300',
    emerald: 'bg-emerald-50 border-emerald-200/70 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800/40 dark:text-emerald-300',
    slate:   'bg-slate-50 border-slate-200/70 text-slate-600 dark:bg-slate-800/60 dark:border-slate-700/60 dark:text-slate-300',
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        className="relative w-full max-w-[420px] bg-white dark:bg-slate-950 border-s border-slate-200 dark:border-slate-800 shadow-2xl overflow-y-auto flex flex-col"
        dir="rtl"
        style={{ animation: 'slideInFromRight 220ms ease-out forwards' }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${avatarColor} text-white text-sm font-bold shrink-0`}>
              {initials}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50 leading-tight">{customer?.full_name ?? '...'}</h2>
              {statusBadge && (
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium mt-0.5 ${statusBadge.cls}`}>
                  {statusBadge.label}
                </span>
              )}
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition" aria-label="סגור">
            <X className="h-5 w-5" />
          </button>
        </div>


        <div className="flex-1 p-5 space-y-5">
          {loading && !customer ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-indigo-500" />
            </div>
          ) : customer ? (
            <>
              {/* Contact info */}
              <section>
                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em] mb-2">פרטי קשר</p>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 divide-y divide-slate-100 dark:divide-slate-800">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Phone className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
                    <a href={`tel:${customer.phone}`} dir="ltr" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                      {formatPhoneILS(customer.phone)}
                    </a>
                  </div>
                  {daysAgo !== null && (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <Clock className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
                      <span className="text-sm text-slate-600 dark:text-slate-300">
                        ביקור אחרון לפני <span className="font-semibold">{daysAgo}</span> ימים
                      </span>
                    </div>
                  )}
                </div>
              </section>

              {/* Revenue summary */}
              <section>
                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em] mb-2">סיכום פיננסי</p>
                <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 dark:from-emerald-500/20 dark:to-transparent border border-emerald-200/60 dark:border-emerald-800/30 p-4">
                  <p className="text-[2rem] font-bold text-slate-900 dark:text-slate-50 tabular-nums leading-none">
                    {formatCurrencyILS(billingDocsTotal ?? Number(customer.total_revenue))}
                  </p>
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                    {customer.visits_count} ביקורים · ביקור אחרון {formatDate(customer.last_visit_date)}
                    {billingDocsTotal !== null && (
                      <span className="mr-1.5 text-emerald-600 dark:text-emerald-400">· לפי קבלות</span>
                    )}
                  </p>
                </div>
              </section>

              {/* Billing: קבלות וחשבוניות */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em]">קבלות וחשבוניות</p>
                  <button
                    type="button"
                    onClick={() => handleOpenCreateModal()}
                    disabled={billingSettingsData === 'loading'}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ReceiptText className="h-3.5 w-3.5" />
                    הפק קבלה
                  </button>
                </div>

                {billingLoading && (
                  <div className="flex justify-center py-5">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-indigo-500" />
                  </div>
                )}
                {billingError && (
                  <p className="text-sm text-red-500 py-3 text-center">{billingError}</p>
                )}

                {!billingLoading && !billingError && billingDocs.length === 0 && (
                  <div className="py-6 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                    <FileText className="mx-auto h-7 w-7 text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-sm text-slate-400 dark:text-slate-500">אין קבלות עדיין ללקוח זה</p>
                    <button
                      type="button"
                      onClick={() => handleOpenCreateModal()}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
                    >
                      <ReceiptText className="h-3.5 w-3.5" />
                      הפק קבלה
                    </button>
                  </div>
                )}

                {billingDocs.length > 0 && (
                  <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                    <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">תאריך</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">סוג</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 text-left">שירות</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 text-left">סכום</span>
                    </div>
                    <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
                      {billingDocs.map((doc) => (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => { setSelectedBillingDoc(doc); setBillingDrawerOpen(true); }}
                          className="w-full grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center px-3 py-2.5 text-right hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <span className="text-xs text-slate-600 dark:text-slate-300 tabular-nums">
                            {new Date(doc.issued_at).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                          </span>
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
                            {DOC_TYPE_LABELS[doc.doc_type]}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[72px] text-left">
                            {doc.billing_document_items?.[0]?.description ?? '—'}
                          </span>
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-50 tabular-nums whitespace-nowrap text-left">
                            ₪{Number(doc.total).toLocaleString('he-IL', { minimumFractionDigits: 0 })}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedBillingDoc && (
                  <DocumentDrawer
                    doc={selectedBillingDoc}
                    open={billingDrawerOpen}
                    onClose={() => setBillingDrawerOpen(false)}
                    onCancelled={(id) => setBillingDocs((prev) => prev.map((d) => d.id === id ? { ...d, status: 'cancelled' as const } : d))}
                  />
                )}

                {createModalOpen && billingSettingsData && billingSettingsData !== 'loading' && billingSettingsData !== 'none' && (
                  <CreateDocumentModal
                    settings={billingSettingsData}
                    patientId={customer.id}
                    appointmentId={createModalAppointment?.id}
                    fromAppointment={!!createModalAppointment}
                    prefillCustomerName={customer.full_name ?? undefined}
                    prefillPhone={customer.phone ?? undefined}
                    prefillServiceName={createModalAppointment?.service_name ?? undefined}
                    prefillPrice={createModalAppointment?.revenue ?? undefined}
                    onClose={() => { setCreateModalOpen(false); setCreateModalAppointment(null); }}
                    onIssued={(doc) => {
                      setBillingDocs((prev) => [doc, ...prev]);
                      setCreateModalOpen(false);
                      setCreateModalAppointment(null);
                    }}
                  />
                )}
              </section>

              {/* Suggested actions */}
              {suggestions.length > 0 && (
                <section>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                    <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em]">פעולות מוצעות</p>
                  </div>
                  <div className="space-y-2">
                    {suggestions.map((s, i) => (
                      <div key={i} className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-sm ${SUGGESTION_CLS[s.color]}`}>
                        <span className="mt-0.5 shrink-0">{s.icon}</span>
                        <span>{s.text}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Recall / follow-up */}
              <section>
                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em] mb-2">מעקב וחזרה</p>
                <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/40 p-4 space-y-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      {recall.active
                        ? <BellRing className="h-4 w-4 text-indigo-500" />
                        : <Bell className="h-4 w-4 text-slate-400 dark:text-slate-500" />}
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">מסומן לפולואפ</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRecallChange({ ...recall, active: !recall.active })}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${recall.active ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                      aria-checked={recall.active}
                      role="switch"
                    >
                      <span
                        className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200"
                        style={{ transform: recall.active ? 'translateX(18px)' : 'translateX(2px)' }}
                      />
                    </button>
                  </label>
                  {recall.active && (
                    <div>
                      <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">תאריך תזכורת</label>
                      <input
                        type="date"
                        value={recall.reminderDate}
                        onChange={(e) => onRecallChange({ ...recall, reminderDate: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                        dir="rtl"
                      />
                    </div>
                  )}
                </div>
              </section>

              {/* Appointment history */}
              {appointments.length > 0 && (
                <section>
                  <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em] mb-2">
                    היסטוריית תורים ({appointments.length})
                  </p>
                  <div className="space-y-2">
                    {appointments.map((apt) => {
                      const existingDoc = appointmentDocMap.get(apt.id);
                      return (
                        <div key={apt.id} className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/40 px-3 py-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{formatDate(apt.datetime)}</p>
                              {apt.service_name && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{apt.service_name}</p>}
                              {apt.notes && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{apt.notes}</p>}
                            </div>
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 tabular-nums whitespace-nowrap shrink-0">
                              {apt.revenue != null ? formatCurrencyILS(apt.revenue) : '—'}
                            </span>
                          </div>
                          {/* Receipt action row */}
                          <div className="mt-2 flex items-center gap-2">
                            {existingDoc ? (
                              <>
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                                  <ReceiptText className="h-3 w-3" />
                                  קבלה הופקה
                                </span>
                                <button
                                  type="button"
                                  onClick={() => { setSelectedBillingDoc(existingDoc); setBillingDrawerOpen(true); }}
                                  className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                                >
                                  צפה בקבלה
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenCreateModal(apt)}
                                disabled={billingSettingsData === 'loading'}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <ReceiptText className="h-3 w-3" />
                                הפק קבלה
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Action buttons */}
              <section className="pt-1">
                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em] mb-2">פעולות</p>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <a
                    href={`tel:${customer.phone}`}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-3 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                  >
                    <Phone className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    התקשר
                  </a>
                  <button
                    type="button"
                    onClick={() => window.open(`https://wa.me/972${(customer.phone ?? '').replace(/\D/g, '').replace(/^0/, '')}`, '_blank')}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-green-200 dark:border-green-800/50 bg-green-50 dark:bg-green-900/20 px-2 py-3 text-xs font-medium text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 transition"
                  >
                    <MessageCircle className="h-4 w-4" />
                    וואטסאפ
                  </button>
                  <button
                    type="button"
                    onClick={onSchedule}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800/50 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-3 text-xs font-medium text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition"
                  >
                    <Calendar className="h-4 w-4" />
                    קבע תור
                  </button>
                </div>
                <button
                  type="button"
                  onClick={onDelete}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-400 dark:text-slate-500 hover:border-red-200 dark:hover:border-red-800/50 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400 transition"
                >
                  <Archive className="h-4 w-4" /> ארכוב לקוח
                </button>
              </section>
            </>
          ) : null}
        </div>
      </div>

      <style>{`
        @keyframes slideInFromRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
