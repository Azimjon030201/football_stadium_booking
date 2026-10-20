#!/usr/bin/env bash
# farida branchini main/dev bilan conflictsiz qilish skripti.
# Ishlatish (Farida kompyuterida, repo ildizida, ish papkasi toza bo'lsin):
#   bash fix_farida_conflict.sh          # dev bilan sinxronlaydi (standart)
#   bash fix_farida_conflict.sh main     # agar kerak bo'lsa main bilan
set -euo pipefail
BASE="${1:-dev}"

command -v node >/dev/null || { echo "XATO: node topilmadi (npm bilan birga o'rnatilgan bo'lishi kerak)"; exit 1; }

# Oldingi yarim qolgan merge bo'lsa, uni bekor qilamiz (skriptni qayta ishga tushirish xavfsiz)
if [ -f "$(git rev-parse --git-dir)/MERGE_HEAD" ]; then git merge --abort; fi

git fetch origin
git checkout farida
git pull origin farida

# 1) $BASE (standart: dev) dagi hamma narsani farida ga olamiz. Shundan keyin farida -> dev PR conflict'siz tushadi.
git merge "origin/$BASE" --no-commit --no-ff || true   # conflict BO'LADI: src/main.ts va payments.module.ts

# 2) src/main.ts -> $BASE dagi versiya (Swagger, CORS, prefix 'api', AllExceptionsFilter) + helmet
git checkout --theirs src/main.ts
node - <<'JS'
const fs = require('fs');
let s = fs.readFileSync('src/main.ts', 'utf8');
if (!s.includes("import helmet")) {
  s = s.replace("import { NestFactory } from '@nestjs/core';",
                "import { NestFactory } from '@nestjs/core';\nimport helmet from 'helmet';");
}
if (!s.includes("app.use(helmet())")) {
  s = s.replace("  app.setGlobalPrefix('api');",
                "  app.setGlobalPrefix('api');\n  app.use(helmet());");
}
fs.writeFileSync('src/main.ts', s);
JS
grep -q "import helmet" src/main.ts && grep -q "app.use(helmet())" src/main.ts || { echo "XATO: main.ts ga helmet qo'shilmadi"; exit 1; }

# 3) src/payments/payments.module.ts -> Farida controller/service + app.module kutgan nom (PaymentModule)
cat > src/payments/payments.module.ts <<'EOF_MODULE'
import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { MockProvider } from './providers/mock-provider';

// Sinf nomi PaymentModule — app.module.ts shuni import qiladi (o'zgartirmaymiz).
@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, MockProvider],
  exports: [PaymentsService],
})
export class PaymentModule {}
EOF_MODULE

# 4) JWT strategy {userId, role} qaytaradi, 'id' emas -> @CurrentUser('userId'); guard bitta joydan
sed -i "s#from '../auth/guards/jwt-auth.guard'#from '../common/guards/jwt-auth.guard'#; s#@CurrentUser('id')#@CurrentUser('userId')#" src/payments/payments.controller.ts

# 5) AppException body'da 'error' kaliti bo'lsin (main dagi AllExceptionsFilter shuni o'qiydi)
sed -i "s#super({ code, message, details }, status);#super({ error: code, message, details }, status);#" src/common/errors/app.exception.ts

# 6) Takroriy fayllar: main da AllExceptionsFilter bor, HttpExceptionFilter keraksiz; users/dto ichidagi dto adashib tushgan
git rm -q -f --ignore-unmatch src/common/filters/http-exception.filter.ts src/users/dto/payment-webhook.dto.ts

# 7) Eskirgan testlarni yangi API ga moslash
cat > src/payments/providers/mock-provider.spec.ts <<'EOF_SPEC1'
import { MockProvider } from './mock-provider';

describe('MockProvider', () => {
  const provider = new MockProvider();
  const params = (key: string) => ({
    paymentId: 'p1',
    bookingId: 'b1',
    amount: '150000.00',
    currency: 'UZS',
    idempotencyKey: key,
  });

  it('nomi MOCK', () => {
    expect(provider.name).toBe('MOCK');
  });

  it('mock-tx- prefiksli transactionId qaytaradi', async () => {
    const r = await provider.initiate(params('k1'));
    expect(r.transactionId).toMatch(/^mock-tx-[0-9a-f-]{36}$/);
  });



  it('har chaqiriqda noyob transactionId', async () => {
    const a = await provider.initiate(params('k1'));
    const b = await provider.initiate(params('k2'));
    expect(a.transactionId).not.toBe(b.transactionId);
  });
});
EOF_SPEC1
cat > src/payments/providers/payments.service.spec.ts <<'EOF_SPEC2'
import { MockProvider } from './mock-provider';
import { PaymentsService } from '../payments.service';

const mkBooking = (over: any = {}) => ({
  id: 'b1', userId: 'u1', status: 'PENDING', price: '100000.00', ...over,
});

function setup(booking: any, updateCount = 1) {
  const tx: any = {
    booking: { updateMany: jest.fn().mockResolvedValue({ count: updateCount }) },
    payment: {
      upsert: jest.fn().mockImplementation(async ({ create }) => ({
        id: 'p1', currency: 'UZS', amount: create.amount, ...create,
      })),
    },
  };
  const prisma: any = {
    booking: { findUnique: jest.fn().mockResolvedValue(booking) },
    payment: {
      update: jest.fn().mockImplementation(async ({ data }) => ({
        id: 'p1', amount: '100000.00', currency: 'UZS', ...data,
      })),
    },
    $transaction: jest.fn((fn: any) => fn(tx)),
  };
  const provider = new MockProvider();
  const spy = jest.spyOn(provider, 'initiate');
  return { svc: new PaymentsService(prisma, provider), prisma, tx, spy };
}

const codeOf = async (p: Promise<unknown>) => {
  try { await p; } catch (e: any) { return { status: e.getStatus(), body: e.getResponse() }; }
  return null;
};

describe('PaymentsService.initiatePayment', () => {
  it('summani bazadagi narxdan oladi, booking PAYMENT_PENDING ga o\'tadi', async () => {
    const { svc, tx, spy, prisma } = setup(mkBooking());
    const r = await svc.initiatePayment('b1', 'u1');

    expect(tx.booking.updateMany).toHaveBeenCalledWith({
      where: { id: 'b1', userId: 'u1', status: 'PENDING' },
      data: { status: 'PAYMENT_PENDING' },
    });
    expect(tx.payment.upsert.mock.calls[0][0].create.amount).toBe('100000.00');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(prisma.payment.update).toHaveBeenCalled();
    expect(r.status).toBe('PENDING');
    expect(r.transactionId).toMatch(/^mock-tx-/);
  });

  it('bron topilmasa 404 BOOKING_NOT_FOUND', async () => {
    const { svc } = setup(null);
    const e = await codeOf(svc.initiatePayment('b1', 'u1'));
    expect(e?.status).toBe(404);
    expect((e?.body as any).error).toBe('BOOKING_NOT_FOUND');
  });

  it('boshqa foydalanuvchi broni uchun 403 FORBIDDEN_RESOURCE', async () => {
    const { svc } = setup(mkBooking({ userId: 'other' }));
    const e = await codeOf(svc.initiatePayment('b1', 'u1'));
    expect(e?.status).toBe(403);
    expect((e?.body as any).error).toBe('FORBIDDEN_RESOURCE');
  });

  it('bron PENDING bo\'lmasa 400 BOOKING_INVALID_STATE, provider chaqirilmaydi', async () => {
    const { svc, spy } = setup(mkBooking({ status: 'CONFIRMED' }));
    const e = await codeOf(svc.initiatePayment('b1', 'u1'));
    expect(e?.status).toBe(400);
    expect((e?.body as any).error).toBe('BOOKING_INVALID_STATE');
    expect(spy).not.toHaveBeenCalled();
  });

  it('parallel so\'rovda (updateMany count=0) 400 va provider chaqirilmaydi', async () => {
    const { svc, spy } = setup(mkBooking(), 0);
    const e = await codeOf(svc.initiatePayment('b1', 'u1'));
    expect((e?.body as any).error).toBe('BOOKING_INVALID_STATE');
    expect(spy).not.toHaveBeenCalled();
  });
});
EOF_SPEC2

git add -A
git commit -m "merge: sync farida with $BASE, resolve main.ts and payments.module conflicts"
echo
echo "Tayyor. Endi:  npm install && npm test   (keyin)   git push origin farida"
echo "So'ng GitHub'da PR: base=dev  <-  compare=farida  (conflict chiqmasligi kerak)"
