'use client';

import { useState, useEffect } from 'react';
import { Video, Upload, Loader2, CheckCircle2 } from 'lucide-react';

interface PageData {
  clinic: {
    id: string;
    name: string | null;
    hero_image: string | null;
    hero_video: string | null;
    hero_3d_slot_image_url?: string | null;
    logo_url: string | null;
    slug: string;
    address?: string | null;
  };
}

export function AdminHeroMediaEditor() {
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [heroVideoUrl, setHeroVideoUrl] = useState('');
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [hero3DSlotImageUrl, setHero3DSlotImageUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/booking-page');
        if (!res.ok) throw new Error('Failed to load');
        const json = await res.json();
        setData(json);
        setHeroVideoUrl(json.clinic?.hero_video ?? '');
        setHeroImageUrl(json.clinic?.hero_image ?? '');
        setHero3DSlotImageUrl(json.clinic?.hero_3d_slot_image_url ?? '');
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setStatus('idle');
    try {
      const res = await fetch('/api/booking-page', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hero_video: heroVideoUrl.trim() || null,
          hero_image: heroImageUrl.trim() || null,
          hero_3d_slot_image_url: hero3DSlotImageUrl.trim() || null,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      setStatus('success');
      setData((prev) =>
        prev
          ? {
              ...prev,
              clinic: {
                ...prev.clinic,
                hero_video: heroVideoUrl.trim() || null,
                hero_image: heroImageUrl.trim() || null,
                hero_3d_slot_image_url: hero3DSlotImageUrl.trim() || null,
              },
            }
          : null
      );
      setTimeout(() => setStatus('idle'), 3000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    if (url && (url.endsWith('.mp4') || url.includes('video'))) setHeroVideoUrl(url);
    else if (url) setHeroImageUrl(url);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text');
    if (text.startsWith('http')) {
      if (text.includes('.mp4') || text.includes('video')) setHeroVideoUrl(text);
      else setHeroImageUrl(text);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
      <div className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-700/60 px-5 py-4 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
          <Video className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Landing hero media</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Video or image URL for your booking / Clica-style landing hero.</p>
        </div>
      </div>
      <div className="p-5 space-y-5">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            Hero video URL
          </label>
          <input
            type="url"
            value={heroVideoUrl}
            onChange={(e) => setHeroVideoUrl(e.target.value)}
            placeholder="https://…/video.mp4"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700/50 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-50 placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100 dark:focus:ring-amber-900/40"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            Hero image URL (fallback)
          </label>
          <input
            type="url"
            value={heroImageUrl}
            onChange={(e) => setHeroImageUrl(e.target.value)}
            placeholder="https://…/image.jpg"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700/50 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-50 placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100 dark:focus:ring-amber-900/40"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            תמונה בפינה (אופציונלי)
          </label>
          <input
            type="url"
            value={hero3DSlotImageUrl}
            onChange={(e) => setHero3DSlotImageUrl(e.target.value)}
            placeholder="https://…/logo-or-image.png"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700/50 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-50 placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100 dark:focus:ring-amber-900/40"
          />
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">קישור לתמונה או לוגו שיופיעו בפינה השמאלית של העמוד. להשאיר ריק = בלי תמונה בפינה.</p>
        </div>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onPaste={handlePaste}
          className={`rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors ${
            dragOver
              ? 'border-amber-400 bg-amber-50/50 dark:bg-amber-900/20'
              : 'border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-700/30'
          }`}
        >
          <Upload className="mx-auto h-8 w-8 text-slate-400 dark:text-slate-500" />
          <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-400">Paste URL here or drag a link</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Simulated upload: paste a direct .mp4 or image URL above</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 px-4 py-2.5 text-sm font-semibold text-white transition-colors flex items-center gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {saving ? 'Saving…' : 'Save hero media'}
          </button>
          {status === 'success' && <span className="text-sm text-emerald-600 dark:text-emerald-400">Saved</span>}
          {status === 'error' && <span className="text-sm text-red-600 dark:text-red-400">Save failed</span>}
        </div>
      </div>
    </div>
  );
}
