# مكتب المطري كونسلت - نظام المحاسبة وسندات القبض

نظام ويب عربي متكامل RTL لإدارة سندات القبض والمحاسبة

## المميزات

- سندات القبض الرقمية مع طباعة A4
- كشف حساب العملاء الكامل
- لوحة تحكم تحليلية مع رسوم بيانية
- مراقبة أداء المهندسين
- مركز تذكيرات واتساب
- بوت تيليجرام للتقارير
- مساعد ذكاء اصطناعي (يدعم Claude)
- دعم 4 أدوار: مدير، محاسب، مهندس، مشاهد

## الإعداد السريع

```bash
cp .env.example .env.local
# عدّل .env.local بإضافة DATABASE_URL
npm install
npm run db:push
npm run db:seed
npm run dev
```

## بيانات الدخول التجريبية

| المستخدم | كلمة المرور | الدور |
|---------|------------|------|
| admin | admin123 | مدير النظام |
| accountant | acc123 | محاسب |
| engineer | eng123 | مهندس |
| viewer | viewer123 | مشاهد |

## Docker

```bash
docker-compose up -d
```

## التقنيات

- Next.js 16 + TypeScript
- Prisma + PostgreSQL
- Jose JWT Sessions
- Tailwind CSS v4 (RTL)
- Recharts
- Telegram Bot API
- Claude AI (اختياري)
