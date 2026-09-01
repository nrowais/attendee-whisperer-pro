# SHDC 2026 — بوابة مؤتمر حوار الأمن والتاريخ — الرياض

البوابة الرسمية لمؤتمر حوار الأمن والتاريخ — الرياض 2026 (SHDC 2026): نظام عربي (RTL)
لإدارة عمليات الضيوف والمتحدثين: المتحدثون، المدعوون، الوصول والمغادرة، المطار،
النقل والتذاكر، الفنادق، الطلبات الخاصة، الحضور، الحالة التشغيلية اللحظية،
التقارير، وإدارة المستخدمين والصلاحيات.

نفذ بواسطة نايف الرويس

---

## 1. Project Overview

| الطبقة | التقنية |
| --- | --- |
| Frontend | React 19 + TanStack Router (file-based routes) + Tailwind CSS v4 |
| Server / SSR | TanStack Start (Nitro) — يعمل كخادم Node في الإنتاج |
| API Layer | Server Routes تحت `src/routes/api/**` + Server Functions |
| Database | **PostgreSQL** (Lovable Cloud / Supabase) — 23 جدولاً + RLS + Triggers |
| Auth | Supabase Auth (بريد/كلمة مرور + موافقة مدير + أدوار) |

لا يوجد Mock Data ولا LocalStorage كقاعدة بيانات. جميع البيانات التشغيلية تُقرأ
وتُكتب في PostgreSQL عبر واجهة البيانات المؤمّنة بـ Row Level Security، ولا يُنفَّذ
أي SQL خام من المتصفح.

### الأدوار
`admin` (مدير النظام) · `coordinator` (منسّق) · `viewer` (مطّلع) · `operator` (مسؤول تشغيل — مقيّد بشاشة الحالة التشغيلية).

---

## 2. Local Development

```sh
npm install
cp .env.example .env      # املأ القيم
npm run dev               # http://localhost:8080
```

أوامر أخرى: `npm run lint` · `npm run format` · `npm run build` · `npm run start`.

---

## 3. Environment Variables

| المتغير | الجهة | مطلوب | الوصف |
| --- | --- | --- | --- |
| `SUPABASE_URL` | Server | نعم | عنوان قاعدة البيانات/الـAPI |
| `SUPABASE_PUBLISHABLE_KEY` | Server | نعم | مفتاح عام (RLS مفعّل) |
| `VITE_SUPABASE_URL` | Build/Client | نعم | نفس العنوان، يُحقن وقت البناء |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Build/Client | نعم | نفس المفتاح العام |
| `VITE_SUPABASE_PROJECT_ID` | Build/Client | لا | معرّف المشروع |
| `PORT` | Runtime | يضبطه Railway | منفذ الاستماع |
| `HOST` | Runtime | لا | `0.0.0.0` (الافتراضي في الإنتاج) |
| `NODE_ENV` | Runtime | لا | `production` |
| `DATABASE_URL` | Server | لا | اتصال SQL مباشر — غير مستخدم حالياً |

> لا تضع أي قيمة سرية داخل الكود أو داخل GitHub. `.env` مستثنى في `.gitignore`.

---

## 4. Database Setup & Migration

نظام الترحيل الحقيقي موجود في `supabase/migrations/` (ملفات SQL مرقّمة زمنياً،
تُطبَّق بالترتيب). كل ملف يحتوي `CREATE TABLE` + `GRANT` + `ENABLE ROW LEVEL SECURITY`
+ `CREATE POLICY`، إضافةً إلى الدوال والـTriggers.

إنشاء قاعدة البيانات من الصفر على أي خادم PostgreSQL متوافق:

```sh
# بالترتيب الأبجدي/الزمني لأسماء الملفات
for f in supabase/migrations/*.sql; do psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"; done
```

أو عبر Supabase CLI:

```sh
supabase link --project-ref <ref>
supabase db push
```

لا تُنشئ جداول يدوياً — أضف ملف Migration جديد دائماً، ولا تغيّر أسماء الحقول
الحالية إلا عبر Migration صريح.

---

## 5. Production Build

```sh
npm run build     # ينتج .output/ (خادم Node + ملفات ثابتة)
npm run start     # node .output/server/index.mjs
```

الخادم يستمع على `process.env.PORT` وعلى `0.0.0.0`، لذلك يعمل داخل حاويات Railway
مباشرة. التوجيه يتم على الخادم (SSR)، لذا فتح أي رابط مباشرةً أو تحديث الصفحة
(`/dashboard`، `/speakers`، `/operations` …) يعمل بدون 404 ولا يحتاج SPA fallback.

---

## 6. Railway Deployment

1. اربط مستودع GitHub بخدمة **Application Service** جديدة في Railway.
2. Railway يكتشف Node.js تلقائياً (لا حاجة إلى Dockerfile). الإعدادات مثبتة في `railway.json`:
   - Build: `npm run build`
   - Start: `npm run start`
   - Healthcheck: `/api/public/health`
3. أضف متغيرات البيئة في **Variables** (انظر الجدول أعلاه).
4. إن أضفت خدمة PostgreSQL داخل Railway، اربطها بـ:
   `DATABASE_URL=${{Postgres.DATABASE_URL}}` (مرجع، لا تكتب القيمة في الكود).
5. كل Push إلى فرع `main` يُعيد البناء والنشر تلقائياً. قاعدة البيانات خدمة منفصلة
   ولا تُحذف عند النشر.

---

## 7. GitHub Deployment Flow

```
Lovable  →  GitHub (main)  →  Railway Build  →  Railway Deploy
```

التعديلات من Lovable تُدفع إلى `main`، وRailway يلتقطها تلقائياً.

---

## 8. Health Check

```sh
curl https://<your-app>.up.railway.app/api/public/health
```

```json
{ "status": "ok", "database": "connected", "timestamp": "..." }
```

يعيد `503` مع `"database": "disconnected"` إذا فشل الاتصال الفعلي بقاعدة البيانات.
لا يكشف أي أسرار أو Stack traces.

---

## 9. Security

- كل الأسرار في متغيرات بيئة، ولا شيء منها في المستودع.
- كلمات المرور مُدارة ومُجزّأة داخل نظام المصادقة، ولا تُخزَّن ولا تُرسل إلى الواجهة.
- التفويض يُطبَّق على الخادم عبر Row Level Security ودوال `has_role` / `can_edit` /
  `can_update_ops` — ولا يعتمد على الواجهة.
- لا اتصال مباشر من المتصفح بـ PostgreSQL، ولا SQL خام من الواجهة (استعلامات مُعدّة
  ومحمية من SQL Injection).
- أخطاء الـAPI تُسجَّل على الخادم وتُعاد للمستخدم برسائل عامة فقط.

---

## 10. Troubleshooting

| المشكلة | الحل |
| --- | --- |
| فشل البناء على Railway | تأكد أن devDependencies تُثبَّت (لا تضبط `NPM_CONFIG_PRODUCTION=true`) — `vite` و`nitro` مطلوبان للبناء. |
| الصفحة بيضاء بعد النشر | تحقق من وجود `VITE_SUPABASE_URL` و`VITE_SUPABASE_PUBLISHABLE_KEY` **وقت البناء**. |
| `/api/public/health` يعيد 503 | متغيرات `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` ناقصة أو القاعدة غير متاحة. |
| تسجيل الدخول يفشل | تأكد أن رابط التطبيق المنشور مضاف في إعدادات Redirect URLs للمصادقة. |
| 404 عند تحديث صفحة | تأكد أنك تشغّل `npm run start` (خادم Node) وليس خادم ملفات ثابتة. |
