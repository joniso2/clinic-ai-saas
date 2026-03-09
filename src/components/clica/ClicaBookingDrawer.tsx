'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { ServiceList } from '@/components/booking/ServiceList';
import { DateSelector } from '@/components/booking/DateSelector';
import { TimeGrid } from '@/components/booking/TimeGrid';
import { PhoneInput } from '@/components/booking/PhoneInput';
import { OtpVerification } from '@/components/booking/OtpVerification';
import { SuccessScreen } from '@/components/booking/SuccessScreen';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import type {
  Clinic,
  ClinicService,
  ClinicWorker,
  WorkingHours,
  BookingStep,
  Appointment,
} from '@/types/booking';

const STEP_ORDER: BookingStep[] = ['services', 'date', 'time', 'phone', 'otp', 'success'];
const STEP_LABELS: Record<BookingStep, string> = {
  services: 'שירות',
  worker: 'מטפל',
  date: 'תאריך',
  time: 'שעה',
  phone: 'פרטים',
  otp: 'אימות',
  success: 'אושר',
};

interface ClicaBookingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  clinic: Clinic;
  services: ClinicService[];
  workers: ClinicWorker[];
  workingHours: WorkingHours[];
}

export function ClicaBookingDrawer({
  isOpen,
  onClose,
  clinic,
  services,
  workers,
  workingHours,
}: ClicaBookingDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, isOpen);
  useEscapeKey(isOpen, onClose);

  const [step, setStep] = useState<BookingStep>('services');
  const [selectedService, setSelectedService] = useState<ClinicService | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<ClinicWorker | null>(workers[0] ?? null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [locking, setLocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goBack = useCallback(() => {
    setError(null);
    const idx = STEP_ORDER.indexOf(step);
    if (idx > 0) setStep(STEP_ORDER[idx - 1]);
  }, [step]);

  const handleServiceSelect = (service: ClinicService) => {
    setSelectedService(service);
    setSelectedWorker(workers[0] ?? null);
    setStep('date');
  };

  const handleDateSelect = async (date: string) => {
    setSelectedDate(date);
    setSelectedTime(null);
    setLoadingSlots(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        clinic_id: clinic.id,
        service_id: selectedService!.id,
        date,
      });
      if (selectedWorker?.id) params.set('worker_id', selectedWorker.id);
      const res = await fetch(`/api/availability?${params}`);
      const json = await res.json();
      setSlots(json.slots ?? []);
      setStep('time');
    } catch {
      setError('שגיאה בטעינת שעות');
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setStep('phone');
  };

  const handlePhoneSubmit = async (phoneNumber: string) => {
    setPhone(phoneNumber);
    setLocking(true);
    setError(null);
    try {
      const res = await fetch('/api/book/lock-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinic_id: clinic.id,
          service_id: selectedService!.id,
          worker_id: selectedWorker?.id ?? null,
          date: selectedDate,
          time: selectedTime,
          phone: phoneNumber,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'שגיאה בנעילת התור');
        return;
      }
      setAppointmentId(json.appointment_id);
      setStep('otp');
    } catch {
      setError('שגיאה בחיבור לשרת');
    } finally {
      setLocking(false);
    }
  };

  const handleOtpVerify = async (code: string) => {
    setError(null);
    try {
      const res = await fetch('/api/book/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointment_id: appointmentId, phone, code }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'קוד שגוי');
        return;
      }
      setConfirmedAppointment(json.appointment);
      setStep('success');
    } catch {
      setError('שגיאה בחיבור לשרת');
    }
  };

  if (!isOpen) return null;

  const stepIndex = STEP_ORDER.indexOf(step);
  const progress = step === 'success' ? 100 : (stepIndex / (STEP_ORDER.length - 1)) * 100;

  return (
    <motion.div
      ref={panelRef}
      initial={false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-neutral-50"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label="הזמנת תור"
    >
      {/* Header */}
      <div className="flex-shrink-0 border-b border-neutral-200/80 bg-white/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={step === 'success' ? onClose : goBack}
            className="p-2 -m-2 rounded-full hover:bg-neutral-100 transition-colors"
            aria-label="חזרה"
          >
            <X className="h-5 w-5 text-neutral-600" />
          </button>
          <span className="text-sm font-medium text-neutral-500">Clica</span>
          <div className="w-9" />
        </div>
        <div className="h-0.5 bg-neutral-100">
          <motion.div
            className="h-full bg-neutral-900"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-4 mt-4 px-4 py-3 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-sm"
            >
              {error}
            </motion.div>
          )}

          {step === 'services' && (
            <motion.div
              key="services"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25 }}
              className="px-4 pt-6 pb-8"
            >
              <ServiceList
                services={services}
                onSelect={handleServiceSelect}
                selectedId={selectedService?.id}
              />
            </motion.div>
          )}

          {step === 'date' && selectedService && (
            <motion.div
              key="date"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25 }}
              className="px-4 pt-6 pb-8"
            >
              <DateSelector
                workingHours={workingHours}
                workerId={selectedWorker?.id ?? null}
                onSelect={handleDateSelect}
                selectedDate={selectedDate}
                loading={loadingSlots}
              />
            </motion.div>
          )}

          {step === 'time' && selectedDate && (
            <motion.div
              key="time"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25 }}
            >
              <TimeGrid
                slots={slots}
                onSelect={handleTimeSelect}
                selectedTime={selectedTime}
                date={selectedDate}
              />
            </motion.div>
          )}

          {step === 'phone' && (
            <motion.div
              key="phone"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25 }}
              className="px-4 pt-8 pb-8"
            >
              <p className="text-sm text-neutral-500 mb-4">הזן מספר טלפון לאישור התור</p>
              <PhoneInput
                onSubmit={handlePhoneSubmit}
                loading={locking}
              />
            </motion.div>
          )}

          {step === 'otp' && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25 }}
              className="px-4 pt-8 pb-8"
            >
              <OtpVerification
                phone={phone}
                onVerify={handleOtpVerify}
                onResend={() => {}}
              />
            </motion.div>
          )}

          {step === 'success' && confirmedAppointment && selectedService && (
            <motion.div
              key="success"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-4 pt-8 pb-8"
            >
              <SuccessScreen
                appointment={confirmedAppointment}
                service={selectedService}
                worker={selectedWorker ?? null}
                clinic={clinic}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
