# Verify clean start

## Verification table

| File | PASS / FAIL | Date | Environment |
| --- | --- | --- | --- |
| `test/booking-conflict.e2e-spec.ts` | PASS | 2026-10-29 | Local PostgreSQL 18 on Windows |
| `test/full-flow.e2e-spec.ts` | FAIL | 2026-10-29 | Local PostgreSQL 18 on Windows |
| `test/booking-working-hours.e2e-spec.ts` | PASS | 2026-10-29 | Local PostgreSQL 18 on Windows |
| `test/availability-tz.e2e-spec.ts` | PASS | 2026-10-29 | Local PostgreSQL 18 on Windows |

## Local execution notes

- Docker Desktop was not available for this environment, so the verification was run against a local PostgreSQL 18 instance.
- The project database URL was aligned to the running local service: `postgresql://postgres:postgres@localhost:5432/stadium_db`.
- Prisma schema was applied successfully with `npx prisma migrate deploy` and seed data was loaded with `npx prisma db seed`.

## Technical verification performed

- `npx tsc --noEmit` was run after the migration and cleanup work.
- Live e2e execution was performed with:

```bash
node .\node_modules\jest\bin\jest.js --config .\test\jest-e2e.json --runTestsByPath .\test\booking-conflict.e2e-spec.ts .\test\full-flow.e2e-spec.ts .\test\booking-working-hours.e2e-spec.ts .\test\availability-tz.e2e-spec.ts --runInBand
```

## Result summary

- Three of four requested e2e suites passed.
- The remaining failure is `test/full-flow.e2e-spec.ts` with `401 Unauthorized` on the webhook call to `/api/v1/payments/webhook/mock`.
- Root cause identified: the payment webhook route is protected by the class-level JWT guard and fails without an authenticated token, even for the mock provider path.

## Cleanup status

- Payment e2e specs were moved under the `test/` folder.
- Duplicate `describe` blocks were collapsed to a single block in the duplicate webhook spec.
- `booking-conflict` console logging was removed; the time window now uses UTC `06:00Z` to `07:00Z`.
