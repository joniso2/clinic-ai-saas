# הרץ ב-Supabase SQL Editor (פעם אחת עבור "אתר טלפוני")

בלי המיגרציה הזו הטבלאות **media_library**, **booking_page_sections**, **booking_products** לא קיימות,  
ואז מוצרים / מדיה / Page Builder באתר טלפוני יכולים לגרום לשגיאות.

**איך להריץ:**  
Supabase Dashboard → **SQL Editor** → **New query** → הדבק את כל ה-SQL למטה → **Run**.

---

```sql
-- Booking site: media library, page sections, products (scoped by clinic_id)
CREATE TABLE IF NOT EXISTS public.media_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  url text NOT NULL,
  type text NOT NULL CHECK (type IN ('image', 'video')),
  filename text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_media_library_clinic_id ON public.media_library(clinic_id);

CREATE TABLE IF NOT EXISTS public.booking_page_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  section_type text NOT NULL CHECK (section_type IN ('hero', 'gallery', 'services', 'products', 'contact')),
  position integer NOT NULL DEFAULT 0,
  is_enabled boolean NOT NULL DEFAULT true,
  settings_json jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(clinic_id, section_type)
);
CREATE INDEX IF NOT EXISTS idx_booking_page_sections_clinic_position ON public.booking_page_sections(clinic_id, position);

CREATE TABLE IF NOT EXISTS public.booking_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric,
  image_url text,
  description text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_booking_products_clinic_id ON public.booking_products(clinic_id);

ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_page_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_media_library" ON public.media_library FOR ALL USING (true);
CREATE POLICY "service_role_booking_page_sections" ON public.booking_page_sections FOR ALL USING (true);
CREATE POLICY "service_role_booking_products" ON public.booking_products FOR ALL USING (true);
```
