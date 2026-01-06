import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // No-op seed; kept for future expansion.
  // Intentionally empty.
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

