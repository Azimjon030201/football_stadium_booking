#!/usr/bin/env node
/**
 * Prisma "development-only" guard.
 *
 * `prisma migrate dev` / `migrate reset` / `db push` faqat LOCAL development
 * bazasida ishlatilishi kerak. Bu skript buyruq ishga tushishidan OLDIN
 * DATABASE_URL va NODE_ENV'ni tekshiradi va xavfli bo'lsa to'xtatadi.
 *
 * Hech qanday dependency kerak emas (faqat Node.js).
 * Ruxsat berilmagan holatda exit code 1 qaytaradi.
 */
const fs = require('fs');
const path = require('path');

const LOCAL_HOSTS = [
  'localhost',
  '127.0.0.1',
  '::1',
  'postgres', // docker compose servis nomi
  'host.docker.internal',
];

// Shell'da allaqachon berilgan o'zgaruvchilar .env'dan ustun turadi.
function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function fail(msg) {
  console.error('\n[prisma-dev-guard] TO\'XTATILDI: ' + msg + '\n');
  process.exit(1);
}

loadDotEnv(path.resolve(process.cwd(), '.env'));

if (process.env.ALLOW_NON_LOCAL_DB === 'true') {
  console.warn(
    '[prisma-dev-guard] OGOHLANTIRISH: ALLOW_NON_LOCAL_DB=true — tekshiruv o\'tkazib yuborildi.',
  );
  process.exit(0);
}

if ((process.env.NODE_ENV || '').toLowerCase() === 'production') {
  fail(
    'NODE_ENV=production. Production uchun `npx prisma migrate deploy` ishlating.',
  );
}

const url = process.env.DATABASE_URL;
if (!url) fail('DATABASE_URL topilmadi (.env faylini tekshiring).');

let host;
try {
  host = new URL(url).hostname;
} catch {
  fail('DATABASE_URL noto\'g\'ri formatda.');
}

if (!LOCAL_HOSTS.includes(host)) {
  fail(
    `DATABASE_URL host'i "${host}" — bu local development bazasi emas.\n` +
      '  Remote/production bazaga `migrate dev` qilmang.\n' +
      '  Haqiqatan ham maqsadli test bazasi bo\'lsa: ALLOW_NON_LOCAL_DB=true',
  );
}

console.log(`[prisma-dev-guard] OK — host: ${host}`);