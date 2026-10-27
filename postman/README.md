# Postman collection maintenance

Ushbu papka loyihadagi real NestJS endpointlarini Postman collection sifatida saqlash uchun ishlatiladi.

## Manba sifatida foydalaniladigan fayllar

- `src/**/*.controller.ts` — real HTTP routes va auth guardlar
- `src/**/*.dto.ts` — request body va validation qoidalari
- `src/app.module.ts` va `src/main.ts` — global prefix (`/api`) va Swagger sozlamalari

## Qoidalar

1. Yangi endpoint qo'shilganda yoki mavjud route o'zgarganda, avval backend kodini tekshiring.
2. Faqat real endpointlarni qo'shing. Taxmin bilan yangi route yaratmang.
3. Collectiondagi URLlar `{{baseUrl}}` bilan boshlanishi shart.
4. Himoyalangan endpointlar uchun Bearer token ishlating (`{{token}}`).
5. Request body, query param, status code va validation holatlari real backend qoidalariga mos bo'lishi kerak.
6. Har bir muhim request uchun Postman test scriptini yozing.
7. Collection faylini JSON validatsiya qiling va git orqali saqlang.

## Team Workspace sinxronizatsiyasi

- Postman orqali collection export qilishdan oldin o'zingizning environmentni tekshiring.
- `baseUrl` local development uchun `http://localhost:3000` bo'lishi kerak.
- Export qilingan faylni Git repozitoriyaga qo'shing.
- Jamoa bilan ishlashda Postman Team Workspace yoki shared collection dan foydalaning.

## Local tekshirish

```bash
python -m json.tool postman/Football-Stadium-Booking-API.postman_collection.json
```

Bu buyruq collectionning sintaktik to'g'riligini tekshiradi.
