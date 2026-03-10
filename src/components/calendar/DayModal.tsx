'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Plus, Phone, MessageCircle, Sparkles, ReceiptText, Calendar as CalendarIcon } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { ConfirmDeleteModal } from '@/components/dashboard/ConfirmDeleteModal';
import type { Appointment } from '@/types/appointments';
import type { Lead } from '@/types/leads';
import { formatTime } from '@/lib/calendar/time.utils';
import { getAppointmentStatusBadgeClass, getAppointmentStatusLabel, getAppointmentStatusHex, APPOINTMENT_TYPE_PILL } from '@/lib/status-colors';
import type { BillingSettings, BillingDocumentWithItems } from '@/types/billing';
import { CreateDocumentModal } from '@/components/billing/CreateDocumentModal';

export type DayModalProps = {
  day: number;
  month: number;
  year: number;
  appointments: Appointment[];
  onClose: () => void;
  onDelete: (id: string) => void;
  onAdd: (day: number) => void;
  onViewLead: (lead: Lead) => void;
};

export function DayModal({
  day, month, year, appointments, onClose, onDelete, onAdd, onViewLead,
}: DayModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, true);
  useEscapeKey(true, onClose);

  const [leadCache, setLeadCache] = useState<Record<string, Lead>>({});
  const [billingSettings, setBillingSettings] = useState<BillingSettings | null | 'loading' | 'none'>('loading');
  const [receiptApt, setReceiptApt] = useState<Appointment | null>(null);
  const [appointmentReceiptMap, setAppointmentReceiptMap] = useState<Record<string, boolean>>({});
  const [deleteAptId, setDeleteAptId] = useState<string | null>(null);

  // Fetch billing settings once so we can enable/disable the receipt button
  useEffect(() => {
    fetch('/api/billing-settings')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => setBillingSettings(data?.settings ?? 'none'))
      .catch((err) => { console.error('Failed to load billing settings:', err); setBillingSettings('none'); });
  }, []);

  // Check which completed appointments already have receipts (single batch request)
  useEffect(() => {
    const completedIds = appointments
      .filter((a) => a.status === 'completed')
      .map((a) => a.id);
    if (completedIds.length === 0) return;
    fetch(`/api/billing-documents?appointment_ids=${completedIds.join(',')}&limit=100`, { credentials: 'include' })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        const map: Record<string, boolean> = {};
        for (const id of completedIds) map[id] = false;
        for (const doc of (d?.documents ?? [])) {
          if (doc.status !== 'cancelled' && doc.appointment_id) {
            map[doc.appointment_id] = true;
          }
        }
        setAppointmentReceiptMap(map);
      })
      .catch((err) => console.error('Failed to check receipts:', err));
  }, [appointments]);

  const handleIssueReceipt = (apt: Appointment) => {
    if (billingSettings && billingSettings !== 'loading' && billingSettings !== 'none') {
      setReceiptApt(apt);
    }
  };

  useEffect(() => {
    const ids = [...new Set(appointments.map((a) => a.lead_id).filter(Boolean) as string[])];
    if (ids.length === 0) return;
    const params = new URLSearchParams({ ids: ids.join(',') });
    fetch(`/api/leads/by-ids?${params}`, { credentials: 'include' })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        const cache: Record<string, Lead> = {};
        (data?.leads ?? []).forEach((lead: Lead) => {
          if (lead?.id) cache[lead.id] = lead;
        });
        setLeadCache(cache);
      })
      .catch((err) => console.error('Failed to load lead names:', err));
  }, [appointments]);

  const dateLabel = new Intl.DateTimeFormat('he-IL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  }).format(new Date(year, month - 1, day));

  function formatPhone(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    return raw;
  }

  function waHref(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    const normalized = digits.startsWith('0') ? `972${digits.slice(1)}` : digits;
    return `https://wa.me/${normalized}`;
  }

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={onClose} role="presentation">
      <div ref={panelRef} className="modal-enter w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-[0_10px_30px_rgba(0,0,0,0.12),0_4px_8px_rgba(0,0,0,0.06)]" role="dialog" aria-modal="true" aria-label="תורים ליום" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-4 flex-row-reverse">
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">תורים</p>
            <h2 className="text-[18px] font-semibold text-slate-900 dark:text-slate-50 mt-0.5">{dateLabel}</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-0.5 text-[12px] font-medium text-indigo-700 dark:text-indigo-400">
              {appointments.length} תורים
            </span>
            <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" aria-label="סגור">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="max-h-[480px] overflow-y-auto px-5 py-3 space-y-3">
          {appointments.length === 0 && (
            <div className="py-10 text-center">
              <CalendarIcon className="h-8 w-8 text-slate-200 dark:text-slate-700 mx-auto mb-2" />
              <p className="text-[14px] text-slate-400 dark:text-slate-500">אין תורים ביום זה.</p>
            </div>
          )}
          {appointments.map((apt) => {
            const lead = apt.lead_id ? leadCache[apt.lead_id] : undefined;
            const phone = lead?.phone ?? null;
            const interest = lead?.interest ?? null;
            const accentHex = getAppointmentStatusHex(apt.status);
            const statusBadge = getAppointmentStatusBadgeClass(apt.status);
            const statusLabel = getAppointmentStatusLabel(apt.status);

            return (
              <div key={apt.id}
                className="group relative overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/80 transition hover:bg-slate-50/80 dark:hover:bg-slate-800/60 shadow-sm hover:shadow-md">
                <div className="absolute start-0 top-0 bottom-0 w-1 rounded-s-xl" style={{ background: accentHex }} />
                <div className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-slate-900 dark:text-slate-100 leading-tight truncate">{apt.patient_name}</p>
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400 tabular-nums">{formatTime(apt.datetime)}</p>
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${APPOINTMENT_TYPE_PILL[apt.type] ?? APPOINTMENT_TYPE_PILL['new']}`}>
                          {apt.type === 'follow_up' ? 'מעקב' : 'חדש'}
                        </span>
                        {apt.status && apt.status !== 'scheduled' && (
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadge}`}>
                            {statusLabel}
                          </span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => setDeleteAptId(apt.id)}
                      className="shrink-0 rounded-full p-1.5 text-slate-300 dark:text-slate-600 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-500 transition-colors sm:opacity-0 sm:group-hover:opacity-100">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {phone && (
                    <div className="mt-2.5 flex items-center gap-3">
                      <a href={`tel:${phone}`}
                        className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                        <Phone className="h-3 w-3 shrink-0" />
                        {formatPhone(phone)}
                      </a>
                      <a href={waHref(phone)} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1 text-xs text-emerald-500 hover:text-emerald-600 transition-colors">
                        <MessageCircle className="h-3 w-3 shrink-0" />
                        וואטסאפ
                      </a>
                    </div>
                  )}

                  {interest && (
                    <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500 truncate">
                      עניין עיקרי: {interest}
                    </p>
                  )}

                  {lead && (
                    <button
                      onClick={() => onViewLead(lead)}
                      className="flex items-center gap-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/40 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors mt-2">
                      <Sparkles className="h-3 w-3" />
                      AI Summary
                    </button>
                  )}

                  {apt.status === 'completed' && (
                    appointmentReceiptMap[apt.id] ? (
                      <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                        <ReceiptText className="h-3 w-3" />
                        קבלה הופקה
                      </span>
                    ) : (
                      <button
                        onClick={() => handleIssueReceipt(apt)}
                        disabled={billingSettings === 'loading' || billingSettings === 'none'}
                        title={billingSettings === 'none' ? 'נדרש להגדיר פרטי עסק תחילה' : 'הפק קבלה עבור תור זה'}
                        className="mt-2 flex items-center gap-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40
                          px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400
                          hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors
                          disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ReceiptText className="h-3 w-3" />
                        הפק קבלה
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-4">
          <button onClick={() => { onClose(); onAdd(day); }}
            className="inline-flex items-center justify-center gap-2 h-10 w-full rounded-lg bg-indigo-600 text-white text-[14px] font-semibold hover:bg-indigo-700 transition-all duration-150">
            <Plus className="h-4 w-4" /> הוסף תור
          </button>
        </div>
      </div>
    </div>

    <ConfirmDeleteModal
      open={!!deleteAptId}
      title="מחיקת תור"
      message="האם למחוק את התור? לא ניתן לשחזר."
      onConfirm={() => { if (deleteAptId) onDelete(deleteAptId); setDeleteAptId(null); }}
      onCancel={() => setDeleteAptId(null)}
    />

    {receiptApt && billingSettings && billingSettings !== 'loading' && billingSettings !== 'none' && (
      <CreateDocumentModal
        settings={billingSettings}
        appointmentId={receiptApt.id}
        appointmentLabel={`${receiptApt.patient_name} — ${formatTime(receiptApt.datetime)}`}
        prefillCustomerName={receiptApt.patient_name}
        prefillServiceName={receiptApt.service_name ?? undefined}
        prefillPrice={receiptApt.revenue ?? undefined}
        fromAppointment
        onClose={() => setReceiptApt(null)}
        onIssued={(_doc: BillingDocumentWithItems) => {
          setAppointmentReceiptMap((prev) => ({ ...prev, [receiptApt.id]: true }));
          setReceiptApt(null);
        }}
      />
    )}
    </>
  );
}
