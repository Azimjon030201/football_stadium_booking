# Football Mini Stadium Booking Platform — Backend

NestJS + Prisma + PostgreSQL asosidagi backend API skeletoni.

> **Bu — ARXITEKTURA skeleti.** Controller'lar va DTO'lar (API shakli) tayyor,
> lekin Service metodlari ichida **TODO** izohlar bilan bo'sh qoldirilgan —
> har bir dasturchi o'z PDF qo'llanmasidagi TASK raqamiga mos joyni topib,
> shu yerdan implement qilishni boshlaydi.

## Talablar

- Docker va Docker Compose
- Node.js 20+

## O'rnatish

```bash
git clone <repo-url>
cd football-stadium-booking
cp .env.example .env          # keyin .env faylini oching, qiymatlarni tekshiring
docker compose up -d postgres
npm install
npx prisma generate
npx prisma migrate deploy     # tayyor migratsiyani qo'llaydi (prisma/migrations/ papkasida)
npm run start:dev
```

Server: `http://localhost:3000`
Swagger: `http://localhost:3000/api/docs`

## Loyiha strukturasi va kim qayerda ishlaydi

```
src/
├── auth/                 → Dev1 (Authentication)
│   ├── dto/               register, login, refresh-token, change-password
│   ├── strategies/         jwt.strategy.ts
│   ├── auth.service.ts     ← TASK-01...TASK-10 shu yerda (TODO)
│   ├── auth.controller.ts  route'lar tayyor
│   └── auth.module.ts
│
├── users/                → Dev2 (Authorization & Users)
│   ├── dto/                update-profile.dto.ts
│   └── users.service.ts    ← TASK-01,02,10,11 shu yerda (TODO)
│
├── stadiums/              → Dev3 (Stadium Management)
│   ├── dto/                create-stadium, update-stadium
│   └── stadiums.service.ts ← TASK-01...TASK-12 shu yerda (TODO)
│
├── fields/                → Dev4 (Field, Working Hours & Search)
│   ├── dto/                create-field, update-field, working-hour
│   └── fields.service.ts   ← TASK-01...TASK-11 shu yerda (TODO)
│
├── payments/               → Dev5 (Mock Payment & Webhook)
│   ├── dto/                initiate-payment, webhook
│   ├── providers/          payment-provider.interface.ts, mock-provider.ts (TODO)
│   └── payments.service.ts ← TASK-04...TASK-10 shu yerda (TODO)
│
├── bookings/               → Tech Lead (siz)
├── availability/           → Tech Lead (siz)
│
├── common/                 → cross-cutting: barcha squad foydalanadi
│   ├── decorators/          @Roles(), @CurrentUser()
│   ├── guards/               JwtAuthGuard (Dev1), RolesGuard (Dev2, TODO)
│   ├── filters/               AllExceptionsFilter (Dev2, TODO)
│   └── constants/              error-codes.ts (markazlashtirilgan xato kodlari)
│
├── prisma/                  PrismaService (global, tayyor)
├── app.module.ts            barcha modullarni bog'laydi
└── main.ts                  bootstrap, Swagger, ValidationPipe

prisma/
├── schema.prisma            barcha modellar (SRS asosida, tayyor)
├── migrations/               boshlang'ich migratsiya TAYYOR va sinalgan
│   └── 20260923080000_init/  (haqiqiy PostgreSQL'da sinaldi — 15 jadval, barcha FK'lar)
└── seed.ts                  → Dev6, TASK-06 (TODO)

test/
├── jest-e2e.json
└── booking-conflict.e2e-spec.ts   → Dev6 + Tech Lead, TASK-08 (TODO)
```

## Qanday ishlash kerak (har bir dasturchi uchun)

1. O'zingizning PDF qo'llanmangizni oching (masalan `Dev1_Auth_TOLIQ_Qollanma.pdf`)
2. `git checkout -b feature/<nomi>` — yangi branch oching
3. Yuqoridagi jadvaldan o'z papkangizni toping
4. Service faylidagi `TODO (DevN TASK-XX): ...` izohlarni birma-bir toping va
   implement qiling — qo'llanmangizdagi kod namunasi va tushuntirish shu
   TASK raqami ostida yozilgan
5. Controller'ga tegmang (agar yangi endpoint qo'shish kerak bo'lmasa) —
   route'lar allaqachon to'g'ri sozlangan
6. Postman'da sinab ko'ring, PR oching

## Muhim arxitektura qoidalari (buzmang)

- **Guard tartibi:** `@UseGuards(JwtAuthGuard, RolesGuard)` — JwtAuthGuard
  HAR DOIM birinchi.
- **Nested ownership:** Field'da `ownerId` yo'q — `field.stadium.ownerId`
  orqali tekshiriladi. Xuddi shunday Payment'da `payment.booking.userId`.
- **Status maydonlari erkin o'zgarmaydi:** Stadium/Booking/Payment status'i
  faqat maxsus metodlar orqali (masalan `submit()`, `handleWebhook()`)
  o'zgaradi, oddiy `update()` orqali emas.
- **Server har doim o'zi belgilaydi:** `ownerId`, `status` kabi maydonlar
  hech qachon so'rov body'sidan olinmaydi.
- **Xato kodlari:** `src/common/constants/error-codes.ts`'dan foydalaning,
  qo'lda string yozmang.

## Migratsiyalar

```bash
# Development — yangi model/maydon qo'shganda:
npx prisma migrate dev --name <tavsif>

# Production — faqat mavjud migratsiyalarni qo'llash:
npx prisma migrate deploy
```

## Testlar

```bash
npm run test          # unit testlar
npm run test:e2e      # end-to-end testlar
```

## Muhim eslatma: GiST Exclusion Constraint

Double-booking'ni DB darajasida oldini olish uchun (`bookings` jadvalida)
`tstzrange` ustuni + GiST Exclusion Constraint kerak. Bu Prisma DSL orqali
ifodalanmaydi — Tech Lead tomonidan **raw SQL migration** orqali qo'shiladi
(SRS 12.3-band). Booking Engine implement qilinguncha bu qo'shilmagan.
