'use client';

import { useState } from 'react';
import {
  Building2,
  Clock,
  BotMessageSquare,
  CheckCircle2,
  AlertCircle,
  Save,
  ChevronDown,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────

type WorkingHours = {
  open: string;
  close: string;
  enabled: boolean;
};

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DEFAULT_HOURS: WorkingHours[] = [
  { open: '08:00', close: '16:00', enabled: false }, // Sun
  { open: '08:00', close: '16:00', enabled: true },  // Mon
  { open: '08:00', close: '16:00', enabled: true },  // Tue
  { open: '08:00', close: '16:00', enabled: true },  // Wed
  { open: '08:00', close: '16:00', enabled: true },  // Thu
  { open: '08:00', close: '14:00', enabled: true },  // Fri
  { open: '08:00', close: '16:00', enabled: false }, // Sat
];

const DURATION_OPTIONS = [15, 20, 30, 45, 60, 90];

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 card-shadow overflow-hidden">
      <div className="border-b border-slate-100 dark:border-zinc-700 bg-slate-50/60 dark:bg-zinc-700/60 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">{title}</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">{description}</p>
          </div>
        </div>
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  );
}

// ─── Main SettingsTab ──────────────────────────────────────────────────────────

export function SettingsTab({
  clinicName,
  userEmail,
}: {
  clinicName: string | null;
  userEmail: string | null;
}) {
  const [hours, setHours] = useState<WorkingHours[]>(DEFAULT_HOURS);
  const [duration, setDuration] = useState(30);
  const [saved, setSaved] = useState(false);

  // Discord connection: derive status from env presence (client-side heuristic)
  const discordConnected = true; // In a real app, fetch from API

  function updateHour(idx: number, field: keyof WorkingHours, value: string | boolean) {
    setHours((prev) =>
      prev.map((h, i) => (i === idx ? { ...h, [field]: value } : h))
    );
    setSaved(false);
  }

  function handleSave() {
    // In a real app, persist to DB
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-6">
      {/* Clinic profile */}
      <SectionCard
        title="Clinic profile"
        description="Basic information about the clinic linked to this account."
        icon={Building2}
      >
        <dl className="grid gap-5 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-100 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-700/50 px-4 py-3">
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Clinic name</dt>
            <dd className="mt-1.5 text-sm font-medium text-slate-900 dark:text-zinc-100">{clinicName ?? 'Not set'}</dd>
          </div>
          <div className="rounded-xl border border-slate-100 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-700/50 px-4 py-3">
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Account email</dt>
            <dd className="mt-1.5 text-sm font-medium text-slate-900 dark:text-zinc-100">{userEmail ?? 'Not available'}</dd>
          </div>
        </dl>
      </SectionCard>

      {/* Working hours */}
      <SectionCard
        title="Working hours"
        description="Set the days and hours your clinic accepts appointments."
        icon={Clock}
      >
        <div className="space-y-3">
          {DAY_LABELS.map((day, i) => (
            <div
              key={day}
              className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                hours[i].enabled
                  ? 'border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-700/50'
                  : 'border-slate-100 dark:border-zinc-700/60 bg-slate-50/60 dark:bg-zinc-700/20'
              }`}
            >
              {/* Toggle */}
              <button
                type="button"
                onClick={() => updateHour(i, 'enabled', !hours[i].enabled)}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-1 ${
                  hours[i].enabled ? 'bg-slate-900 dark:bg-zinc-100' : 'bg-slate-200 dark:bg-zinc-600'
                }`}
                aria-pressed={hours[i].enabled}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 rounded-full bg-white dark:bg-zinc-900 shadow transition-transform ${
                    hours[i].enabled ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>

              {/* Day label */}
              <span className={`w-24 text-sm font-medium ${hours[i].enabled ? 'text-slate-900 dark:text-zinc-100' : 'text-slate-400 dark:text-zinc-500'}`}>
                {day}
              </span>

              {/* Time inputs */}
              {hours[i].enabled ? (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={hours[i].open}
                    onChange={(e) => updateHour(i, 'open', e.target.value)}
                    className="rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-700/50 px-2.5 py-1.5 text-sm text-slate-900 dark:text-zinc-100 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                  />
                  <span className="text-xs text-slate-400 dark:text-zinc-500">to</span>
                  <input
                    type="time"
                    value={hours[i].close}
                    onChange={(e) => updateHour(i, 'close', e.target.value)}
                    className="rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-700/50 px-2.5 py-1.5 text-sm text-slate-900 dark:text-zinc-100 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                  />
                </div>
              ) : (
                <span className="text-xs text-slate-400 dark:text-zinc-500 italic">Closed</span>
              )}
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Appointment duration */}
      <SectionCard
        title="Appointment duration"
        description="Default slot length used when scheduling new appointments."
        icon={ChevronDown}
      >
        <div className="flex flex-wrap gap-2">
          {DURATION_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => { setDuration(d); setSaved(false); }}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-1 ${
                duration === d
                  ? 'border-slate-900 dark:border-zinc-100 bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm'
                  : 'border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-600 hover:bg-slate-50 dark:hover:bg-zinc-700'
              }`}
            >
              {d} min
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-zinc-400">
          Currently set to <span className="font-semibold text-slate-900 dark:text-zinc-100">{duration} minutes</span> per appointment.
        </p>
      </SectionCard>

      {/* Discord integration */}
      <SectionCard
        title="Discord integration"
        description="Status of your clinic's Discord bot connection."
        icon={BotMessageSquare}
      >
        <div className="flex items-start gap-4">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              discordConnected ? 'bg-emerald-100 dark:bg-emerald-950/50' : 'bg-red-100 dark:bg-red-950/50'
            }`}
          >
            {discordConnected ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400" />
            )}
          </div>
          <div>
            <p className={`text-sm font-semibold ${discordConnected ? 'text-emerald-800 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
              {discordConnected ? 'Connected' : 'Not connected'}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
              {discordConnected
                ? 'Your Discord bot is active and receiving lead notifications.'
                : 'Configure DISCORD_BOT_TOKEN in your environment to enable notifications.'}
            </p>
            {discordConnected && (
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Webhook active
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/60 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-400">
                  Lead notifications on
                </span>
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      {/* Save button */}
      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            Settings saved
          </span>
        )}
        <button
          type="button"
          onClick={handleSave}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-zinc-100 px-5 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 shadow-sm hover:bg-slate-800 dark:hover:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 transition-colors"
        >
          <Save className="h-4 w-4" />
          Save settings
        </button>
      </div>
    </div>
  );
}
