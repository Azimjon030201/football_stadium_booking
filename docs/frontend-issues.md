# Frontend Issues Tracking Guide

## 1. Maqsad

Bu hujjat frontend dasturchilaridan keladigan API bilan bog‘liq muammolarni yig‘ish, toifalarga ajratish, tegishli squad yoki mas’ulga yo‘naltirish va yechimni kuzatib borish uchun ishlatiladi.

> Asosiy tamoyil: frontend’dan kelgan har qanday muammo javobsiz qolmasligi kerak. Muammo qabul qilingandan keyin uni tegishli jamoaga yo‘naltirish, holatini kuzatish va yechimni tasdiqlash lozim.

## 2. Loyihaning haqiqiy API tuzilishi

Loyihaning real arxitekturasi quyidagicha:

- Global prefix: `/api`
- Swagger: `/api/docs`
- Auth: `/api/auth/*`
- Stadiums: `/api/stadiums/*`
- Fields: `/api/stadiums/:stadiumId/fields`, `/api/fields/:id*`
- Bookings: `/api/bookings/*`
- Payments: `/api/payments/*`

### Asosiy endpointlar

#### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/auth/change-password`

#### Stadium / Field
- `POST /api/stadiums`
- `GET /api/stadiums`
- `GET /api/stadiums/:id`
- `PATCH /api/stadiums/:id`
- `POST /api/stadiums/:id/submit`
- `PATCH /api/stadiums/admin/stadiums/:id/approve`
- `POST /api/stadiums/:stadiumId/fields`
- `GET /api/stadiums/:stadiumId/fields`
- `GET /api/fields/:id`
- `PATCH /api/fields/:id`
- `PUT /api/fields/:id/working-hours`
- `GET /api/fields/:id/working-hours`
- `DELETE /api/fields/:id`

#### Booking
- `POST /api/bookings`
- `GET /api/bookings/:id`
- `POST /api/bookings/:id/cancel`

#### Payment
- `POST /api/payments/initiate`
- `GET /api/payments/:id`
- `POST /api/payments/webhook/:provider`

#### Swagger
- `GET /api/docs`

## 3. Muammo toifalari va mas’ul squadlar

| Toifa | Mas’ul bo‘lim / squad | Masalalar | Misol endpointlar |
|---|---|---|---|
| AUTH | Auth squad | register/login/JWT/refresh/logout/role/access | `/api/auth/login`, `/api/auth/refresh` |
| STADIUM_FIELD | Stadium / Field squad | stadium create/update/list, field working hours, ownership, status | `/api/stadiums`, `/api/stadiums/:id`, `/api/fields/:id/working-hours` |
| BOOKING | Booking squad | booking create, conflict, status, cancellation | `/api/bookings`, `/api/bookings/:id/cancel` |
| PAYMENT | Payment squad | payment initiate, webhook, status, refund flow | `/api/payments/initiate`, `/api/payments/webhook/:provider` |
| API_SWAGGER | Backend / API docs squad | request/response mismatch, Swagger gaps, missing examples | `/api/docs` |
| INFRASTRUCTURE | DevOps / Backend mas’ul | Docker, DB, env, server start, port issue | `docker compose`, `DATABASE_URL`, PostgreSQL |

### Yo‘naltirish qoidalari
- Auth mavzulari bo‘lsa — Auth squadga yuborish.
- Stadium va Field bilan bog‘liq bo‘lsa — Stadium / Field squadga yuborish.
- Booking va double-booking holatlari bo‘lsa — Booking squadga yuborish.
- Payment webhook / payment status bo‘lsa — Payment squadga yuborish.
- Server ishlamayapti, port/DB/env problem bo‘lsa — DevOps yoki backend mas’uliga yuborish.
- Agar squad noma’lum bo‘lsa, “Backend mas’uli” yoki “tegishli squad” deb yozish mumkin. 

## 4. Muammo yozish formati

Har bir muammo uchun quyidagi maydonlar talab qilinadi:

- Issue ID
- Sana
- Frontend dasturchi / reporter
- Muammo nomi
- Category
- Endpoint va method
- Kutilgan natija
- Haqiqiy natija
- HTTP status code
- Xato xabari
- Mas’ul squad
- Status
- Repro steps
- Next action
- Verification

### Standart template

```text
ISSUE_ID: F-001
DATE: 2026-10-23
REPORTER: Frontend developer name / team
CATEGORY: AUTH
TITLE: Login endpoint returns 401 despite valid credentials
ENDPOINT: POST /api/auth/login
METHOD: POST
EXPECTED: 200 OK and JWT tokens with valid user object
ACTUAL: 401 Unauthorized with AUTH_INVALID_CREDENTIALS
HTTP_STATUS: 401
ERROR_MESSAGE: AUTH_INVALID_CREDENTIALS
ASSIGNED_SQUAD: Auth squad
STATUS: OPEN
REPRO_STEPS:
  1. Open frontend login form
  2. Enter valid email and password
  3. Submit request
  4. Observe 401 response
NEXT_ACTION: Verify backend credentials, JWT secret, password hash path, and login flow
VERIFICATION: Awaiting auth squad confirmation
```

## 5. Statuslar

- `OPEN` — muammo qabul qilindi, hali yechilmadi.
- `IN_PROGRESS` — mas’ul squad ishlamoqda.
- `BLOCKED` — tashqi yoki boshqa jamoaning ishlashi tufayli to‘xtagan.
- `RESOLVED` — yechim qabul qilindi va tasdiqlandi.

## 6. Issue lifecycle

1. Frontend dasturchi muammoni yuboradi.
2. Backend / project mas’uli muammoni qarab chiqadi.
3. Muammo toifasiga qarab tegishli squadga yo‘naltiriladi.
4. Squad ishlaydi, status `IN_PROGRESS` bo‘ladi.
5. Agar muammo tashqi sababdan bloklanganda, status `BLOCKED` bo‘ladi.
6. Yechim tasdiqlangach, status `RESOLVED` bo‘ladi.
7. Frontend dasturchiga javob beriladi.

## 7. Frontend dasturchiga javob berish shabloni

```text
Salom! Muammoni qabul qildik.

- Muammo: [short title]
- Endpoint: [METHOD /api/endpoint]
- Kategoriya: [AUTH / STADIUM_FIELD / BOOKING / PAYMENT / API_SWAGGER / INFRASTRUCTURE]
- Mas’ul squad: [squad name]
- Joriy holat: [OPEN / IN_PROGRESS / BLOCKED / RESOLVED]
- Keyingi qadam: [brief next step]

Yechim tayyor bo‘lgach, yana tekshirib, natijani front-end bilan bo‘lishamiz.
```

## 8. Muammo misollari

### 8.1 Auth misoli

```text
ISSUE_ID: F-101
DATE: 2026-10-23
CATEGORY: AUTH
TITLE: Login route returns 401 for valid credentials
ENDPOINT: POST /api/auth/login
EXPECTED: 200 OK with accessToken and refreshToken
ACTUAL: 401 Unauthorized
HTTP_STATUS: 401
ERROR_MESSAGE: AUTH_INVALID_CREDENTIALS
ASSIGNED_SQUAD: Auth squad
STATUS: OPEN
REPRO_STEPS:
  1. Use email admin@stadium.local
  2. Submit password Admin123!
  3. Request hits /api/auth/login
NEXT_ACTION: Validate bcrypt compare and JWT secret source
VERIFICATION: Pending
```

### 8.2 Stadium / Field misoli

```text
ISSUE_ID: F-102
DATE: 2026-10-23
CATEGORY: STADIUM_FIELD
TITLE: Stadium list is empty for public users
ENDPOINT: GET /api/stadiums
EXPECTED: ACTIVE stadiums returned for public access
ACTUAL: Empty array or 403 for non-authenticated user
HTTP_STATUS: 200 or 403 depending on logic
ERROR_MESSAGE: FORBIDDEN_RESOURCE or empty response
ASSIGNED_SQUAD: Stadium / Field squad
STATUS: IN_PROGRESS
REPRO_STEPS:
  1. Visit stadium page without token
  2. Call GET /api/stadiums
  3. Check response payload
NEXT_ACTION: Verify OptionalJwtAuthGuard and stadium visibility logic
VERIFICATION: Required after service fix
```

### 8.3 Booking misoli

```text
ISSUE_ID: F-103
DATE: 2026-10-23
CATEGORY: BOOKING
TITLE: Double-booking possible for same field and time
ENDPOINT: POST /api/bookings
EXPECTED: 409 Conflict when time overlaps
ACTUAL: Two bookings accepted for same interval
HTTP_STATUS: 409
ERROR_MESSAGE: BOOKING_CONFLICT
ASSIGNED_SQUAD: Booking squad
STATUS: IN_PROGRESS
REPRO_STEPS:
  1. Create booking A at 18:00-19:00
  2. Create booking B at 18:30-19:30
  3. Observe overlap
NEXT_ACTION: Validate overlap query and transaction locking
VERIFICATION: E2E conflict test required
```

### 8.4 Payment misoli

```text
ISSUE_ID: F-104
DATE: 2026-10-23
CATEGORY: PAYMENT
TITLE: Payment initiation returns invalid state when booking status is pending
ENDPOINT: POST /api/payments/initiate
EXPECTED: payment created with status INITIATED/PENDING
ACTUAL: 400 with BOOKING_INVALID_STATE
HTTP_STATUS: 400
ERROR_MESSAGE: BOOKING_INVALID_STATE
ASSIGNED_SQUAD: Payment squad
STATUS: OPEN
REPRO_STEPS:
  1. Create a booking
  2. Call payment initiate
  3. Review server response
NEXT_ACTION: Validate booking state transition and payment flow
VERIFICATION: Pending payment squad confirmation
```

### 8.5 Infrastructure misoli

```text
ISSUE_ID: F-105
DATE: 2026-10-23
CATEGORY: INFRASTRUCTURE
TITLE: PostgreSQL not reachable from local environment
ENDPOINT: N/A
EXPECTED: Local application can connect to PostgreSQL on localhost:5433
ACTUAL: Prisma cannot reach database server
HTTP_STATUS: N/A
ERROR_MESSAGE: Can't reach database server at localhost:5433
ASSIGNED_SQUAD: DevOps / Backend owner
STATUS: BLOCKED
REPRO_STEPS:
  1. Run Prisma seed or app
  2. Observe DB connection error
NEXT_ACTION: Start Docker/PostgreSQL or check env and port mapping
VERIFICATION: Depends on DB service status
```

## 9. Issue tracking jadvali

| Issue ID | Date | Category | Endpoint | Assigned Squad | Status |
|---|---|---|---|---|---|
| F-101 | 2026-10-23 | AUTH | `POST /api/auth/login` | Auth squad | OPEN |
| F-102 | 2026-10-23 | STADIUM_FIELD | `GET /api/stadiums` | Stadium / Field squad | IN_PROGRESS |
| F-103 | 2026-10-23 | BOOKING | `POST /api/bookings` | Booking squad | IN_PROGRESS |
| F-104 | 2026-10-23 | PAYMENT | `POST /api/payments/initiate` | Payment squad | OPEN |
| F-105 | 2026-10-23 | INFRASTRUCTURE | N/A | DevOps / Backend owner | BLOCKED |

## 10. Frontend muammolari uchun ishlatiladigan umumiy qoidalar

- Har bir muammo uchun xatolik quyidagi tartibda qayd qilinadi: “header + endpoint + expected + actual + status + next action”
- Status faqat tasdiqlangan holatga o‘tkaziladi
- Yechim tayyor bo‘lgach, frontend dasturchisi bilan natija qayta tekshiriladi
- Yechilmagan muammolar doimiy ro‘yxatda qoladi
- Xalqaro yoki tashqi tizim integratsiyasi talab qilinsa, project ichida mavjud ruxsat va arxitekturaga rioya qilinadi
- GitHub Issues yoki boshqa in-repo tracking bo‘lsa, bu hujjatning mazmuni unda ham qayd etilishi mumkin; lekin tashqi platformaga hech qanday ma’lumot yubormaslik kerak

## 11. Yakuniy ko‘rsatma

Bu jarayon quyidagi maqsadga xizmat qiladi:

- frontend xatolarini yig‘ish
- tegishli squadga yo‘naltirish
- har bir muammo uchun javobgarlikni aniqlash
- yechimni kuzatish va resolved statusga olib chiqish
- backend / frontend o‘rtasidagi kommunikatsiyani izchillik bilan saqlash

Loyiha o‘zida haqiqiy endpointlar, auth mexanizmi va squad taqsimoti mavjud bo‘lgani sababli, bu hujjat faqat mavjud arxitektura asosida tuzildi. Yangi endpoint yoki modullar qo‘shish talab etilmagan.
