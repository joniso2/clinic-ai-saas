'use client';

import { useState, useCallback, lazy, Suspense } from 'react';
import { ChevronRight } from 'lucide-react';
import { HeroSection } from '@/components/booking/HeroSection';
import { ServiceList } from '@/components/booking/ServiceList';
import { WorkerSelector } from '@/components/booking/WorkerSelector';
import { DateSelector } from '@/components/booking/DateSelector';
import { TimeGrid } from '@/components/booking/TimeGrid';
import { PhoneInput } from '@/components/booking/PhoneInput';
import { OtpVerification } from '@/components/booking/OtpVerification';
import { SuccessScreen } from '@/components/booking/SuccessScreen';
import { BottomDashboardNav, type DashboardTab } from '@/components/booking/BottomDashboardNav';
import type {
  ClinicPageData,
  ClinicService,
  ClinicWorker,
  Appointment,
  BookingStep,
} from '@/types/booking';

const GalleryView = lazy(() =>
  import('@/components/booking/GalleryView').then((m) => ({ default: m.GalleryView }))
);
const ProductsView = lazy(() =>
  import('@/components/booking/ProductsView').then((m) => ({ default: m.ProductsView }))
);
const TeamView = lazy(() =>
  import('@/components/booking/TeamView').then((m) => ({ default: m.TeamView }))
);

interface Props {
  data: ClinicPageData;
}

const STEP_TITLES: Record<BookingStep, string> = {
  services: 'בחר שירות',
  worker: 'בחר מטפל',
  date: 'בחר תאריך',
  time: 'בחר שעה',
  phone: 'מספר טלפון',
  otp: 'אימות קוד',
  success: 'הזמנה אושרה',
};

function buildStepFlow(hasMultipleWorkers: boolean): BookingStep[] {
  const flow: BookingStep[] = ['services'];
  if (hasMultipleWorkers) flow.push('worker');
  flow.push('date', 'time', 'phone', 'otp', 'success');
  return flow;
}

function progressPercent(step: BookingStep, flow: BookingStep[]): number {
  const idx = flow.indexOf(step);
  if (idx <= 0) return 0;
  return Math.round((idx / (flow.length - 2)) * 100);
}

export function BookingFlow({ data }: Props) {
  const { clinic, services, workers, workingHours, gallery, products } = data;
  const hasMultipleWorkers = workers.length > 1;
  const stepFlow = buildStepFlow(hasMultipleWorkers);

  const [activeTab, setActiveTab] = useState<DashboardTab>('booking');
  const [step, setStep] = useState<BookingStep>('services');
  const [selectedService, setSelectedService] = useState<ClinicService | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<ClinicWorker | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [locking, setLocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goBack = useCallback(() => {
    setError(null);
    const idx = stepFlow.indexOf(step);
    if (idx > 0) setStep(stepFlow[idx - 1]);
  }, [step, stepFlow]);

  const handleServiceSelect = (service: ClinicService) => {
    setSelectedService(service);
    setError(null);
    if (hasMultipleWorkers) {
      setStep('worker');
    } else {
      setSelectedWorker(workers[0] ?? null);
      setStep('date');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleWorkerSelect = (worker: ClinicWorker) => {
    setSelectedWorker(worker);
    setError(null);
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
      setAvailableSlots(json.slots ?? []);
      setStep('time');
    } catch {
      setError('שגיאה בטעינת שעות פנויות');
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setError(null);
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

  const isHeroStep = step === 'services';
  const isSuccessStep = step === 'success';
  const pct = progressPercent(step, stepFlow);

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {activeTab === 'booking' && (
        <>
          {isHeroStep && <HeroSection clinic={clinic} />}

          {!isHeroStep && !isSuccessStep && (
            <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100">
              <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-2">
                <button
                  onClick={goBack}
                  className="p-2 -mr-1 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation"
                  aria-label="חזרה"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 truncate">{clinic.name}</p>
                  <h2 className="font-semibold text-gray-800 text-sm leading-tight">
                    {STEP_TITLES[step]}
                  </h2>
                </div>
              </div>
              <div className="h-0.5 bg-gray-100">
                <div
                  className="h-full bg-indigo-500 transition-all duration-500 ease-out"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}

          <div className="max-w-md mx-auto pb-24 px-4">
            {error && (
              <div className="mx-0 mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm leading-relaxed">
                {error}
              </div>
            )}

            {step === 'services' && (
              <div key="services" className="animate-booking-fade-in">
                <ServiceList
                  services={services}
                  onSelect={handleServiceSelect}
                  selectedId={selectedService?.id}
                />
              </div>
            )}

            {step === 'worker' && (
              <div key="worker" className="animate-booking-fade-in">
                <WorkerSelector
                  workers={workers}
                  onSelect={handleWorkerSelect}
                  selectedId={selectedWorker?.id}
                />
              </div>
            )}

            {step === 'date' && (
              <div key="date" className="animate-booking-fade-in">
                <DateSelector
                  workingHours={workingHours}
                  workerId={selectedWorker?.id ?? null}
                  onSelect={handleDateSelect}
                  selectedDate={selectedDate}
                  loading={loadingSlots}
                />
              </div>
            )}

            {step === 'time' && (
              <div key="time" className="animate-booking-fade-in">
                <TimeGrid
                  slots={availableSlots}
                  onSelect={handleTimeSelect}
                  selectedTime={selectedTime}
                  date={selectedDate!}
                />
              </div>
            )}

            {step === 'phone' && (
              <div key="phone" className="animate-booking-fade-in">
                <PhoneInput onSubmit={handlePhoneSubmit} loading={locking} />
              </div>
            )}

            {step === 'otp' && (
              <div key="otp" className="animate-booking-fade-in">
                <OtpVerification
                  phone={phone}
                  onVerify={handleOtpVerify}
                  onResend={() => handlePhoneSubmit(phone)}
                />
              </div>
            )}

            {step === 'success' && confirmedAppointment && (
              <div key="success" className="animate-booking-fade-in">
                <SuccessScreen
                  appointment={confirmedAppointment}
                  service={selectedService!}
                  worker={selectedWorker}
                  clinic={clinic}
                />
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'gallery' && (
        <div className="transition-opacity duration-200">
          <Suspense fallback={<div className="py-12 text-center text-gray-500 text-sm">טוען...</div>}>
            <GalleryView images={gallery} />
          </Suspense>
        </div>
      )}

      {activeTab === 'products' && (
        <div className="transition-opacity duration-200">
          <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100 max-w-md mx-auto">
            <div className="px-4 py-3">
              <p className="text-xs text-gray-400">{clinic.name}</p>
              <h2 className="font-semibold text-gray-800 text-sm">מוצרים</h2>
            </div>
          </div>
          <Suspense fallback={<div className="py-12 text-center text-gray-500 text-sm">טוען...</div>}>
            <ProductsView products={products} />
          </Suspense>
        </div>
      )}

      {activeTab === 'team' && (
        <div className="transition-opacity duration-200">
          <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100 max-w-md mx-auto">
            <div className="px-4 py-3">
              <p className="text-xs text-gray-400">{clinic.name}</p>
              <h2 className="font-semibold text-gray-800 text-sm">צוות</h2>
            </div>
          </div>
          <Suspense fallback={<div className="py-12 text-center text-gray-500 text-sm">טוען...</div>}>
            <TeamView clinic={clinic} />
          </Suspense>
        </div>
      )}

      <BottomDashboardNav activeTab={activeTab} onTabChange={setActiveTab} clinic={clinic} />
    </div>
  );
}
