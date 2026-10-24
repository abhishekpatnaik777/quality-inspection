import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const supervisor = await prisma.user.upsert({
    where: { email: 'supervisor1@example.com' },
    update: {},
    create: {
      name: 'Supervisor 1',
      email: 'supervisor1@example.com',
      status: 'active',
      roles: {
        create: { role: 'supervisor', status: 'active' },
      },
    },
    include: { roles: true },
  });

  const engineer = await prisma.user.upsert({
    where: { email: 'qe1@example.com' },
    update: {},
    create: {
      name: 'Quality Engineer 1',
      email: 'qe1@example.com',
      status: 'active',
      roles: {
        create: { role: 'quality_engineer', status: 'active' },
      },
    },
  });

  await prisma.userSupervisor.upsert({
    where: { userId: engineer.id },
    update: {
      supervisorId: supervisor.id,
      status: 'active',
    },
    create: {
      userId: engineer.id,
      supervisorId: supervisor.id,
      status: 'active',
    },
  });

  console.log('Seeded users:', {
    supervisor: supervisor.email,
    engineer: engineer.email,
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
