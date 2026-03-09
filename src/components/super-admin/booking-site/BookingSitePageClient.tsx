'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { loadBookingSiteServices } from '@/app/dashboard/super-admin/booking-site/actions';
import {
  Globe,
  ChevronRight,
  Search,
  Image as ImageIcon,
  Layout,
  Images,
  Package,
  ShoppingBag,
  Eye,
  Loader2,
  Plus,
  GripVertical,
  Trash2,
  Pencil,
  Upload,
  Video,
} from 'lucide-react';

type Clinic = { id: string; name: string | null; slug: string | null; logo_url?: string | null };
type PageData = { clinic: { id: string; name: string; address: string | null; hero_image: string | null; hero_video: string | null; logo_url: string | null; slug: string }; gallery: Array<{ id: string; image_url: string; sort_order: number }> };
type Section = { id: string; section_type: string; position: number; is_enabled: boolean; settings_json: unknown };
type MediaItem = { id: string; url: string; type: string; filename: string | null; created_at: string };
type Service = { id: string; service_name: string; price: number; duration_minutes: number; description?: string | null; is_active: boolean };
type Product = { id: string; name: string; price: number | null; image_url: string | null; description: string | null };

const SECTION_LABELS: Record<string, string> = { hero: 'Hero', gallery: 'גלריה', services: 'שירותים', products: 'מוצרים', contact: 'צור קשר' };
const COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500', 'bg-rose-500'];

type ServicesByClinic = Record<string, Service[]>;
type InitialServicesList = { clinicId: string; services: Service[] }[];

function useClinicId() {
  const [clinicId, setClinicId] = useState<string | null>(null);
  return [clinicId, setClinicId] as const;
}

function getServicesForClinic(clinicId: string, byClinic: ServicesByClinic, list: InitialServicesList): Service[] {
  const fromList = list.find((x) => x.clinicId === clinicId)?.services;
  if (fromList && fromList.length > 0) return fromList;
  return byClinic[clinicId] ?? [];
}

export function BookingSitePageClient({
  initialServicesByClinic = {},
  initialServicesList = [],
  initialServicesMeta = { clinicCount: 0, totalServices: 0, error: null },
}: {
  initialServicesByClinic?: ServicesByClinic;
  initialServicesList?: InitialServicesList;
  initialServicesMeta?: { clinicCount: number; totalServices: number; error?: string | null };
}) {
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [search, setSearch] = useState('');
  const [loadingClinics, setLoadingClinics] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetch('/api/super-admin/clinics', { credentials: 'include' })
      .then((r) => r.json())
      .then((d: { clinics?: Clinic[] }) => setClinics(d.clinics ?? []))
      .catch(() => setClinics([]))
      .finally(() => setLoadingClinics(false));
  }, []);

  const loadData = useCallback(async (cid: string) => {
    setLoadingData(true);
    const opts = { credentials: 'include' as RequestCredentials, cache: 'no-store' as RequestCache };
    try {
      const [pageRes, sectionsRes, mediaRes, productsRes, servicesRes, servicesResult] = await Promise.all([
        fetch(`/api/super-admin/booking-site/page?clinic_id=${encodeURIComponent(cid)}`, opts),
        fetch(`/api/super-admin/booking-site/sections?clinic_id=${encodeURIComponent(cid)}`, opts),
        fetch(`/api/super-admin/booking-site/media?clinic_id=${encodeURIComponent(cid)}`, opts),
        fetch(`/api/super-admin/booking-site/products?clinic_id=${encodeURIComponent(cid)}`, opts),
        fetch(`/api/super-admin/booking-site/services?clinic_id=${encodeURIComponent(cid)}`, opts),
        loadBookingSiteServices(cid),
      ]);
      const [pageJson, sectionsJson, mediaJson, productsJson, servicesJson] = await Promise.all([
        pageRes.json(),
        sectionsRes.json(),
        mediaRes.json(),
        productsRes.json(),
        servicesRes.json().catch(() => ({ services: [] })),
      ]);
      setPageData(pageRes.ok && pageJson.clinic ? { clinic: pageJson.clinic, gallery: pageJson.gallery ?? [] } : null);
      setSections(sectionsRes.ok ? (sectionsJson.sections ?? []) : []);
      setMedia(mediaRes.ok ? (mediaJson.media ?? []) : []);
      const fromApi = servicesResult.ok ? servicesResult.services : (servicesRes.ok && Array.isArray(servicesJson?.services) ? servicesJson.services : null);
      setServices(fromApi ?? getServicesForClinic(cid, initialServicesByClinic, initialServicesList));
      setProducts(productsRes.ok ? (productsJson.products ?? []) : []);
    } catch {
      setPageData(null);
      setSections([]);
      setMedia([]);
      setServices(getServicesForClinic(cid, initialServicesByClinic, initialServicesList));
      setProducts([]);
    } finally {
      setLoadingData(false);
    }
  }, [initialServicesByClinic, initialServicesList]);

  useEffect(() => {
    if (clinicId) {
      setServices(getServicesForClinic(clinicId, initialServicesByClinic, initialServicesList));
      loadData(clinicId);
    } else {
      setPageData(null);
      setSections([]);
      setMedia([]);
      setServices([]);
      setProducts([]);
    }
  }, [clinicId, loadData, initialServicesByClinic, initialServicesList]);

  const filteredClinics = search.trim()
    ? clinics.filter((c) => (c.name ?? '').toLowerCase().includes(search.toLowerCase()) || (c.slug ?? '').toLowerCase().includes(search.toLowerCase()))
    : clinics;

  const selectedClinic = clinics.find((c) => c.id === clinicId);
  const previewSlug = selectedClinic?.slug ?? pageData?.clinic?.slug ?? clinicId ?? '';
  const previewUrl = typeof window !== 'undefined' && previewSlug ? `${window.location.origin}/book/${previewSlug}` : '';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/dashboard/super-admin"
          className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-sm font-medium flex items-center gap-1"
        >
          <ChevronRight className="h-4 w-4" />
          חזרה למנהל מערכת
        </Link>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
          <Globe className="h-6 w-6" />
          אתר טלפוני
        </h1>
      </div>

      {/* Clinic Selector */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-3">בחירת קליניקה</h2>
        {initialServicesMeta.totalServices === 0 && (
          <div className="text-xs text-amber-600 dark:text-amber-400 mb-2 space-y-1">
            <p>לא נטענו שירותים מהשרת. ודא שבטבלת clinic_services יש שורות (למשל עבור קליניקת LULU).</p>
            {initialServicesMeta.error && (
              <p className="font-mono text-red-500 dark:text-red-400 break-all">שגיאת Supabase: {initialServicesMeta.error}</p>
            )}
          </div>
        )}
        <div className="relative mb-3">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="חיפוש קליניקה..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-950 pl-4 pr-10 py-2 text-sm text-right placeholder:text-slate-400"
          />
        </div>
        {loadingClinics ? (
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 w-40 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="flex gap-2 flex-wrap">
            {filteredClinics.map((c, i) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setClinicId(c.id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 border text-right transition-all ${
                  clinicId === c.id
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-200'
                    : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${COLORS[i % COLORS.length]}`} />
                {c.logo_url ? (
                  <img src={c.logo_url} alt="" className="h-7 w-7 rounded-lg object-cover shrink-0" />
                ) : null}
                <span className="text-sm font-medium text-slate-900 dark:text-slate-50 truncate max-w-[140px]">{c.name || c.id}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {!clinicId && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center text-slate-500 dark:text-slate-400">
          בחר קליניקה כדי לנהל את עמוד ההזמנה שלה.
        </div>
      )}

      {clinicId && loadingData && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
          <span className="text-slate-600 dark:text-slate-300">טוען...</span>
        </div>
      )}

      {clinicId && !loadingData && (
        <div className="grid gap-6">
          {/* 1. Media Library */}
          <MediaLibraryCard clinicId={clinicId} media={media} setMedia={setMedia} />

          {/* 2. Hero Video */}
          <HeroVideoCard
            clinicId={clinicId}
            heroVideo={pageData?.clinic?.hero_video ?? null}
            onSaved={loadData}
          />

          {/* 3. Page Builder */}
          <PageBuilderCard clinicId={clinicId} sections={sections} setSections={setSections} />

          {/* 4. Gallery */}
          <GalleryCard clinicId={clinicId} gallery={pageData?.gallery ?? []} pageData={pageData} setPageData={setPageData} media={media} />

          {/* 5. Services */}
          <ServicesCard
            clinicId={clinicId}
            services={services}
            setServices={setServices}
            editingService={editingService}
            setEditingService={setEditingService}
            serviceModalOpen={serviceModalOpen}
            setServiceModalOpen={setServiceModalOpen}
          />

          {/* 6. Products */}
          <ProductsCard
            clinicId={clinicId}
            products={products}
            setProducts={setProducts}
            editingProduct={editingProduct}
            setEditingProduct={setEditingProduct}
            productModalOpen={productModalOpen}
            setProductModalOpen={setProductModalOpen}
            media={media}
          />

          {/* 7. Preview */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50 p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
              <Eye className="h-4 w-4" />
              תצוגה מקדימה
            </h2>
            <div className="p-4">
              {previewUrl ? (
                <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:underline mb-2 inline-block">
                  פתח בעמוד חדש
                </a>
              ) : null}
              <div className="rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-950 overflow-hidden aspect-[9/16] max-h-[560px]">
                {previewUrl ? (
                  <iframe src={previewUrl} title="תצוגה מקדימה" className="w-full h-full scale-[0.4] origin-top-right" style={{ width: '250%', height: '250%' }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">אין תצוגה מקדימה</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const HERO_VIDEO_ACCEPT = 'video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov';
const HERO_VIDEO_MAX_MB = 50;
const HERO_VIDEO_MAX_BYTES = HERO_VIDEO_MAX_MB * 1024 * 1024;

function HeroVideoCard({
  clinicId,
  heroVideo,
  onSaved,
}: {
  clinicId: string;
  heroVideo: string | null;
  onSaved: (cid: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const validate = (f: File): string | null => {
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (!['mp4', 'webm', 'mov'].includes(ext ?? '')) return 'נא להעלות קובץ וידאו (MP4, WebM או MOV)';
    if (f.size > HERO_VIDEO_MAX_BYTES) return `גודל מקסימלי: ${HERO_VIDEO_MAX_MB}MB`;
    return null;
  };

  const save = async () => {
    if (!file) return;
    const err = validate(file);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const fd = new FormData();
      fd.set('file', file);
      fd.set('clinic_id', clinicId);
      const uploadRes = await fetch('/api/super-admin/booking-site/upload', { method: 'POST', body: fd, credentials: 'include' });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok || !uploadJson.url) {
        setError(uploadJson?.error ?? 'ההעלאה נכשלה');
        return;
      }
      const putRes = await fetch(`/api/super-admin/booking-site/page?clinic_id=${clinicId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hero_video: uploadJson.url }),
        credentials: 'include',
      });
      if (!putRes.ok) {
        const j = await putRes.json();
        setError(j?.error ?? 'שמירה נכשלה');
        return;
      }
      setFile(null);
      onSaved(clinicId);
    } finally {
      setSaving(false);
    }
  };

  const clear = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/super-admin/booking-site/page?clinic_id=${clinicId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hero_video: null }),
        credentials: 'include',
      });
      if (!res.ok) {
        const j = await res.json();
        setError(j?.error ?? 'הסרה נכשלה');
        return;
      }
      onSaved(clinicId);
    } finally {
      setSaving(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    setFile(f);
    setError(validate(f));
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setError(validate(f));
    e.target.value = '';
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50 p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
        <Video className="h-4 w-4 text-indigo-500" />
        וידאו רקע לדף הבית (Hero)
      </h2>
      <div className="p-5 space-y-5">
        {heroVideo && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">תצוגה מקדימה</p>
            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-600 bg-neutral-900 aspect-video max-h-44 shadow-inner">
              <video src={heroVideo} controls className="w-full h-full object-contain" playsInline />
            </div>
            <button type="button" onClick={clear} disabled={saving} className="mt-3 text-sm font-medium text-red-600 dark:text-red-400 hover:underline disabled:opacity-50">
              הסר וידאו
            </button>
          </div>
        )}
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">העלאת וידאו חדש</p>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200 ${dragOver ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-900/25' : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'}`}
          >
            <input
              type="file"
              accept={HERO_VIDEO_ACCEPT}
              onChange={onFileSelect}
              className="hidden"
              id="hero-video-upload"
            />
            <label htmlFor="hero-video-upload" className="cursor-pointer block">
              <Upload className="h-10 w-10 mx-auto text-slate-400 dark:text-slate-500 mb-3" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">גרור קובץ לכאן או לחץ לבחירה</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">MP4, WebM או MOV — עד {HERO_VIDEO_MAX_MB}MB</p>
            </label>
          </div>
        </div>
        {file && (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-700 px-4 py-3">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{file.name}</span>
            <div className="flex gap-2 shrink-0">
              <button type="button" onClick={() => setFile(null)} className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">ביטול</button>
              <button type="button" onClick={save} disabled={saving || !!error} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 disabled:opacity-50 shadow-sm">
                {saving ? 'שומר...' : 'שמור'}
              </button>
            </div>
          </div>
        )}
        {error && <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </div>
  );
}

function MediaLibraryCard({
  clinicId,
  media,
  setMedia,
}: {
  clinicId: string;
  media: MediaItem[];
  setMedia: React.Dispatch<React.SetStateAction<MediaItem[]>>;
}) {
  const [uploading, setUploading] = useState(false);
  const [searchMedia, setSearchMedia] = useState('');

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith('video/') || ['mp4', 'webm', 'mov'].includes(file.name.split('.').pop()?.toLowerCase() ?? '');
    setUploading(true);
    const fd = new FormData();
    fd.set('file', file);
    fd.set('clinic_id', clinicId);
    try {
      const res = await fetch('/api/super-admin/booking-site/upload', { method: 'POST', body: fd, credentials: 'include' });
      const j = await res.json();
      if (j.url) setMedia((prev) => [{ id: j.id ?? '', url: j.url, type: isVideo ? 'video' : 'image', filename: file.name, created_at: new Date().toISOString() }, ...prev]);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const remove = async (id: string) => {
    await fetch(`/api/super-admin/booking-site/media/${id}`, { method: 'DELETE' });
    setMedia((prev) => prev.filter((m) => m.id !== id));
  };

  const filtered = searchMedia.trim() ? media.filter((m) => (m.filename ?? m.url).toLowerCase().includes(searchMedia.toLowerCase())) : media;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50 p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
        <ImageIcon className="h-4 w-4" />
        ספריית מדיה
      </h2>
      <div className="p-4">
        <div className="flex flex-wrap gap-2 mb-3">
          <label className="cursor-pointer inline-flex items-center gap-2 rounded-xl px-3 py-2 bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500">
            <Upload className="h-4 w-4" />
            {uploading ? 'מעלה...' : 'העלה תמונה או סרטון'}
            <input type="file" accept="image/*,video/*,video/mp4,video/webm,video/quicktime" className="hidden" onChange={upload} disabled={uploading} />
          </label>
          <input
            type="text"
            placeholder="חיפוש מדיה..."
            value={searchMedia}
            onChange={(e) => setSearchMedia(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm w-40"
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {filtered.map((m) => (
            <div key={m.id} className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-600 aspect-square bg-slate-100 dark:bg-slate-950">
              {m.type === 'video' ? (
                <video src={m.url} className="w-full h-full object-cover" muted playsInline />
              ) : (
                <img src={m.url} alt="" className="w-full h-full object-cover" />
              )}
              <button type="button" onClick={() => remove(m.id)} className="absolute top-1 left-1 p-1.5 rounded-lg bg-red-500/90 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PageBuilderCard({
  clinicId,
  sections,
  setSections,
}: {
  clinicId: string;
  sections: Section[];
  setSections: React.Dispatch<React.SetStateAction<Section[]>>;
}) {
  const [dragged, setDragged] = useState<string | null>(null);

  const toggle = async (id: string, is_enabled: boolean) => {
    const s = sections.find((x) => x.id === id);
    if (!s) return;
    const updated = sections.map((x) => (x.id === id ? { ...x, is_enabled } : x));
    setSections(updated);
    await fetch(`/api/super-admin/booking-site/sections?clinic_id=${clinicId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sections: updated.map((x) => ({ id: x.id, section_type: x.section_type, position: x.position, is_enabled: x.is_enabled, settings_json: x.settings_json })) }),
    });
  };

  const sorted = [...sections].sort((a, b) => a.position - b.position);

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50 p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
        <Layout className="h-4 w-4" />
        Page Builder
      </h2>
      <div className="p-4">
        <div className="space-y-2">
          {sorted.map((s) => (
            <div
              key={s.id}
              draggable
              onDragStart={() => setDragged(s.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {}}
              className={`flex items-center gap-3 rounded-xl border p-3 ${dragged === s.id ? 'opacity-50' : ''} ${s.is_enabled ? 'border-slate-200 dark:border-slate-600' : 'border-slate-100 dark:border-slate-800 opacity-70'}`}
            >
              <GripVertical className="h-4 w-4 text-slate-400 shrink-0" />
              <span className="text-sm font-medium text-slate-900 dark:text-slate-50 flex-1">{SECTION_LABELS[s.section_type] ?? s.section_type}</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={s.is_enabled} onChange={(e) => toggle(s.id, e.target.checked)} className="rounded border-slate-300" />
                <span className="text-xs text-slate-500 dark:text-slate-400">מוצג</span>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GalleryCard({
  clinicId,
  gallery,
  pageData,
  setPageData,
  media,
}: {
  clinicId: string;
  gallery: PageData['gallery'];
  pageData: PageData | null;
  setPageData: React.Dispatch<React.SetStateAction<PageData | null>>;
  media: MediaItem[];
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addSelected = async () => {
    if (selectedIds.size === 0) return;
    setAddError(null);
    setAdding(true);
    const urls = media.filter((m) => selectedIds.has(m.id)).map((m) => m.url);
    const newItems: { id: string; image_url: string; sort_order: number }[] = [];
    let nextOrder = gallery.length;
    for (const url of urls) {
      const res = await fetch(`/api/super-admin/booking-site/gallery?clinic_id=${clinicId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: url, sort_order: nextOrder }),
      });
      const j = await res.json();
      if (!res.ok) {
        setAddError(j?.error ?? 'שגיאה בהוספה');
        setAdding(false);
        return;
      }
      if (j.id) {
        newItems.push({ id: j.id, image_url: j.image_url ?? url, sort_order: nextOrder });
        nextOrder++;
      }
    }
    setPageData((p) => (p ? { ...p, gallery: [...p.gallery, ...newItems] } : null));
    setSelectedIds(new Set());
    setAdding(false);
    setPickerOpen(false);
  };

  const remove = async (id: string) => {
    await fetch(`/api/super-admin/booking-site/gallery/${id}`, { method: 'DELETE' });
    setPageData((p) => (p ? { ...p, gallery: p.gallery.filter((g) => g.id !== id) } : null));
  };

  const allMedia = media;
  const isVideoUrl = (url: string) => /\.(mp4|webm|mov)(\?|$)/i.test(url);

  const openPicker = () => {
    setSelectedIds(new Set());
    setAddError(null);
    setPickerOpen(true);
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50 p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
        <Images className="h-4 w-4" />
        גלריה
      </h2>
      <div className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {gallery.map((g) => (
            <div key={g.id} className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-600 aspect-square">
              {isVideoUrl(g.image_url) ? (
                <video src={g.image_url} className="w-full h-full object-cover" muted playsInline />
              ) : (
                <img src={g.image_url} alt="" className="w-full h-full object-cover" />
              )}
              <button type="button" onClick={() => remove(g.id)} className="absolute top-1 left-1 p-1.5 rounded-lg bg-red-500/90 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <button type="button" onClick={openPicker} className="aspect-square rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-600">
            <Plus className="h-8 w-8" />
          </button>
        </div>
      </div>
      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !adding && setPickerOpen(false)}>
          <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 max-w-lg w-full max-h-[80vh] overflow-auto text-right" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-3">בחר תמונות או סרטונים מספריית המדיה</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">לחיצה על פריט תסמן אותו. בחר כמה שתרצה ולחץ &quot;הוסף לגלריה&quot;.</p>
            <div className="grid grid-cols-3 gap-2">
              {allMedia.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleSelected(m.id)}
                  disabled={adding}
                  className={`relative aspect-square rounded-xl overflow-hidden border-2 touch-manipulation ${selectedIds.has(m.id) ? 'border-indigo-500 ring-2 ring-indigo-500/50' : 'border-slate-200 dark:border-slate-600 hover:border-indigo-400'}`}
                >
                  {m.type === 'video' ? (
                    <video src={m.url} className="w-full h-full object-cover" muted playsInline />
                  ) : (
                    <img src={m.url} alt="" className="w-full h-full object-cover" />
                  )}
                  {selectedIds.has(m.id) && (
                    <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-bold">✓</span>
                  )}
                </button>
              ))}
            </div>
            {allMedia.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">אין מדיה. העלה תמונות או סרטונים בספריית המדיה.</p>}
            {addError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{addError}</p>}
            <div className="mt-4 flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={addSelected}
                disabled={adding || selectedIds.size === 0}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 disabled:opacity-50 disabled:pointer-events-none"
              >
                {adding ? 'מוסיף...' : `הוסף לגלריה (${selectedIds.size})`}
              </button>
              <button type="button" onClick={() => setPickerOpen(false)} disabled={adding} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium disabled:opacity-50">
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ServicesCard({
  clinicId,
  services,
  setServices,
  editingService,
  setEditingService,
  serviceModalOpen,
  setServiceModalOpen,
}: {
  clinicId: string;
  services: Service[];
  setServices: React.Dispatch<React.SetStateAction<Service[]>>;
  editingService: Service | null;
  setEditingService: (s: Service | null) => void;
  serviceModalOpen: boolean;
  setServiceModalOpen: (v: boolean) => void;
}) {
  const saveService = async (payload: { service_name: string; price: number; duration_minutes: number; description?: string | null }) => {
    if (editingService) {
      const res = await fetch(`/api/super-admin/booking-site/services/${editingService.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const j = await res.json();
      if (j.id) setServices((prev) => prev.map((s) => (s.id === j.id ? { ...s, service_name: j.service_name, price: j.price, duration_minutes: j.duration_minutes, description: j.description } : s)));
    } else {
      const res = await fetch(`/api/super-admin/booking-site/services?clinic_id=${clinicId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const j = await res.json();
      if (j.id) setServices((prev) => [...prev, { id: j.id, service_name: j.service_name, price: j.price, duration_minutes: j.duration_minutes, description: j.description ?? null, is_active: true }]);
    }
    setEditingService(null);
    setServiceModalOpen(false);
  };

  const del = async (id: string) => {
    await fetch(`/api/super-admin/booking-site/services/${id}`, { method: 'DELETE' });
    setServices((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50 p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
        <Package className="h-4 w-4" />
        שירותים / תמחור
      </h2>
      <div className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-600">
                <th className="py-2 px-2 font-semibold text-slate-700 dark:text-slate-300">שם</th>
                <th className="py-2 px-2 font-semibold text-slate-700 dark:text-slate-300">מחיר</th>
                <th className="py-2 px-2 font-semibold text-slate-700 dark:text-slate-300">משך (דק׳)</th>
                <th className="py-2 px-2 font-semibold text-slate-700 dark:text-slate-300">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 dark:border-slate-700">
                  <td className="py-2 px-2">{s.service_name}</td>
                  <td className="py-2 px-2">{s.price}</td>
                  <td className="py-2 px-2">{s.duration_minutes}</td>
                  <td className="py-2 px-2">
                    <button type="button" onClick={() => { setEditingService(s); setServiceModalOpen(true); }} className="p-1.5 text-slate-500 hover:text-indigo-600"><Pencil className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => del(s.id)} className="p-1.5 text-slate-500 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={() => { setEditingService(null); setServiceModalOpen(true); }} className="mt-3 inline-flex items-center gap-2 rounded-xl px-3 py-2 bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500">
          <Plus className="h-4 w-4" />
          שירות חדש
        </button>
      </div>
      {serviceModalOpen && (
        <ServiceModal
          initial={editingService}
          onSave={saveService}
          onClose={() => { setEditingService(null); setServiceModalOpen(false); }}
        />
      )}
    </div>
  );
}

function ServiceModal({ initial, onSave, onClose }: { initial: Service | null; onSave: (p: { service_name: string; price: number; duration_minutes: number; description?: string | null }) => void; onClose: () => void }) {
  const [name, setName] = useState(initial?.service_name ?? '');
  const [price, setPrice] = useState(initial?.price ?? 0);
  const [duration, setDuration] = useState(initial?.duration_minutes ?? 30);
  const [description, setDescription] = useState(initial?.description ?? '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 max-w-md w-full shadow-xl text-right" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-4">{initial ? 'עריכת שירות' : 'שירות חדש'}</h3>
        <div className="space-y-3">
          <input type="text" placeholder="שם שירות" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm" />
          <input type="number" placeholder="מחיר" value={price || ''} onChange={(e) => setPrice(Number(e.target.value))} className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm" />
          <input type="number" placeholder="משך (דק׳)" value={duration || ''} onChange={(e) => setDuration(Number(e.target.value) || 30)} className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm" />
          <textarea placeholder="תיאור" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm min-h-[80px]" />
        </div>
        <div className="flex gap-2 mt-4 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium">ביטול</button>
          <button type="button" onClick={() => onSave({ service_name: name.trim(), price, duration_minutes: duration, description: description.trim() || null })} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500">שמור</button>
        </div>
      </div>
    </div>
  );
}

function ProductsCard({
  clinicId,
  products,
  setProducts,
  editingProduct,
  setEditingProduct,
  productModalOpen,
  setProductModalOpen,
  media,
}: {
  clinicId: string;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  editingProduct: Product | null;
  setEditingProduct: (p: Product | null) => void;
  productModalOpen: boolean;
  setProductModalOpen: (v: boolean) => void;
  media: MediaItem[];
}) {
  const saveProduct = async (payload: { name: string; price?: number | null; image_url?: string | null; description?: string | null }) => {
    const opts = { credentials: 'include' as RequestCredentials, headers: { 'Content-Type': 'application/json' } };
    if (editingProduct) {
      const res = await fetch(`/api/super-admin/booking-site/products/${editingProduct.id}`, { method: 'PUT', ...opts, body: JSON.stringify(payload) });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.id) {
        setProducts((prev) => prev.map((p) => (p.id === j.id ? { ...p, name: j.name, price: j.price, image_url: j.image_url, description: j.description } : p)));
        setEditingProduct(null);
        setProductModalOpen(false);
      }
    } else {
      const res = await fetch(`/api/super-admin/booking-site/products?clinic_id=${encodeURIComponent(clinicId)}`, { method: 'POST', ...opts, body: JSON.stringify(payload) });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.id) {
        setProducts((prev) => [...prev, { id: j.id, name: j.name, price: j.price, image_url: j.image_url, description: j.description }]);
        setEditingProduct(null);
        setProductModalOpen(false);
      }
    }
  };

  const del = async (id: string) => {
    const res = await fetch(`/api/super-admin/booking-site/products/${id}`, { method: 'DELETE', credentials: 'include' });
    if (res.ok) setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50 p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
        <ShoppingBag className="h-4 w-4" />
        מוצרים
      </h2>
      <div className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {products.map((p) => (
            <div key={p.id} className="rounded-xl border border-slate-200 dark:border-slate-600 overflow-hidden bg-slate-50 dark:bg-slate-950">
              <div className="aspect-square bg-slate-200 dark:bg-slate-700">
                {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-400"><ImageIcon className="h-10 w-10" /></div>}
              </div>
              <div className="p-2">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-50 truncate">{p.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{p.price != null ? `₪${p.price}` : '—'}</p>
              </div>
              <div className="flex gap-1 p-2 border-t border-slate-200 dark:border-slate-700">
                <button type="button" onClick={() => { setEditingProduct(p); setProductModalOpen(true); }} className="p-1.5 text-slate-500 hover:text-indigo-600"><Pencil className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => del(p.id)} className="p-1.5 text-slate-500 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => { setEditingProduct(null); setProductModalOpen(true); }} className="mt-3 inline-flex items-center gap-2 rounded-xl px-3 py-2 bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500">
          <Plus className="h-4 w-4" />
          מוצר חדש
        </button>
      </div>
      {productModalOpen && (
        <ProductModal
          clinicId={clinicId}
          initial={editingProduct}
          onSave={saveProduct}
          onClose={() => { setEditingProduct(null); setProductModalOpen(false); }}
        />
      )}
    </div>
  );
}

function ProductModal({
  clinicId,
  initial,
  onSave,
  onClose,
}: {
  clinicId: string;
  initial: Product | null;
  onSave: (p: { name: string; price?: number | null; image_url?: string | null; description?: string | null }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [price, setPrice] = useState(initial?.price ?? '');
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set('file', file);
      fd.set('clinic_id', clinicId);
      const res = await fetch('/api/super-admin/booking-site/upload', { method: 'POST', body: fd, credentials: 'include' });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.url) setImageUrl(j.url);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 max-w-md w-full shadow-xl text-right" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-4">{initial ? 'עריכת מוצר' : 'מוצר חדש'}</h3>
        <div className="space-y-3">
          <input type="text" placeholder="שם מוצר" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm" />
          <input type="number" placeholder="מחיר" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm" />
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">תמונה</p>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              ref={imageInputRef}
              onChange={handleImageFile}
            />
            <div className="flex gap-2 items-center">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={uploading}
                className="rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {uploading ? 'מעלה...' : 'העלה תמונה'}
              </button>
              {imageUrl ? (
                <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600 shrink-0">
                  <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setImageUrl('')} className="absolute top-0 left-0 w-full h-full bg-black/50 flex items-center justify-center text-white text-xs">הסר</button>
                </div>
              ) : null}
            </div>
          </div>
          <textarea placeholder="תיאור" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm min-h-[80px]" />
        </div>
        <div className="flex gap-2 mt-4 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium">ביטול</button>
          <button type="button" onClick={() => onSave({ name: name.trim(), price: price === '' ? null : Number(price), image_url: imageUrl.trim() || null, description: description.trim() || null })} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500">שמור</button>
        </div>
      </div>
    </div>
  );
}
