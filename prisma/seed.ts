import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// TASK-06 (Dev6, Hafta 2): kamida 1 Admin, 2 Owner, 3 User (bcrypt bilan
// hash qilingan parollar bilan), 3 Stadium (status=ACTIVE), har biriga
// 2 Field (to'liq Working Hours bilan) yarating.
// Batafsil va to'liq kod namunasi: Dev6 qo'llanma, 6-BOB, TASK-06.
async function main() {
  console.log('TODO (Dev6 TASK-06): seed.ts hali implement qilinmagan');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
