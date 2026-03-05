-- Hero background video for booking page (optional; falls back to hero_image).
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS hero_video text;
