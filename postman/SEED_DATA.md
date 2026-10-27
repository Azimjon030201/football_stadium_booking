# Seed data bo'yicha frontend yo'riqnomasi

Ushbu hujjat local development uchun tayyorlangan demo ma'lumotlar va login misollarini o'z ichiga oladi.

> Eslatma: bular faqat local development/test muhitlari uchun mo'ljallangan. Hech qachon production yoki real JWT secret bilan ishlatilmang.

## 1. Seed ma'lumotlari

`prisma/seed.ts` fayli quyidagi demo hisoblarni yaratadi:

| Role | Email | Password | Maqsad |
|---|---|---|---|
| ADMIN | `admin@stadium.local` | `Admin123!` | admin paneli va tasdiqlash |
| OWNER | `owner1@stadium.local` | `Owner123!` | 1-chi stadion egasi |
| OWNER | `owner2@stadium.local` | `Owner123!` | 2-chi stadion egasi |
| USER | `user1@stadium.local` | `User123!` | oddiy foydalanuvchi |
| USER | `user2@stadium.local` | `User123!` | oddiy foydalanuvchi |
| USER | `user3@stadium.local` | `User123!` | oddiy foydalanuvchi |

Seed scripti shu bilan birga:

- 3 ta ACTIVE stadion yaratadi
- Har bir stadion uchun 2 ta field yaratiladi
- Har bir field uchun 7 kunlik ish vaqtlari (working hours) yaratiladi
- Takroriy seed ishlaganda ma'lumotlarni ortiqcha kiritmaydi
- Parollar `bcrypt` bilan hash qilinadi

## 2. Seed yaratish buyruqlari

Loyiha ildizida:

```bash
npx prisma generate
npx prisma db seed
```

Yoki quyidagi skript:

```bash
npm run seed
```

## 3. Local muhitda login qilish

### Admin login

```json
{
  "email": "admin@stadium.local",
  "password": "Admin123!"
}
```

### Owner login

```json
{
  "email": "owner1@stadium.local",
  "password": "Owner123!"
}
```

### User login

```json
{
  "email": "user1@stadium.local",
  "password": "User123!"
}
```

Agar backend ishlayotgan bo'lsa, login javobi quyidagicha bo'ladi:

```json
{
  "user": {
    "id": "...",
    "email": "admin@stadium.local"
  },
  "accessToken": "...",
  "refreshToken": "..."
}
```

Tokenni keyingi so'rovlarda headerga qo'shing:

```http
Authorization: Bearer <accessToken>
```

## 4. Stadion va fieldlarni topish

### Barcha stadionlar ro'yxati

```http
GET http://localhost:3000/api/stadiums
```

### Bitta stadion ma'lumoti

```http
GET http://localhost:3000/api/stadiums/:id
```

### Stadion bo'yicha fieldlar

```http
GET http://localhost:3000/api/stadiums/:stadiumId/fields
```

### Field detali

```http
GET http://localhost:3000/api/fields/:id
```

### Field mavjudligi

```http
GET http://localhost:3000/api/fields/:id/availability?date=2026-10-23
```

## 5. Booking jarayoni

1. Login qiling.
2. `GET /api/stadiums` dan stadium ID sini oling.
3. `GET /api/stadiums/:stadiumId/fields` dan field ID sini oling.
4. Tanlangan fieldga bron qilish uchun so'rov yuboring:

```json
{
  "fieldId": "<fieldId>",
  "startTime": "2026-10-25T18:00:00.000Z",
  "endTime": "2026-10-25T19:00:00.000Z"
}
```

```http
POST http://localhost:3000/api/bookings
```

5. Bron yaratildi bo'lsa, to'lovni boshlash:

```json
{
  "bookingId": "<bookingId>"
}
```

```http
POST http://localhost:3000/api/payments/initiate
```

## 6. Bog'langan ma'lumotlar va aloqalar

- `User.role` -> `OWNER`, `ADMIN`, `USER`
- `Stadium.ownerId` -> haqiqiy `User.id`
- `Field.stadiumId` -> haqiqiy `Stadium.id`
- `Booking.userId` -> yaratgan `User.id`
- `Booking.fieldId` -> mavjud `Field.id`
- `Payment.bookingId` -> mavjud `Booking.id`

## 7. Production uchun ogohlantirish

- Seed ma'lumotlari faqat local development/test muhitida ishlatiladi.
- Production database'iga seed ishlatmaslik kerak.
- `.env` da haqiqiy JWT secret, DB URL va production parollar saqlanadi.
- Real user parollari yoki production ma'lumotlari Git'ga push qilinmasligi kerak.

## 8. Import qilish uchun Postman collection

Collection fayli:

- `postman/Football-Stadium-Booking.postman_collection.json`

Import qilish:

1. Postman dasturini oching.
2. Import -> File
3. Yuqoridagi JSON faylini tanlang.
4. `baseUrl` ni tekshiring: `http://localhost:3000`
5. Login qilgandan so'ng `token` va `refreshToken` avtomatik to'ldiriladi.
