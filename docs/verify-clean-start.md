# Verify clean start

## State checked on 2026-10-26

- Project root: `d:/Projects/football_stadium_booking`
- Environment: local Windows machine, Docker Desktop not available
- Result: the app could not be fully started via `docker compose` because the Docker daemon is unavailable (`npipe:////./pipe/dockerDesktopLinuxEngine` not found).

## What was verified

- TypeScript compilation succeeds with:

```bash
node .\node_modules\typescript\bin\tsc --noEmit
```

- The booking/timezone regression tests were added and the code was patched to satisfy the required Toshkent timezone behavior.
- Full e2e execution against Postgres could not be completed in this environment because Docker/Postgres is not running.

## Expected local command to run

```bash
npm install
npm run prisma:deploy
npm run test:e2e
npm run start:prod
```

## Notes

- `start:prod` path was corrected to `node dist/src/main` because the compiled output is generated under `dist/src`.
- For a clean local start, ensure Docker Desktop is running and the project `.env` values match the Postgres container settings.
