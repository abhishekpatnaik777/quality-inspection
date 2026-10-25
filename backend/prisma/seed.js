import { PrismaClient } from '@prisma/client';
import { buildBatchNumber } from '../src/modules/product/product.service.js';

const prisma = new PrismaClient();

const CAR_PART_SKUS = [
  { name: 'Ceramic Brake Pad Set', category: 'mechanical', model: 'BP-CER-F2024' },
  { name: 'Engine Oil Filter', category: 'consumable', model: 'OF-SPIN-10W40' },
  { name: 'LED Headlight Assembly', category: 'electronics', model: 'HL-LED-L900' },
  { name: 'Air Intake Filter', category: 'consumable', model: 'AF-PANEL-42' },
  { name: 'Aluminum Alloy Wheel', category: 'mechanical', model: 'WH-AL-18X8' },
];

const PRODUCTION_UNITS = [
  { name: 'Pune Stamping Line A', location: 'Pune, Maharashtra', capacity: 1 },
  { name: 'Chennai Powertrain Plant', location: 'Chennai, Tamil Nadu', capacity: 2 },
  { name: 'Gurugram Body Shop', location: 'Gurugram, Haryana', capacity: 3 },
  { name: 'Sanand Trim Line', location: 'Sanand, Gujarat', capacity: 4 },
  { name: 'Bengaluru Final Assembly', location: 'Bengaluru, Karnataka', capacity: 5 },
];

async function resetDatabase() {
  // Child tables first (FK order).
  await prisma.inspectionResult.deleteMany();
  await prisma.aiInspectionPrediction.deleteMany();
  await prisma.aiInspection.deleteMany();
  await prisma.inspection.deleteMany();
  await prisma.product.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.sku.deleteMany();
  await prisma.manufacturingUnit.deleteMany();
  await prisma.userSupervisor.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.user.deleteMany();
}

async function seedUsers() {
  const supervisor = await prisma.user.create({
    data: {
      name: 'Supervisor 1',
      email: 'supervisor1@example.com',
      status: 'active',
      roles: {
        create: { role: 'supervisor', status: 'active' },
      },
    },
  });

  const engineer = await prisma.user.create({
    data: {
      name: 'Quality Engineer 1',
      email: 'qe1@example.com',
      status: 'active',
      roles: {
        create: { role: 'quality_engineer', status: 'active' },
      },
    },
  });

  await prisma.userSupervisor.create({
    data: {
      userId: engineer.id,
      supervisorId: supervisor.id,
      status: 'active',
    },
  });

  return { supervisor, engineer };
}

async function seedCatalog() {
  const skus = [];
  for (const sku of CAR_PART_SKUS) {
    skus.push(await prisma.sku.create({ data: sku }));
  }

  const units = [];
  for (const unit of PRODUCTION_UNITS) {
    units.push(await prisma.manufacturingUnit.create({ data: unit }));
  }

  return { skus, units };
}

async function seedSampleBatches(skus, units) {
  for (let i = 0; i < units.length; i += 1) {
    const unit = units[i];
    const sku = skus[i % skus.length];

    await prisma.$transaction(async (tx) => {
      const batch = await tx.batch.create({
        data: {
          batchNumber: buildBatchNumber({
            skuId: sku.id,
            manufacturingUnitId: unit.id,
          }),
          manufacturingUnitId: unit.id,
          skuId: sku.id,
          manufacturingDate: new Date(),
        },
      });

      await tx.product.createMany({
        data: Array.from({ length: unit.capacity }, () => ({
          batchId: batch.id,
        })),
      });
    });
  }
}

async function main() {
  await resetDatabase();
  const { supervisor, engineer } = await seedUsers();
  const { skus, units } = await seedCatalog();
  await seedSampleBatches(skus, units);

  console.log('Database reset. Seeded users:', {
    supervisor: supervisor.email,
    engineer: engineer.email,
  });
  console.log(
    'Seeded SKUs:',
    skus.map((sku) => sku.name)
  );
  console.log(
    'Seeded manufacturing units:',
    units.map((unit) => `${unit.name} · ${unit.location} (capacity ${unit.capacity})`)
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
