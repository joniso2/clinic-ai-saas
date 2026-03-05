-- Gallery images/videos per clinic for the booking site.
CREATE TABLE IF NOT EXISTS public.clinic_gallery_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinic_gallery_images_clinic_id ON public.clinic_gallery_images(clinic_id);

ALTER TABLE public.clinic_gallery_images ENABLE ROW LEVEL SECURITY;

-- Public read for booking page; insert/delete via API (service role bypasses RLS).
CREATE POLICY "public_read_clinic_gallery" ON public.clinic_gallery_images FOR SELECT USING (true);
