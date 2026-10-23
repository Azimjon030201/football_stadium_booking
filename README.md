# Football Stadium Booking API

Bu loyiha football stadium booking backend API bo'lib, NestJS, Prisma ORM va PostgreSQL bilan yaratilgan. Asosiy maqsad: foydalanuvchilarni ro'yxatdan o'tkazish, stadion va maydonlarni boshqarish, bron qilish, to'lov va webhooklar bilan ishlash, shuningdek Swagger orqali API dokumentatsiyasini taqdim etish.

## A. Loyiha haqida

Football Stadium Booking loyihasi futbol stadioni yoki mini-stadionlarni bron qilish va boshqarish uchun xizmat ko'rsatuvchi backend API hisoblanadi. Loyihaning asosiy funksionalligi quyidagilarni o'z ichiga oladi:

- foydalanuvchi autentifikatsiyasi va avtorizatsiyasi
- stadion va maydonlarni yaratish, yangilash va qarash
- maydonlar uchun ishlash soatlari va mavjudlik ma'lumotlari
- bron qilish va bekor qilish logikasi
- to'lovni boshlash va mock/webhook tasdiqlash
- JWT orqali himoyalangan endpointlar
- Swagger orqali API dokumentatsiyasi

Amalda ishlatiladigan texnologiyalar:

- NestJS 10
- TypeScript 5
- Prisma 6
- PostgreSQL 16
- Docker + Docker Compose
- JWT (Passport + NestJS JWT)
- Swagger / OpenAPI
- Jest uchun testlar

## B. Talab qilinadigan dasturlar

Loyihani to'g'ri ishga tushirish uchun quyidagi dasturlar o'rnatilgan bo'lishi kerak:

- Git
- Node.js 20.x va npm
- Docker Desktop
- Docker Compose v2
- PostgreSQL 16 (agar Docker orqali emas, alohida o'rnatish kerak bo'lsa)

Bu loyihadagi haqiqiy konfiguratsiya quyidagilarga asoslanadi:

- `package.json` ichida NestJS 10 va Prisma 6 ishlatilgan
- `Dockerfile` `node:20-alpine` ni ishlatadi
- `docker-compose.yml` PostgreSQL 16 Alpine image'ini o'z ichiga oladi
- `.env.example` da `POSTGRES_PORT=5433` va `DATABASE_URL` ko'rsatilgan

## C. Loyihani yuklab olish

Agar repository URL ma'lum bo'lsa, haqiqiy manzilni ishlating. Agar noma'lum bo'lsa, placeholderdan foydalaning.

```bash
git clone [REPOSITORY_URL]
cd football_stadium_booking
```

## D. Environment sozlamalari

Loyihaning `.env.example` fayli asosida `.env` yarating.

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Git Bash / bash / zsh:

```bash
cp .env.example .env
```

Keyin `.env` faylini ochib, qiymatlarni o'zingizga moslashtiring.

### Asosiy environment variable'lar

`.env.example` faylida mavjud bo'lgan haqiqiy o'zgaruvchilar:

| O'zgaruvchi | Majburiy | Tavsif |
|---|---:|---|
| `DATABASE_URL` | Ha | PostgreSQL connection string. Local dev uchun `postgresql://postgres:postgres@localhost:5433/stadium_db` ko'rinishida bo'ladi. |
| `JWT_ACCESS_SECRET` | Ha | Access token uchun maxfiy kalit. Uzoq va tasodifiy bo'lishi kerak. |
| `JWT_REFRESH_SECRET` | Ha | Refresh token uchun maxfiy kalit. |
| `PORT` | Ha | Backend server porti. Dasturda default qiymat `3000` ishlatiladi. |
| `CORS_ORIGIN` | Ixtiyoriy | Frontend manbai. Misol: `http://localhost:5173` |
| `NODE_ENV` | Ixtiyoriy | `development` yoki `production` |
| `POSTGRES_DB` | Ha | Docker orqali ishlatiladigan PostgreSQL baza nomi |
| `POSTGRES_USER` | Ha | PostgreSQL foydalanuvchi nomi |
| `POSTGRES_PASSWORD` | Ha | PostgreSQL paroli |
| `POSTGRES_PORT` | Ha | Local hostdagi PostgreSQL porti, `.env.example` bo'yicha `5433` |
| `PAYMENT_WEBHOOK_SECRET` | Ixtiyoriy | Webhook tasdiqlash uchun secret |
| `JWT_ACCESS_TTL` | Ixtiyoriy | Access token muddati, misol: `15m` |
| `JWT_REFRESH_TTL` | Ixtiyoriy | Refresh token muddati, misol: `30d` |
| `APP_TIMEZONE` | Ixtiyoriy | `Asia/Tashkent` |
| `CANCELLATION_DEADLINE_MINUTES` | Ixtiyoriy | Bekor qilish uchun vaqt chegarasi, misol: `120` |
| `MAX_BOOKING_DURATION_MINUTES` | Ixtiyoriy | Mavjud bo'lishi mumkin bo'lgan maksimal bronlash davomiyligi |
| `PAYMENT_EXPIRATION_MINUTES` | Ixtiyoriy | To'lov muddati |
| `ALLOW_NON_LOCAL_DB` | Ixtiyoriy | Prisma guard uchun ishlatiladi. Local DBdan tashqari DB ishlatishda `true` qo'yiladi. |

Eslatma:

- `.env` faylida haqiqiy parollar va secretnar yoziladi.
- Hech qachon `.env` ni Git'ga qo'shmang.
- `.env.example` faqat namuna sifatida saqlanadi.
- Ushbu loyiha `src/app.module.ts` va `src/auth/auth.module.ts` dagi `ConfigModule` orqali environment o'zgaruvchilarini o'qiydi.

## E. Docker orqali ishga tushirish

Loyiha ildizida quyidagi buyruqlarni bajaring:

```bash
docker compose up -d --build
```

Bu buyruq:

- PostgreSQL konteynerini yaratadi
- backend image'ini quradi
- backend va DB ni birgalikda ko'taradi

Konteynerlar holatini tekshirish:

```bash
docker compose ps
docker compose logs -f
```

Agar faqat backend yoki PostgreSQL loglarini ko'rmoqchi bo'lsangiz:

```bash
docker compose logs -f backend
docker compose logs -f postgres
```

Agar loyiha ishlashi to'xtatilsa:

```bash
docker compose down
```

`pgdata` volume'ini ham tozalamoqchi bo'lsangiz:

```bash
docker compose down -v
```

> `-v` ishlatilsa, PostgreSQL ma'lumotlari to'liq o'chiriladi. Bu faqat ma'lumotlar kerak bo'lmasa ishlatiladi.

Docker Desktop ishlamayotgan bo'lsa:

- Docker Desktop ni ishga tushiring
- Docker daemon ishlayotganligini tekshiring
- Keyin yuqoridagi `docker compose ...` buyrug'ini qayta bajaring

## F. Prisma va database migration

`package.json` da quyidagi Prisma skriptlar mavjud:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:migrate:create
npm run prisma:validate
npm run prisma:status
npm run prisma:deploy
npm run prisma:studio
```

Prisma schema fayli: `prisma/schema.prisma`

Migratsiyalar papkasi: `prisma/migrations/`

Mavjud repositoryda migratsiyalar allaqachon mavjud. Shuning uchun yangi ishga tushirish uchun migratsiyalarni qo'llash kerak:

```bash
npx prisma migrate deploy
```

Agar local development bazasida schema yoki yangi migration yaratish kerak bo'lsa:

```bash
npm run prisma:migrate -- --name add_booking_status_index
```

Yoki an'anaviy:

```bash
npx prisma migrate dev
```

### Faqat qaysi muhitda qaysi buyruq ishlatiladi?

- Local development: `npx prisma migrate dev` yoki `npm run prisma:migrate`
- Existing migration files from repo: `npx prisma migrate deploy`
- Production/staging: faqat `npx prisma migrate deploy`

> `migrate dev`, `migrate reset` yoki `db push` production uchun ishlatilmaydi. Ular schema va migration tarixini xavf ostiga qo'yishi mumkin.

`prisma-dev-guard.js` skripti `DATABASE_URL` va `NODE_ENV` ni tekshiradi. Agar host production/remote bo'lsa yoki `NODE_ENV=production` bo'lsa, xavfli migrate dev buyruqlari bloklanadi.

### Seed ma'lumotlari

Proyektida `prisma/seed.ts` fayli mavjud va local development/test bazasi uchun boshlang'ich ma'lumotlarni yaratadi. Seed maqsadi:

- admin, owner va oddiy userlar yaratish
- aktiv stadiumlar va maydonlar yaratish
- har bir field uchun full working hours sozlash
- bir xil ma'lumotlarni takroran kiritmaslik

Seed ni quyidagicha ishga tushiring:

```bash
npx prisma generate
npx prisma db seed
```

`package.json` Prisma 6 uchun `prisma.seed` sozlamasida `ts-node prisma/seed.ts` runneridan foydalanadi. Seed `.env` faylini ham o‘qiydi; shell orqali oldindan berilgan environment qiymatlari ustun turadi. Docker Compose ishlatilganda backend konteyneridagi `postgres` hostname ishlatiladi.

### Postman collection va seed dokumentatsiyasi

Frontend dasturchilar uchun tayyorlangan Postman collection fayli:

- `postman/Football-Stadium-Booking.postman_collection.json`

Seed ma'lumotlari va login namunalari uchun hujjat:

- `postman/SEED_DATA.md`

Import qilish uchun Postman'da Import -> File tanlang, so'ngra yuqoridagi JSON faylini tanlang. Base URL sifatida `http://localhost:3000` ishlating.

Agar `.env` file mavjud bo'lmasa, avval namuna fayldan nusxa oling:

```bash
Copy-Item .env.example .env
# yoki
cp .env.example .env
```

Seed faqat local development / test bazasida ishlatilishi lozim. Production database'ga test ma'lumotlarini kiritmang. Seed script `NODE_ENV=production` bo'lganda xatolik chiqaradi.

Seed tomonidan yaratiladigan demo hisoblar (faqat lokal test uchun):

| Rol | Email | Parol |
|---|---|---|
| Admin | `admin@stadium.local` | `Admin123!` |
| Owner | `owner1@stadium.local` | `Owner123!` |
| Owner | `owner2@stadium.local` | `Owner123!` |
| User | `user1@stadium.local` | `User123!` |
| User | `user2@stadium.local` | `User123!` |
| User | `user3@stadium.local` | `User123!` |

Seed script idempotent bo‘lishi uchun mavjud demo email, stadium (owner + name), field (stadium + name) yozuvlarini avval tekshiradi va mavjudlarini qayta yaratmaydi. Mavjud foydalanuvchilarning paroli, roli yoki profili hamda mavjud stadion/maydon ma’lumotlari seed tomonidan qayta yozilmaydi. Working Hours uchun schema'dagi `@@unique([fieldId, dayOfWeek])` kalitiga mos `upsert` ishlatiladi; mavjud ish jadvali o‘zgartirilmaydi.

Xavfsizlik: seed `NODE_ENV=production` bo‘lsa to‘xtaydi va `DATABASE_URL` hosti `localhost`, `127.0.0.1`, `::1`, `postgres` yoki `host.docker.internal` bo‘lmasa ham, standart holatda to‘xtaydi. `ALLOW_NON_LOCAL_DB=true` himoyani chetlab o‘tishi mumkin; uni faqat database aynan development/test uchun ekanini mustaqil tekshirganingizdan keyin qo‘ying. Hech qachon production bazada seed ishlatmang.

## G. Backendni ishga tushirish

Avval dependency'larni o'rnating:

```bash
npm install
```

Lokal development rejimida:

```bash
npm run start:dev
```

Agar build qilish kerak bo'lsa:

```bash
npm run build
```

Production-like start:

```bash
npm run start:prod
```

> `src/main.ts` da `app.setGlobalPrefix('api')` ishlatilgan. Demak, backend API endpointlari `/api/...` ko'rinishida ishlaydi.

## H. Swagger API hujjatlari

Swagger konfiguratsiyasi `src/main.ts` faylida sozlangan. U quyidagi URL orqali ochiladi:

```text
http://localhost:3000/api/docs
```

Haqiqiy endpointlar `/api` prefiksi ostida bo'ladi. Masalan auth endpointlari:

```text
http://localhost:3000/api/auth/login
http://localhost:3000/api/auth/register
```

## I. Postman Collection

Proyektda Postman collection va environment fayllari mavjud:

- `postman/Football-Stadium-Booking-API.postman_collection.json`
- `postman/Football-Stadium-Booking-API.postman_environment.json`

Ularni Postman'ga import qiling:

1. Postman ni oching
2. Import -> File
3. `postman/Football-Stadium-Booking-API.postman_collection.json` ni tanlang
4. `postman/Football-Stadium-Booking-API.postman_environment.json` ni ham import qiling

Environment sozlamalari:

- `baseUrl` = `http://localhost:3000`
- `token` = login bo'lgandan keyin avtomatik to'ldiriladi
- `refreshToken` = refresh token uchun ishlatiladi
- `userId`, `stadiumId`, `fieldId`, `bookingId`, `paymentId` = kerak bo'lganda to'ldiriladi

Login qilishdan so'ng, Postman auth tokenini ishlatib protected endpointlarga murojaat qilishingiz mumkin.

## J1. Concurrent booking testi va CI

Booking conflict / double-booking himoyasini tekshirish uchun alohida skript mavjud:

```bash
npm run test:booking-conflict
```

Ushbu skript `test/booking-conflict.e2e-spec.ts` faylini `jest-e2e` konfiguratsiyasi bilan ishga tushiradi. Test ikkita parallel booking so'rovini yuboradi va quyidagilarni tekshiradi:

- faqat bittasi muvaffaqiyatli bo'lishi kerak;
- ikkinchisi `409 Conflict` va `BOOKING_CONFLICT` qaytarishi kerak;
- database'da shu field va vaqt oralig'i uchun faqat bitta booking mavjud bo'lishi kerak.

Agar booking engine o'zgartirilsa yoki Prisma schema/migration o'zgargan bo'lsa, quyidagi holatlarda ushbu testni qayta ishlatish kerak:

- booking service/controller o'zgartirilganda;
- Prisma schema yoki migrationlar o'zgartirilganda;
- pull requestdan oldin;
- booking conflict bug'ini tuzatsangiz.

## J. Muammolarni hal qilish

| Muammo | Sabab | Yechim |
|---|---|---|
| Docker daemon ishlamayapti | Docker Desktop yoki daemon ishlamayotgan | Docker Desktop ni ishga tushiring va `docker ps` bilan tekshiring |
| `DATABASE_URL` noto'g'ri | `.env` yoki connection string xato | `.env.example` ni `.env` ga ko'chiring va `DATABASE_URL` ni tekshiring |
| PostgreSQL ulanishi muvaffaqiyatsiz | DB ishlamayapti yoki port mos kelmayapti | `docker compose ps` yoki `pg_isready` ni tekshiring; `5433`/`5432` portlarini solishtiring |
| Prisma migration xatosi | Migrate holati yoki schema mos kelmayapti | `npx prisma validate`, `npx prisma migrate status`, keyin `npx prisma migrate deploy` ishlating |
| Port band | `3000` yoki `5433` allaqachon ishlatilmoqda | `netstat -ano | findstr :3000` yoki Docker portlarni tekshiring |
| Environment variable topilmadi | `.env` yaratilmagan yoki yozuvlar yetishmayapti | `.env.example` dan nusxa oling: `cp .env.example .env` |
| TypeScript build xatosi | Dependency yoki kode xatosi | `npm install` qilib, keyin `npm run build` ni qayta ishlating |
| JWT secret topilmadi | `.env` da `JWT_ACCESS_SECRET` yoki `JWT_REFRESH_SECRET` yo'q | `.env` da kerakli secretlarni yozing |
| `PrismaClient` eski | Prisma generate qilinmagan | `npx prisma generate` |

## K. Loyiha tuzilishi

Asosiy papkalar va fayllar:

```text
.
├── .env.example               # environment namuna fayli
├── .gitignore                 # maxfiy va build fayllarini qamrab oladi
├── Dockerfile                 # backend image uchun multi-stage build
├── docker-compose.yml         # PostgreSQL + backend servicelarini birgalikda boshqaradi
├── package.json               # scripts va dependency'lar
├── prisma/
│   ├── schema.prisma          # Prisma model va datasource konfiguratsiyasi
│   ├── seed.ts                # ma'lumotlarni to'ldirish uchun seed skripti
│   └── migrations/            # mavjud Prisma migratsiyalari
├── scripts/
│   └── prisma-dev-guard.js    # local dev uchun xavfsizlik tekshiruvi
├── src/
│   ├── app.module.ts          # app modulni birlashtiruvchi fayl
│   ├── main.ts                # NestJS bootstrap, Swagger, CORS, ValidationPipe
│   ├── auth/                  # autentifikatsiya va JWT
│   ├── users/                 # foydalanuvchi boshqaruvi
│   ├── stadiums/              # stadionlar
│   ├── fields/                # maydonlar va ishlash soatlari
│   ├── availability/          # mavjudlik hisoblashlari
│   ├── bookings/              # bron qilish logikasi
│   ├── payments/              # to'lovlar va webhooklar
│   ├── common/                # guardlar, filterlar, decorators, error kodlari
│   └── prisma/                # PrismaService
├── postman/
│   ├── Football-Stadium-Booking-API.postman_collection.json
│   └── Football-Stadium-Booking-API.postman_environment.json
├── test/
│   ├── booking-conflict.e2e-spec.ts
│   └── jest-e2e.json
├── README.md
└── nest-cli.json
```

## Ishga tushirishning tezkor ko'rsatma

Agar yangi dasturchi loyiha papkasini bo'shatib olgan bo'lsa, quyidagi ketma-ketlikni bajarishi kifoya:

```bash
git clone [REPOSITORY_URL]
cd football_stadium_booking
Copy-Item .env.example .env
npm install
npx prisma generate
npx prisma migrate deploy
npm run start:dev
```

Yoki Docker bilan:

```bash
git clone [REPOSITORY_URL]
cd football_stadium_booking
Copy-Item .env.example .env
docker compose up -d --build
docker compose ps
```

Keyin brauzerda quyidagi manzilni oching:

```text
http://localhost:3000/api/docs
```

Bu loyiha uchun loyiha kodiga asoslangan holda tayyorlangan README bo'lib, oldingi tavsiyalar va env variable'lar haqiqiy konfiguratsiyaga mos keladi.