'use client';

import { useEffect, useState } from 'react';
import { BotMessageSquare, CheckCircle2, AlertCircle, RefreshCw, Webhook, Activity, ExternalLink } from 'lucide-react';

type DiscordStatus = {
  configured: boolean;
  lastChecked: string;
};

export function IntegrationsTab() {
  const [discord, setDiscord] = useState<DiscordStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [reconnecting, setReconnecting] = useState(false);

  async function fetchStatus() {
    setLoading(true);
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDiscord({
        configured: !!data._discord_configured,
        lastChecked: new Date().toLocaleTimeString('en-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      });
    } catch {
      setDiscord({ configured: false, lastChecked: '—' });
    } finally {
      setLoading(false);
    }
  }

  async function handleReconnect() {
    setReconnecting(true);
    await fetchStatus();
    setReconnecting(false);
  }

  useEffect(() => { fetchStatus(); }, []);

  const connected = discord?.configured ?? false;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
        <div className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-700/60 px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#5865F2] text-white">
              <BotMessageSquare className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Discord integration</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">AI receptionist deployed on your Discord server.</p>
            </div>
          </div>
          {!loading && (
            <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${connected ? 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-400'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              {connected ? 'Connected' : 'Disconnected'}
            </div>
          )}
        </div>

        <div className="px-5 py-5 space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Checking connection…
            </div>
          ) : (
            <>
              {/* Status cards */}
              <div className="grid gap-3 sm:grid-cols-3">
                <div className={`rounded-xl border px-4 py-3 ${connected ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/30' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    {connected ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <AlertCircle className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />}
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Bot token</span>
                  </div>
                  <p className={`text-sm font-semibold ${connected ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                    {connected ? 'Configured' : 'Missing'}
                  </p>
                </div>

                <div className={`rounded-xl border px-4 py-3 ${connected ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/30' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Webhook className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Webhook</span>
                  </div>
                  <p className={`text-sm font-semibold ${connected ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                    {connected ? 'Active' : 'Inactive'}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 px-4 py-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Activity className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Last checked</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{discord?.lastChecked ?? '—'}</p>
                </div>
              </div>

              {/* Help text */}
              {connected ? (
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Webhook active
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/60 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-400">
                    Lead notifications on
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                    Deployed on Railway
                  </span>
                </div>
              ) : (
                <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/20 px-4 py-3">
                  <p className="text-sm text-amber-800 dark:text-amber-400">
                    Set <code className="font-mono text-xs bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded">DISCORD_BOT_TOKEN</code> in your environment, then map your Discord server to this clinic in the Super Admin panel (Discord section).
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleReconnect}
                  disabled={reconnecting}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700/50 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-1 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${reconnecting ? 'animate-spin' : ''}`} />
                  {reconnecting ? 'Checking…' : 'Refresh status'}
                </button>
                <a
                  href="https://discord.com/developers/applications"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700/50 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Discord Developer Portal
                </a>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Future integrations placeholder */}
      <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-800/40 px-5 py-8 text-center">
        <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">More integrations coming soon</p>
        <p className="mt-1 text-xs text-slate-300 dark:text-slate-600">WhatsApp, SMS, Email, Google Calendar…</p>
      </div>
    </div>
  );
}
