-- Optional image URL for the hero "3D slot" (replaces live 3D orb when set)
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS hero_3d_slot_image_url text;
