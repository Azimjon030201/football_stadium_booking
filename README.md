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

## Migratsiyalar (Prisma Migrate)

> Prisma versiyasi: **6.19.x** (`package.json` / `package-lock.json`). Barcha buyruqlar shu versiyaga mos.
> Bu bo'limdagi qoidalar **butun jamoa uchun majburiy**.

### Migratsiya nima?

`prisma/schema.prisma` — modellarning *kerakli holati*. **Migratsiya** esa bazani bir holatdan
ikkinchisiga o'tkazadigan SQL fayl: `prisma/migrations/<vaqt>_<nom>/migration.sql`.
Bu papkalar bazaning **tarixi** hisoblanadi va Git orqali jamoaga uzatiladi.
Prisma qaysi migratsiya qo'llanganini bazadagi `_prisma_migrations` jadvalida saqlaydi
(nomi va checksum'i bilan).

| Fayl / papka | Vazifasi | Git'ga qo'shiladimi? |
|---|---|---|
| `prisma/schema.prisma` | Modellar (manba) | Ha |
| `prisma/migrations/*/migration.sql` | Migratsiya tarixi | **Ha, doim** |
| `prisma/migrations/migration_lock.toml` | Provider (`postgresql`) qulfi | Ha |
| `.env` | Maxfiy sozlamalar (`DATABASE_URL`, JWT secret'lar) | **YO'Q** (`.gitignore`'da) |
| `.env.example` | Namuna (haqiqiy qiymatlarsiz) | Ha |

### Oltin qoidalar

1. **Git'ga tushgan (push qilingan) migratsiyani HECH QACHON o'chirmang, nomini o'zgartirmang, ichini tahrirlamang.**
   Xato bo'lsa — *yangi* migratsiya yarating (oldinga tuzatish).
2. `migrate dev`, `migrate reset`, `db push` — **faqat local development bazasida.** Production/staging'da taqiqlangan.
3. Production'da faqat `migrate deploy`.
4. Har bir `schema.prisma` o'zgarishi = bitta mazmunli migratsiya. `schema.prisma` va yangi migration papkasi **bitta commit'da** bo'lsin.
5. `.env` hech qachon commit qilinmaydi. Yangi o'zgaruvchi qo'shsangiz — `.env.example`'ga ham (qiymatsiz/namuna bilan) qo'shing.

### Development: schema o'zgartirish tartibi

Barcha buyruqlar **loyiha ildizida** (`package.json` turgan papka) bajariladi.

```bash
# 0) Oldin eng so'nggi kodni oling va mavjud migratsiyalarni qo'llang
git pull
npm install
npx prisma migrate deploy        # yoki: npx prisma migrate dev  (local bazada ham bo'ladi)
npx prisma generate

# 1) prisma/schema.prisma'ni o'zgartiring (masalan, yangi model/maydon)

# 2) Sintaksisni tekshiring
npx prisma validate

# 3) Migratsiya yarating va local bazaga qo'llang
npx prisma migrate dev --name add_payment_model
```

**Muhim:** `add_payment_model` — faqat **namuna**. Siz o'z o'zgarishingizga mos, mazmunli nom bering
(`snake_case`, fe'l + nima): `add_review_rating_check`, `add_booking_cancel_reason`,
`add_index_booking_user_id`, `rename_field_size_to_dimensions`. `update`, `fix`, `test`, `new_migration`
kabi ma'nosiz nomlardan qoching. *(Loyihada `Payment` modeli allaqachon mavjud — namuna nomini ko'chirmang.)*

Xavfsizroq variant (jamoa uchun **tavsiya etiladi**): `npm run` skriptlari avval `DATABASE_URL` local
baza ekanini tekshiradi (`scripts/prisma-dev-guard.js`):

```bash
npm run prisma:migrate -- --name add_review_rating_check          # yaratadi va qo'llaydi
npm run prisma:migrate:create -- --name add_booking_cancel_reason # faqat SQL yaratadi, qo'llamaydi
```

> **Guard nimani tekshiradi:** `NODE_ENV=production` bo'lsa yoki `DATABASE_URL` host'i
> `localhost`, `127.0.0.1`, `::1`, `postgres`, `host.docker.internal` dan boshqa bo'lsa — buyruq to'xtaydi.
> Atayin boshqa **test** bazasiga ishlatish kerak bo'lsa: `ALLOW_NON_LOCAL_DB=true`
> (PowerShell: `$env:ALLOW_NON_LOCAL_DB="true"`). Production bazaga hech qachon qo'llamang.
> Guard faqat `npm run prisma:migrate*` orqali ishlaydi; to'g'ridan-to'g'ri `npx prisma migrate dev`
> yozsangiz himoya yo'q — `.env`ni o'zingiz tekshiring.

### Migratsiyani tekshirish va Git'ga commit qilish

```bash
# 1) Yaratilgan SQL'ni O'QING — kutilmagan DROP / ALTER / ma'lumot yo'qotish yo'qmi?
#    prisma/migrations/<vaqt>_<nom>/migration.sql

# 2) Holatni tekshiring: "Database schema is up to date!" bo'lishi kerak
npx prisma migrate status

# 3) Prisma Client'ni yangilang
npx prisma generate

# 4) Loyiha yig'ilishini va testlarni tekshiring
npm run build
npm run test

# 5) Aynan kerakli fayllarni qo'shing (git add . ishlatmang — .env tasodifan tushmasin)
git status
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): add_payment_model migration"
git push
```

Commit'dan oldin tekshiring: `git status`'da `.env` **ko'rinmasligi** kerak.
Ma'lumotni yo'qotadigan o'zgarish (ustun/jadval o'chirish, tur o'zgartirish, `NOT NULL` qo'shish) bo'lsa —
avval `--create-only` bilan SQL yarating, qo'lda to'g'rilang (masalan `DEFAULT` yoki ma'lumot ko'chirish),
so'ng `npx prisma migrate dev` bilan qo'llang va PR'da alohida eslatib o'ting.

**Raw SQL migratsiya** (masalan, `bookings` uchun `tstzrange` + GiST EXCLUDE constraint — pastga qarang):
`npm run prisma:migrate:create -- --name add_booking_no_overlap_constraint` → hosil bo'lgan bo'sh
`migration.sql`'ga SQL yozing → `npx prisma migrate dev`.

### Boshqa dasturchi migratsiyalarni qanday qo'llaydi

Hamkasbingiz yangi migratsiya push qilgan bo'lsa:

```bash
git pull
npm install
npx prisma migrate deploy     # yangi migratsiyalarni local bazaga qo'llaydi (yangisini YARATMAYDI)
npx prisma generate           # Prisma Client'ni yangilaydi
npx prisma migrate status     # tekshiruv
npm run start:dev
```

`migrate deploy` yangi migratsiya yaratmaydi, drift uchun reset so'ramaydi — shuning uchun hamkasb
migratsiyalarini qo'llashda eng xavfsiz buyruq. Hamma jamoa a'zosi **bir xil tartibda** (vaqt belgisi
bo'yicha) qo'llaydi — tartibni Prisma papka nomidagi timestamp bo'yicha o'zi belgilaydi.

### Production deployment

Production'da **hech qachon**: `prisma migrate dev`, `prisma migrate reset`, `prisma db push`
(ruxsatsiz) ishlatilmaydi. Ular bazani o'chirishi yoki migratsiya tarixini buzishi mumkin.

```bash
npx prisma migrate deploy
```

`migrate deploy`:
- yangi migratsiya **yaratmaydi**, `schema.prisma`'ni o'qib SQL chiqarmaydi;
- `prisma/migrations/` ichidagi, hali qo'llanmagan migratsiyalarni **tartib bilan** production bazaga qo'llaydi;
- shadow database ishlatmaydi, bazani reset qilmaydi;
- **drift'ni aniqlamaydi** — shuning uchun eski migratsiya fayllarini o'zgartirmaslik qoidasiga qat'iy rioya qiling.

**Deployment'dan oldin (tekshiruv ro'yxati):**

1. Migratsiya PR'da review qilingan va `main`'ga merge qilingan; SQL'da kutilmagan `DROP`/ma'lumot yo'qotish yo'q.
2. Xuddi shu migratsiyalar **staging yoki alohida test bazada** sinab ko'rilgan (production'da emas).
3. **Backup olingan** (masalan `pg_dump`) va uni tiklash mumkinligi ma'lum. Prisma'da `down` migratsiya yo'q:
   orqaga qaytish = backup'dan tiklash yoki *oldinga* tuzatuvchi yangi migratsiya.
4. `DATABASE_URL` aynan **kerakli** muhitga ishora qilayotganini tekshiring (host, port, baza nomi).
5. Katta jadvallarda uzoq lock beradigan o'zgarishlar (indeks, ustun turi) uchun texnik oyna rejalashtiring.
6. Avval holatni ko'ring: `npx prisma migrate status` (faqat o'qiydi).

**Docker orqali:** `Dockerfile`dagi `CMD` konteyner har ishga tushganda `npx prisma migrate deploy`
bajaradi, so'ng ilovani ishga tushiradi. Ya'ni backend konteynerini production bazaga ulab
ishga tushirish = migratsiyalar qo'llanishi. Shuning uchun `.env`/`DATABASE_URL`ni deploy'dan oldin
albatta tekshiring. Bir nechta replika bir vaqtda ishga tushsa, Prisma advisory lock ishlatadi,
lekin baribir avval bitta instansni ko'tarib migratsiya tugashini kutish tavsiya etiladi.

### Docker buyruqlari va ular qaysi papkada bajariladi

Barcha `docker compose ...` buyruqlari **loyiha ildizida** (`docker-compose.yml` turgan papka,
`D:\Projects\football_stadium_booking`) bajariladi.

| Maqsad | Buyruq | Qayerda |
|---|---|---|
| Faqat PostgreSQL'ni ko'tarish | `docker compose up -d postgres` | loyiha ildizi |
| Holatni ko'rish | `docker compose ps` | loyiha ildizi |
| Hamma servislarni (postgres + backend) ko'tarish | `docker compose up -d --build` | loyiha ildizi |
| Konteyner ichida migratsiya holati | `docker compose exec backend npx prisma migrate status` | loyiha ildizi |
| Konteyner ichida migratsiyalarni qo'llash | `docker compose exec backend npx prisma migrate deploy` | loyiha ildizi |
| Backend loglari | `docker compose logs -f backend` | loyiha ildizi |
| To'xtatish (ma'lumot saqlanadi) | `docker compose down` | loyiha ildizi |

> Ehtiyot bo'ling: `docker compose down -v` `pgdata` volume'ini **o'chiradi** — butun local baza ma'lumotlari yo'qoladi.

**Migratsiyani qayerda yaratish kerak?** `prisma migrate dev` ni **host'da** (loyiha ildizida, `npm`/`npx`
orqali) ishlating, backend konteynerida emas: konteynerdagi `prisma/` papkasi image ichiga ko'chirilgan
(host fayllariga yozilmaydi), shuning uchun u yerda yaratilgan migratsiya Git'ga tushmaydi.

**Ikki xil `DATABASE_URL`:**
- Host'dan (`npx prisma ...`): `.env`dagi `DATABASE_URL` — host `localhost`, port `POSTGRES_PORT`
  (`.env.example`'da `5433`; `POSTGRES_PORT` berilmasa compose `5432` ishlatadi). `DATABASE_URL`dagi port
  va `POSTGRES_PORT` **mos bo'lishi shart**.
- Konteyner ichida: `docker-compose.yml` o'zi `DATABASE_URL`ni `postgres:5432` qilib beradi (`.env`dagi qiymat bosib o'tiladi).

### Migration conflict yuz bersa

Ikki dasturchi bir vaqtda turli branch'larda `schema.prisma`'ni o'zgartirib migratsiya yaratgan bo'lsa,
merge paytida odatda ikki holat uchraydi:

1. **`schema.prisma`'da Git conflict.** Ikkala o'zgarishni qo'lda birlashtiring (ikkala model/maydon qolsin).
   Migration papkalariga **tegmang** — ular boshqa-boshqa nomli, conflict bermaydi.
2. **Merge'dan keyin schema va migratsiyalar mos kelmasligi** (`migrate dev` "drift" yoki reset so'raydi).

Xavfsiz tartib:

```bash
git pull                              # yoki merge'ni tugating
npx prisma validate                   # schema to'g'rimi?
npx prisma migrate status             # nima qo'llangan, nima yo'q — AVVAL SHUNI KO'RING
npx prisma migrate deploy             # kutilayotgan migratsiyalarni qo'llash
npx prisma migrate dev --create-only --name reconcile_schema_after_merge
#   -> agar "Already in sync" desa — hech narsa kerak emas.
#   -> aks holda hosil bo'lgan SQL'ni o'qing; faqat kutilgan farqlar bo'lsa qo'llang.
```

- Faqat **o'zingizning local (bir martalik)** bazangizda va `migrate status`ni ko'rib, ma'lumot kerak emasligiga
  ishonch hosil qilgandan keyingina: `npx prisma migrate reset` (bazani **o'chirib** qayta quradi).
  Shared/staging/production'da hech qachon.
- Eski migratsiyani o'chirish yoki tahrirlash — **yechim emas**. Kerak bo'lsa yangi tuzatuvchi migratsiya yarating.
- Agar ikkala branch ham allaqachon umumiy bazaga qo'llangan bo'lsa — jamoa bilan kelishib, oldinga
  tuzatuvchi migratsiya yarating; `migrate resolve` ni faqat sababini aniq bilgan holda ishlating.

### Ko'p uchraydigan xatolar va yechimlari

| Xato / belgi | Sabab | Yechim |
|---|---|---|
| `P1001: Can't reach database server` | Postgres ishlamayapti yoki port noto'g'ri | `docker compose ps`; `DATABASE_URL` porti = `POSTGRES_PORT` ekanini tekshiring (`5432` vs `5433`) |
| `Environment variable not found: DATABASE_URL` | `.env` yo'q | `cp .env.example .env` (PowerShell: `Copy-Item .env.example .env`) |
| `P1000: Authentication failed` | `.env`dagi login/parol Postgres volume yaratilgandagi qiymatlardan farq qiladi | `POSTGRES_*` va `DATABASE_URL`ni bir xil qiling. Volume eski parol bilan yaratilgan bo'lsa — local bazani tozalash (`down -v`) faqat ma'lumot kerak bo'lmasa |
| `Drift detected` / "We need to reset the schema" | Local baza migratsiya tarixiga mos emas (qo'lda o'zgartirilgan yoki `db push` ishlatilgan) | Avval `migrate status`; **faqat local** bazada `migrate reset`. `db push`ni migratsiya bilan aralashtirmang |
| `The migration ... was modified after it was applied` | Qo'llangan migratsiya fayli o'zgartirilgan (yoki satr oxiri CRLF/LF farqi) | Faylni Git'dagi holatiga qaytaring (`git checkout -- <fayl>`). O'zgartirmang; kerak bo'lsa yangi migratsiya |
| `P3009: migrate found failed migrations` | Oldingi migratsiya yarim yo'lda xato bilan to'xtagan | Sababni tuzating; local bazada reset. Shared bazada: xato sababini qo'lda tuzatib, `npx prisma migrate resolve --rolled-back <nom>` yoki `--applied <nom>` (jamoa bilan kelishib, avval backup) |
| `P3005: The database schema is not empty` | Bo'sh bo'lmagan bazada tarix yo'q (baseline kerak) | Baseline qiling (Prisma "baselining" hujjati). Production'da reset qilmang |
| `P3014 / P3006`: shadow database yaratib bo'lmadi | DB foydalanuvchisida `CREATE DATABASE` huquqi yo'q | Local development foydalanuvchisiga huquq bering (Docker'dagi `postgres` foydalanuvchisida bor) |
| `EPERM ... query_engine ... .dll.node` (Windows) | `prisma generate` paytida dev server/boshqa jarayon Prisma faylini ushlab turibdi | `npm run start:dev`ni to'xtating, `npx prisma generate`ni qayta ishga tushiring |
| `PrismaClient` yangi maydonni ko'rmayapti | `generate` qilinmagan | `npx prisma generate` |
| `.env` `git status`'da ko'rinyapti | Tasodifan track qilingan | `git rm --cached .env` (faylni diskdan o'chirmaydi), commit qiling; **tushib ketgan secret'larni almashtiring** |

### GiST Exclusion Constraint haqida eslatma

Double-booking'ni DB darajasida oldini olish uchun `bookings` jadvalida `tstzrange` + GiST EXCLUDE
constraint kerak. Prisma DSL buni ifodalay olmaydi — u **raw SQL migratsiya** bilan qo'shiladi
(yuqoridagi `--create-only` tartibi; kerak bo'lsa `CREATE EXTENSION IF NOT EXISTS btree_gist;`).
Hozirgi `init` migratsiyada bu constraint **yo'q**.

## Testlar

```bash
npm run test          # unit testlar
npm run test:e2e      # end-to-end testlar
```