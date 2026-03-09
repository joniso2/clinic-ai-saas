'use client';

import { useState, useCallback } from 'react';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { CHANNEL_LABELS } from './integrations-types';

export function useToast() {
  const [toast, setToast] = useState<string | null>(null);
  const show = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); }, []);
  return { toast, show };
}

export function StatusIcon({ status }: { status: 'healthy' | 'warning' | 'critical' | 'coming_soon' }) {
  if (status === 'healthy') return <CheckCircle2 className="h-5 w-5 text-emerald-400" />;
  if (status === 'warning') return <AlertCircle className="h-5 w-5 text-amber-400" />;
  if (status === 'coming_soon') return <AlertCircle className="h-5 w-5 text-slate-500" />;
  return <XCircle className="h-5 w-5 text-red-400" />;
}

export function ConnectModal({
  type,
  providerOptions,
  config,
  setConfig,
  saving,
  onSave,
  onClose,
}: {
  type: string;
  providerOptions: string[];
  config: Record<string, string>;
  setConfig: (c: Record<string, string>) => void;
  saving: boolean;
  onSave: (provider: string, config: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const [provider, setProvider] = useState(providerOptions[0] ?? '');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div className="modal-enter rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl max-w-sm w-full p-6 text-right" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-bold text-slate-100 mb-4">חבר {CHANNEL_LABELS[type] ?? type}</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">ספק</label>
            <select value={provider} onChange={(e) => setProvider(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100">
              {providerOptions.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          {(type === 'whatsapp' || type === 'sms') && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">מס׳ טלפון</label>
              <input type="text" value={config.phone_number ?? ''} onChange={(e) => setConfig({ ...config, phone_number: e.target.value })} placeholder="+972..."
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100" />
            </div>
          )}
          {type === 'webhook' && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">כתובת Webhook</label>
              <input type="text" value={config.webhook_url ?? ''} onChange={(e) => setConfig({ ...config, webhook_url: e.target.value })} placeholder="https://..."
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100" />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">API Key (אופציונלי)</label>
            <input type="password" value={config.api_key ?? ''} onChange={(e) => setConfig({ ...config, api_key: e.target.value })} placeholder="••••••••"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100" />
          </div>
        </div>
        <div className="flex gap-2 mt-5 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-sm">ביטול</button>
          <button type="button" onClick={() => onSave(provider, config)} disabled={saving} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50">{saving ? 'שומר…' : 'חבר'}</button>
        </div>
      </div>
    </div>
  );
}
