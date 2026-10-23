# Frontend uchun ishga tushirish yo'riqnomasi

Ushbu hujjat loyiha ichidagi haqiqiy kodga asoslanadi: `src/main.ts`, `src/app.module.ts`, `src/auth/*`, `src/stadiums/*`, `src/fields/*`, `src/bookings/*`, `src/payments/*`, `docker-compose.yml`, `package.json`, `.env.example` va Prisma schema.

> Eslatma: loyiha ichida ba'zi endpointlar controller orqali aniqlangan bo'lsa-da, ba'zi service metodlari hali `TODO` holatida qolgan. Bunday endpointlar frontend uchun "ishlatishdan oldin tekshirish" kerak. Bunda ma'lumotlar haqiqiy koddan olingan.

## 1. Backendni ishga tushirish

### 1.1 Kerakli dasturlar va versiyalar

- Git
- Node.js 20.x va npm
- Docker Desktop + Docker Compose v2
- PostgreSQL 16 (Docker orqali avtomatik ishlaydi)

Bu loyiha `package.json` da quyidagilar bilan ishlaydi:

- `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`: NestJS 10
- `@prisma/client`: Prisma 6
- `@nestjs/swagger`: Swagger/OpenAPI
- TypeScript 5

### 1.2 Loyihani klonlash

Windows PowerShell:

```powershell
git clone <repo-url>
cd D:\Projects\football_stadium_booking
```

### 1.3 `.env` yaratish

Loyiha ildizida `.env.example` fayli mavjud. Uni `.env` ga ko'chiring:

```powershell
Copy-Item .env.example .env
```

Asosiy environment variable'lar (`.env.example` dan olingan haqiqiy ro'yxat):

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/stadium_db"
JWT_ACCESS_SECRET="replace-with-a-long-random-secret"
JWT_REFRESH_SECRET="replace-with-a-long-random-refresh-secret"
PORT=3000
CORS_ORIGIN="http://localhost:5173"
NODE_ENV="development"
POSTGRES_DB="stadium_db"
POSTGRES_USER="postgres"
POSTGRES_PASSWORD="postgres"
POSTGRES_PORT=5433
PAYMENT_WEBHOOK_SECRET="replace-with-payment-webhook-secret"
```

> `JWT_ACCESS_SECRET` va `JWT_REFRESH_SECRET` haqiqiy maxfiy qiymatlar bo'lishi kerak. `.env` faylini Git'ga qo'shmang.

### 1.4 Docker orqali PostgreSQL ni ishga tushirish

Loyihada `docker-compose.yml` mavjud:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "${POSTGRES_PORT:-5433}:5432"
```

Ishga tushirish:

```powershell
docker compose up -d postgres
```

Statusni ko'rish:

```powershell
docker compose ps
```

Agar kerak bo'lsa loglarni ko'rish:

```powershell
docker compose logs -f postgres
```

### 1.5 Dependency'larni o'rnatish

```powershell
npm install
```

### 1.6 Prisma migration va schema tekshirish

```powershell
npx prisma generate
npx prisma migrate deploy
```

Agar local development uchun migration yaratish kerak bo'lsa:

```powershell
npx prisma migrate dev
```

Seed ishlatish uchun (agar loyiha boshqarish uchun demo ma'lumot kerak bo'lsa):

```powershell
npx prisma db seed
```

### 1.7 Backendni ishga tushirish

```powershell
npm run start:dev
```

Agar build qilish kerak bo'lsa:

```powershell
npm run build
```

### 1.8 Ishlayotganini tekshirish

Backend ishlayotganda, server default port `3000` da eshitadi (yoki `PORT` env orqali o'zgartirilgan bo'lsa):

```powershell
curl http://localhost:3000/api/health
```

> `health` endpoint bu loyihada mavjud emas. Haqiqiy tekshirish usuli: Swagger yoki login endpointiga so'rov yuborish. Agar error borsa, API server ishlayotganini ma'lum qiladi.

Front-end uchun eng ishonchli tekshirish:

- Swagger URL: `http://localhost:3000/api/docs`
- login endpoint: `POST http://localhost:3000/api/auth/login`

---

## 2. API manzillari

### 2.1 Base URL

Loyihada `src/main.ts` da quyidagi sozlama mavjud:

```ts
app.setGlobalPrefix('api');
```

Shuning uchun baseURL haqiqiy holda:

```text
http://localhost:3000/api
```

### 2.2 Port

- Default port: `3000`
- Port `PORT` environment variable orqali o'zgartiriladi.

### 2.3 Swagger URL

```text
http://localhost:3000/api/docs
```

`src/main.ts` da Swagger sozlamalari quyidagicha:

```ts
const config = new DocumentBuilder()
  .setTitle('Football Stadium Booking API')
  .setDescription('Football mini stadium booking platform backend')
  .setVersion('1.0')
  .addBearerAuth()
  .build();

SwaggerModule.setup('api/docs', app, document);
```

### 2.4 Frontend konfiguratsiyasi

Frontend `baseURL` ni quyidagicha sozlash tavsiya etiladi:

```ts
const API_BASE_URL = 'http://localhost:3000/api';
```

Agar `CORS_ORIGIN` sozlangan bo'lsa (`http://localhost:5173`), frontend local dev uchun bu qiymat mos keladi.

### 2.5 Staging / production

Repo ichida staging yoki production konfiguratsiyasi ko'rinmadi. Shuning uchun bu loyiha uchun hozircha tekshirish muhiti faqat local development hisoblanadi. Frontend dasturchi `staging` yoki `production` baseURL yo'qligi aytilgan bo'lsa, uni `localhost` konfiguratsiyasiga moslashtirish kerak.

---

## 3. Autentifikatsiya

### 3.1 Auth endpointlari

Loyihaning haqiqiy auth controlleri `src/auth/auth.controller.ts` dagi endpointlar:

| Method | Endpoint | Auth | Role | Maqsad |
|---|---|---|---|---|
| `POST` | `/api/auth/register` | No | - | Ro'yxatdan o'tish |
| `POST` | `/api/auth/login` | No | - | Login qilish |
| `POST` | `/api/auth/refresh` | No | - | Refresh token bilan yangi access token olish |
| `GET` | `/api/auth/me` | Yes (`JWT`) | - | Joriy foydalanuvchi ma'lumoti |
| `POST` | `/api/auth/logout` | Yes (`JWT`) | - | Tokenni bekor qilish |
| `POST` | `/api/auth/change-password` | Yes (`JWT`) | - | Parolni o'zgartirish |

### 3.2 Request namunalari

#### Register

`POST /api/auth/register`

```json
{
  "email": "user@example.com",
  "phone": "+998901234567",
  "password": "StrongPass123",
  "firstName": "Ali",
  "lastName": "Valiyev"
}
```

`RegisterDto` dagi validation:

- `email`: valid email
- `phone`: ixtiyoriy, agar berilsa `+998XXXXXXXXX` formati bo'lishi kerak
- `password`: kamida 8 ta belgi, 1 kichik, 1 katta harf va 1 raqam talab etiladi
- `firstName`, `lastName`: 2-50 belgidan iborat

#### Login

`POST /api/auth/login`

```json
{
  "email": "user@example.com",
  "password": "StrongPass123"
}
```

#### Refresh

`POST /api/auth/refresh`

```json
{
  "refreshToken": "<refresh_token>"
}
```

#### Change password

`POST /api/auth/change-password`

Header:

```http
Authorization: Bearer <access_token>
```

Body:

```json
{
  "oldPassword": "OldStrongPass1",
  "newPassword": "NewStrongPass2"
}
```

### 3.3 Login response namunalari

`AuthService.login()` javobi:

```json
{
  "user": {
    "id": "<uuid>",
    "email": "user@example.com"
  },
  "accessToken": "<jwt_access_token>",
  "refreshToken": "<refresh_token>"
}
```

`refresh()` javobi:

```json
{
  "accessToken": "<new_jwt_access_token>"
}
```

### 3.4 JWT ishlatilishi

Loyiha JWT access token ishlatadi. Guard va strategy quyidagicha: `JwtAuthGuard` + `JwtStrategy`.

Header format:

```http
Authorization: Bearer <access_token>
```

Token ichidan `sub` (userId) va `role` olinadi. `AuthModule` da token muddati `15m` sifatida sozlangan:

```ts
signOptions: { expiresIn: '15m' }
```

Refresh token muddati app-level default bo'yicha 30 kun, lekin bu qiymat `README.md` da ko'rsatilgan va `.env.example` da `JWT_REFRESH_TTL="30d"` deb qayd etilgan.

### 3.5 Refresh token mexanizmi

- Login vaqtida backend `refreshToken` yaratadi.
- Refresh token `crypto.randomBytes(40)` dan yaratiladi.
- Hashi `RefreshToken` modelida saqlanadi (`tokenHash`).
- `refresh()` endpoint `refreshToken` ni qabul qilib, tokenChecksum orqali tekshiradi.
- Yaroqsiz, eskirgan yoki revoked tokenlar uchun `401 AUTH_TOKEN_EXPIRED` qaytariladi.

### 3.6 Token muddati tugaganda nima qilish kerak?

- Access token `15m` tugaganda frontend avval `refresh` endpointiga `refreshToken` bilan so'rov yuboradi.
- Agar refresh token ham eskirgan bo'lsa, foydalanuvchi qayta login bo'lishi kerak.
- Frontend login ekranida `401` yoki `AUTH_TOKEN_EXPIRED` holatlarini boshqarishi kerak.

---

## 4. API endpointlari

### 4.1 Users moduli

`UsersController` (`src/users/users.controller.ts`):

| Method | Endpoint | Auth | Role | Maqsad |
|---|---|---|---|---|
| `GET` | `/api/users/me` | Yes | - | Joriy profil |
| `PATCH` | `/api/users/me` | Yes | - | Profilni yangilash |
| `GET` | `/api/admin/users` | Yes | `ADMIN` | Barcha foydalanuvchilar ro'yxati |
| `PATCH` | `/api/admin/users/:id/block` | Yes | `ADMIN` | Foydalanuvchi statusini o'zgartirish |

### 4.2 Stadiums moduli

`StadiumsController` (`src/stadiums/stadiums.controller.ts`):

| Method | Endpoint | Auth | Role | Maqsad |
|---|---|---|---|---|
| `POST` | `/api/stadiums` | Yes | - | Stadion yaratish |
| `GET` | `/api/stadiums` | Optional JWT | - | Stadion ro'yxati |
| `GET` | `/api/stadiums/admin/stadiums` | Yes | `ADMIN` | Admin uchun moderatsiya ro'yxati |
| `GET` | `/api/stadiums/:id` | Optional JWT | - | Stadion ma'lumoti |
| `PATCH` | `/api/stadiums/:id` | Yes | `OWNER`, `ADMIN` | Stadionni yangilash |
| `PATCH` | `/api/stadiums/admin/stadiums/:id/approve` | Yes | `ADMIN` | Stadionni tasdiqlash |
| `DELETE` | `/api/stadiums/:id` | Yes | `OWNER`, `ADMIN` | Soft delete |
| `POST` | `/api/stadiums/:id/submit` | Yes | - | Stadionni moderatsiyaga yuborish |

`CreateStadiumDto` dagi asosiy maydonlar:

```json
{
  "name": "Bunyodkor Stadium",
  "description": "Zamonaviy mini-stadion",
  "address": "Chilonzor 10-mavze",
  "latitude": 41.2995,
  "longitude": 69.2401,
  "phone": "+998901234567"
}
```

Stadium statuslari Prisma schema dan:

```text
DRAFT, PENDING, ACTIVE, ARCHIVED, REJECTED
```

### 4.3 Fields moduli

`FieldsController` (`src/fields/fields.controller.ts`):

| Method | Endpoint | Auth | Role | Maqsad |
|---|---|---|---|---|
| `POST` | `/api/stadiums/:stadiumId/fields` | Yes | - | Field yaratish |
| `GET` | `/api/stadiums/:stadiumId/fields` | No | - | Stadium bo'yicha fieldlar |
| `GET` | `/api/fields/:id` | No | - | Field ma'lumoti |
| `PATCH` | `/api/fields/:id` | Yes | - | Fieldni yangilash |
| `PUT` | `/api/fields/:id/working-hours` | Yes | - | Ish vaqtlari |
| `GET` | `/api/fields/:id/working-hours` | No | - | Ish vaqtlari ko'rish |
| `DELETE` | `/api/fields/:id` | Yes | - | Soft delete |

> Muhim: `src/fields/fields.service.ts` da ba'zi metodlar hali `throw new Error('TODO ...')` holatida qolgan. Demak, bu endpointlar real ishlashdan oldin implementatsiya talab etadi. Frontend ularni ishlatmasdan oldin backenddan yakuniy holatini tekshirish kerak.

`CreateFieldDto` asosiy maydonlari:

```json
{
  "name": "Mini Football 5x5",
  "fieldType": "INDOOR",
  "capacity": 10,
  "size": "25x15 m",
  "pricePerHour": 200000
}
```

`fieldType` bo'yicha enum qiymatlari:

```text
INDOOR
OUTDOOR
NATURAL_GRASS
ARTIFICIAL_GRASS
```

`WorkingHourDto`:

```json
{
  "dayOfWeek": 1,
  "openTime": "09:00",
  "closeTime": "23:00",
  "isClosed": false
}
```

`dayOfWeek`:

```text
0 = Yakshanba, ..., 6 = Shanba
```

### 4.4 Availability moduli

`AvailabilityController` (`src/availability/availability.controller.ts`):

| Method | Endpoint | Auth | Role | Maqsad |
|---|---|---|---|---|
| `GET` | `/api/fields/:id/availability` | No | - | Field bo'yicha band/bo'sh slotlar |

Query param:

```text
?date=2026-10-23
```

### 4.5 Bookings moduli

`BookingsController` (`src/bookings/bookings.controller.ts`):

| Method | Endpoint | Auth | Role | Maqsad |
|---|---|---|---|---|
| `POST` | `/api/bookings` | Yes | - | Bron yaratish |
| `GET` | `/api/bookings/:id` | Yes | - | Bron ma'lumoti |
| `POST` | `/api/bookings/:id/cancel` | Yes | - | Bronni bekor qilish |

`CreateBookingDto`:

```json
{
  "fieldId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "startTime": "2026-10-22T09:00:00.000Z",
  "endTime": "2026-10-22T10:00:00.000Z"
}
```

Booking statuslari:

```text
PENDING,
PAYMENT_PENDING,
CONFIRMED,
CANCELLED,
COMPLETED,
EXPIRED,
NO_SHOW,
REJECTED
```

#### Booking conflict holati

`BookingsService.create()` da bo'shliq tekshiriladi. Agar bir xil field uchun vaqt oralig'i band bo'lsa:

```json
{
  "success": false,
  "statusCode": 409,
  "message": "Ushbu vaqt oralig‘i band qilingan",
  "error": "BOOKING_CONFLICT",
  "timestamp": "2026-10-23T00:00:00.000Z",
  "path": "/api/bookings"
}
```

Frontendda bu holatni "tanlangan vaqt mavjud emas" tarzida ko'rsatish maqsadga muvofiq.

### 4.6 Payments moduli

`PaymentsController` (`src/payments/payments.controller.ts`):

| Method | Endpoint | Auth | Role | Maqsad |
|---|---|---|---|---|
| `GET` | `/api/payments/:id` | Yes | `ADMIN`, owner, booking owner | To'lov statusini ko'rish |

`findOne()` faqat booking owner, stadium owner yoki admin uchun ishlaydi.

`InitiatePaymentDto`:

```json
{
  "bookingId": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
```

> Hozirgi kodda `src/payments/payments.service.ts` da `initiatePayment` metodi qo'shilgan bo'lsa-da, `PaymentsController` joriy holatda faqat `findOne` orqali statusni ko'rish imkonini beradi. Frontend uchun to'lovni boshlash yoki webhooklarni to'liq ishlatish jarayonini backend bilan birgalikda sinash kerak.

### 4.7 Admin / Owner role'lari

Rollar Prisma modelidan kelib chiqadi:

```text
ADMIN, OWNER, USER
```

`RolesGuard` orqali endpointlar ruxsatga tekshiriladi.

Misol:

- `@Roles('ADMIN')` → faqat admin
- `@Roles('OWNER', 'ADMIN')` → owner yoki admin

### 4.8 JSON response formatlari

Loyiha barcha exception'lar uchun umumiy format mavjud:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Noto'g'ri sana format",
  "error": "VALIDATION_ERROR",
  "timestamp": "2026-10-23T12:00:00.000Z",
  "path": "/api/auth/login"
}
```

Muvaffaqiyatli response'lar service tomonidan qaytarilgan obyektlar bo'ladi. Misol:

```json
{
  "user": {
    "id": "...",
    "email": "user@example.com"
  },
  "accessToken": "...",
  "refreshToken": "..."
}
```

---

## 5. Xatolarni qayta ishlash

### 5.1 Umumiy status kodlari

Loyihada asosan quyidagi holatlar ishlatiladi:

- `200 OK` — muvaffaqiyatli so'rov
- `201 Created` — yangi obyekt yaratildi
- `204 No Content` — muvaffaqiyatli, body yo'q
- `400 Bad Request` — validation / noto'g'ri ma'lumot
- `401 Unauthorized` — token yo'q yoki yaroqsiz
- `403 Forbidden` — rol yoki huquq cheklovlari
- `404 Not Found` — topilmadi
- `409 Conflict` — konflikt / biznes holat xatosi
- `500 Internal Server Error` — kutilmagan server xatosi

### 5.2 Frontendda qanday ko'rsatish kerak

- `400` → form validation xatosi ko'rsatish
- `401` → "sessiya tugadi", login ekraniga qaytarish
- `403` → "bu amalga ruxsat yo'q" dialogi
- `404` → "ma'lumot topilmadi" banner
- `409` → konflikt, tanlangan vaqt yoki stadium holati haqida xabar
- `500` → umumiy "server xatosi" ko'rsatish

### 5.3 Booking conflict misoli

Booking holatida umumiy xato:

```json
{
  "error": "BOOKING_CONFLICT",
  "message": "Ushbu vaqt oralig‘i band qilingan"
}
```

Frontendda:

```ts
if (error.response?.status === 409) {
  // tanlangan vaqtni qayta tanlash 
}
```

---

## 6. CORS va ulanish muammolari

### 6.1 CORS sozlamalari

`src/main.ts` da quyidagicha sozlangan:

```ts
app.enableCors({
  origin: process.env.CORS_ORIGIN?.split(',').map((origin) => origin.trim()) ?? true,
  credentials: true,
});
```

Demak, frontend `CORS_ORIGIN` muvofiq bo'lishi kerak. `.env.example` da aniq qiymat:

```env
CORS_ORIGIN="http://localhost:5173"
```

### 6.2 Frontend local manzilini to'g'ri sozlash

Agar frontend Vite ishlatsa, `.env.local` yoki `vite.config.ts` da:

```ts
VITE_API_BASE_URL=http://localhost:3000/api
```

Agar `VITE_API_BASE_URL` noto'g'ri bo'lsa yoki backend ishlamayotgan bo'lsa, CORS yoki `fetch` xatolari paydo bo'ladi.

### 6.3 Umumiy muammolar va yechimlar

#### 1) Backend ishlamayapti

Tekshirish:

```powershell
npm run start:dev
```

Agar PostgreSQL ulanmagan bo'lsa, avval bazani ishga tushirish kerak:

```powershell
docker compose up -d postgres
```

#### 2) `401 Unauthorized`

- `Authorization` header mavjudmi?
- Token muddati tugaganmi?
- `accessToken` to'g'ri kelayaptimi?
- Refresh token bilan yangi JWT olish kerakmi?

#### 3) `403 Forbidden`

- Foydalanuvchi roli mos keladimi?
- `ADMIN` yoki `OWNER` role bo'lishi kerak.

#### 4) `CORS` xatosi

- `CORS_ORIGIN` ni frontend portiga moslashtirish
- `credentials: true` bilan `Authorization` header ishlatilganda origin mos bo'lishi kerak

---

## 7. Frontend uchun amaliy misol

### 7.1 `fetch` orqali login qilish

```ts
const response = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'StrongPass123',
  }),
});

const data = await response.json();

if (!response.ok) {
  throw new Error(data.message || 'Login failed');
}

const { accessToken, refreshToken } = data;
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('refreshToken', refreshToken);
```

### 7.2 Token bilan himoyalangan endpointga so'rov

```ts
const accessToken = localStorage.getItem('accessToken');

const response = await fetch('http://localhost:3000/api/users/me', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  },
});

const data = await response.json();
```

### 7.3 Refresh token bilan yangi token olish

```ts
const refreshToken = localStorage.getItem('refreshToken');

const response = await fetch('http://localhost:3000/api/auth/refresh', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ refreshToken }),
});

const data = await response.json();

if (response.ok) {
  localStorage.setItem('accessToken', data.accessToken);
}
```

### 7.4 Loading / success / error holatlari

```ts
async function login() {
  try {
    setLoading(true);
    setError('');

    const res = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'user@example.com',
        password: 'StrongPass123',
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Login failed');
    }

    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setSuccess(true);
  } catch (err: any) {
    setError(err.message || 'Noma’lum xatolik');
  } finally {
    setLoading(false);
  }
}
```

---

## 8. Tekshirish ro'yxati

Frontend dasturchi quyidagi tekshiruvlarni bajarishi kerak:

- [ ] PostgreSQL ishlayotganligini tekshirish
- [ ] `.env` fayli to'g'ri yaratilganligiga ishonch hosil qilish
- [ ] `npm install` ishlaganligi
- [ ] `npm run start:dev` bilan backend ishga tushganligi
- [ ] `http://localhost:3000/api/docs` ochilganligi
- [ ] Login endpoint ishlayotganligi
- [ ] `Authorization: Bearer <token>` bilan himoyalangan endpoint ishlayotganligi
- [ ] `CORS_ORIGIN` frontend portiga mos kelganligi
- [ ] `baseURL` `http://localhost:3000/api` bo'lganligi

---

## 9. Aniqlangan muhim kamchiliklar

Quyidagi ma'lumotlar real kodga ko'ra tasdiqlangan, lekin frontend integratsiyasi uchun alohida e'tibor kerak:

1. `src/fields/fields.service.ts` da `create`, `findByStadium`, `findOne`, `update`, `setWorkingHours`, `getWorkingHours`, `remove` metodlari hali `TODO` bo'lib qolgan.
   - Bu demakki, `FieldsController` endpointlari mavjud, lekin backend funksionalligi to'liq bajarilmagan.
   - Frontend bu endpointlarni ishlatmasdan oldin backendning yakuniy holatini tekshirish kerak.

2. Staging yoki production environment konfiguratsiyasi repo ichida ko'rinmadi.
   - Shuning uchun ma'lumotlar local dev uchun yozilgan.

3. `docker-compose.yml` da faqat PostgreSQL service mavjud.
   - Backend image container manual yoki local run orqali boshlanadi.

4. `README.md` va `.env.example` ning ma'lumotlari asosiy manba bo'lib hisoblanadi.
   - Hech qanday maxfiy qiymat hujjatga kiritilmagan.

---

## 10. Xulosa

Frontend dasturchi ma'lumotlarni professional tarzda ishlatish uchun quyidagi asosiy qiymatlar mavjud:

```text
Base URL: http://localhost:3000/api
Swagger: http://localhost:3000/api/docs
CORS origin: http://localhost:5173
DB host: localhost:5433
JWT access token header: Authorization: Bearer <token>
```

Agar backend ishlayotgan bo'lsa, frontend ushbu endpointlar bilan ishlashga tayyor bo'ladi. Ammo `Fields` moduli endpointlari backend tayyor bo'lguncha "TODO" holatiga e'tibor berish kerak.

Bu hujjat `README.md`, `package.json`, `docker-compose.yml`, `.env.example`, controller va guard kodlari asosida tuzilgan.
