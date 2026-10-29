# RBAC e2e test hisoboti

- Sana: 2026-10-29
- Branch: abror-rbac-report-admin-self-block
- Kod commit: 622fddb
- Testlar commitdan oldin shu o‘zgarishlar bilan bajarilgan.
- Muhit: Docker PostgreSQL 16, localhost:5433
- Buyruq: npx jest --config test/jest-e2e.json test/rbac-edge-cases.e2e-spec.ts --runInBand

## Natija

| # | Holat | Natija |
|---|-------|--------|
| 1 | USER -> admin endpoint: 403 FORBIDDEN_RESOURCE | PASS |
| 2 | Tokensiz -> himoyalangan endpoint: 401 | PASS |
| 3 | OWNER -> admin endpoint: 403 | PASS |
| 4 | owner2 -> owner1 stadioni PATCH: 403 | PASS |
| 5 | owner2 -> owner1 stadioni DELETE: 403 | PASS |
| 6 | owner1 -> o‘z stadionini PATCH: 200 | PASS |
| 7 | ADMIN -> boshqa owner stadionini tasdiqlash: 200 | PASS |
| 8 | Bloklangan USER -> eski token bilan so‘rov: 403 USER_BLOCKED | PASS |
| 9 | ADMIN -> status=NOTREAL: 400 | PASS |
| 10 | ADMIN -> o‘zini bloklash: 403 | PASS |

Jami: 10 passed, 0 failed.

Ikki marta ketma-ket bajarildi:
- Birinchi: 10/10 PASS, 8.506 s.
- Ikkinchi: 10/10 PASS, 8.863 s.

TypeScript tekshiruvi:
- Buyruq: npx tsc --noEmit
- Natija: xatosiz tugadi.

## Topilgan muammolar

- Adminning o‘zini bloklashiga qarshi tekshiruv yo‘q edi.
- Controller actorId uzatadigan qilindi.
- Servis o‘zini bloklashni 403 FORBIDDEN_RESOURCE bilan rad etadi.
- Yangi test adminning bazadagi statusi ACTIVE qolishini tekshiradi.
- Ushbu testlarda boshqa muammo aniqlanmadi.

## Yurgizilmaganlar

- Butun loyihaning barcha e2e testlari bu tekshiruvga kirmaydi.
- GitHub CI holati hali tekshirilmagan.

## Haqiqiy Jest chiqishi — ikkinchi ishga tushirish

```text
 PASS  test/rbac-edge-cases.e2e-spec.ts (8.283 s)
  RBAC edge cases (e2e)
    ✓ USER -> admin endpoint: 403 FORBIDDEN_RESOURCE (22 ms)
    ✓ Tokensiz -> himoyalangan endpoint: 401 (7 ms)
    ✓ OWNER -> admin endpoint: 403 (7 ms)
    ✓ owner2 -> owner1 stadioni PATCH: 403 (27 ms)
    ✓ owner2 -> owner1 stadioni DELETE: 403 (16 ms)
    ✓ owner1 -> o‘z stadionini PATCH: 200 (26 ms)
    ✓ ADMIN -> boshqa owner stadionini tasdiqlash: 200 (22 ms)
    ✓ Bloklangan USER -> eski token bilan so‘rov: 403 USER_BLOCKED (561 ms)
    ✓ ADMIN -> status=NOTREAL: 400 (17 ms)
    ✓ ADMIN -> o‘zini bloklash: 403 (10 ms)

Test Suites: 1 passed, 1 total
Tests:       10 passed, 10 total
Snapshots:   0 total
Time:        8.863 s
Ran all test suites matching test/rbac-edge-cases.e2e-spec.ts.
```