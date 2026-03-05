# בדיקה ו־seed ל־clinic_services

הרץ את השאילתות האלה ב־**Supabase → SQL Editor** (אחת אחרי השנייה).

## 1. בדיקה: האם יש קליניקות ומי ה־id של LULU

```sql
SELECT id, name, slug FROM clinics ORDER BY name;
```

תעתיק את ה־**id** (UUID) של הקליניקה שאתה רוצה (למשל LULU) לשימוש בשלב 3.

---

## 2. בדיקה: האם יש שורות ב־clinic_services

```sql
SELECT id, clinic_id, service_name, price, duration_minutes 
FROM clinic_services 
ORDER BY clinic_id, service_name 
LIMIT 20;
```

- אם יש שורות – אמור לראות אותן ב"אתר טלפוני" אחרי רענון. אם עדיין לא, ייתכן ש־clinic_id לא תואם ל־clinics.id.
- אם אין שורות – עבור לשלב 3.

---

## 3. הוספת שירות לדוגמה (רק אם אין שורות)

**החלף את `@CLINIC_ID_OF_LULU`** ב־UUID של קליניקת LULU מהשאילתה בשלב 1.

```sql
INSERT INTO clinic_services (clinic_id, service_name, price, duration_minutes, is_active)
VALUES 
  ('@CLINIC_ID_OF_LULU', 'גבות', 100, 15, true);
```

אם יש לך כבר טבלת clinics ו־id של LULU, אפשר גם כך (מכניס שירות לקליניקה הראשונה בשם LULU):

```sql
INSERT INTO clinic_services (clinic_id, service_name, price, duration_minutes, is_active)
SELECT id, 'גבות', 100, 15, true
FROM clinics
WHERE name ILIKE '%LULU%'
LIMIT 1;
```

אחרי ה־INSERT – רענן את דף "אתר טלפוני" ובחר שוב את הקליניקה; השירות אמור להופיע תחת "שירותים / תמחור".
