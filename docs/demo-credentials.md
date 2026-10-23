# Demo login credentials

Ushbu hujjat local development / demo muhit uchun tayyorlangan demo hisoblarni ko'rsatadi. Bu hisoblar faqat loyiha demo va test maqsadlarida ishlatiladi.

> Eslatma: Hech qachon production bazaga ushbu hisoblarni ishlatmang yoki real parollarni yozmang.

## Demo hisoblar

| Rol | Email | Parol | Maqsad |
|---|---|---|---|
| Admin | `admin@stadium.local` | `Admin123!` | Admin paneli, tasdiqlash va monitoring |
| Owner | `owner1@stadium.local` | `Owner123!` | Birinchi stadion egasi |
| Owner | `owner2@stadium.local` | `Owner123!` | Ikkinchi stadion egasi |
| User | `user1@stadium.local` | `User123!` | Oddiy foydalanuvchi |
| User | `user2@stadium.local` | `User123!` | Oddiy foydalanuvchi |
| User | `user3@stadium.local` | `User123!` | Oddiy foydalanuvchi |

## Auth login example

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

## Login endpoint

```http
POST http://localhost:3000/api/auth/login
```

## Jwt token ishlatish

Login muvaffaqiyatli bo'lgach, server quyidagi javobni qaytaradi:

```json
{
  "user": {
    "id": "...",
    "email": "user1@stadium.local"
  },
  "accessToken": "...",
  "refreshToken": "..."
}
```

Keyingi so'rovlarda headerga qo'shing:

```http
Authorization: Bearer <accessToken>
```

## Seed bilan bog'langan holat

- Barcha parollar `bcrypt` orqali hash qilinadi.
- `prisma/seed.ts` scriptini qayta ishlatishda ma'lumotlar takrorlanmaydi.
- Demo hisoblar local development/test bazasi uchun mo'ljallangan.
- Production muhitida seed ishlatilmaydi.
