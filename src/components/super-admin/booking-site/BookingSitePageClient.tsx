'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { loadBookingSiteServices } from '@/app/dashboard/super-admin/booking-site/actions';
import {
  Globe,
  ChevronRight,
  Search,
  Eye,
  Loader2,
} from 'lucide-react';
import type { Clinic, PageData, Section, MediaItem, Service, Product, ServicesByClinic, InitialServicesList } from './booking-site-types';
import { COLORS, getServicesForClinic } from './booking-site-types';
import { HeroVideoCard, MediaLibraryCard, PageBuilderCard, GalleryCard, ServicesCard, ProductsCard } from './BookingSiteCards';

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
          <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="חיפוש קליניקה..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-950 ps-4 pe-10 py-2 text-sm text-right placeholder:text-slate-400"
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
