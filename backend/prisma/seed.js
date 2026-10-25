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
  { name: 'Chennai Powertrain Plant', location: 'Chennai, Tamil Nadu', capacity: 4 },
  { name: 'Gurugram Body Shop', location: 'Gurugram, Haryana', capacity: 2 },
  { name: 'Sanand Trim Line', location: 'Sanand, Gujarat', capacity: 5 },
  { name: 'Bengaluru Final Assembly', location: 'Bengaluru, Karnataka', capacity: 3 },
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
      name: 'Abhas',
      email: 'Abhas@example.com',
      status: 'active',
      roles: {
        create: { role: 'supervisor', status: 'active' },
      },
    },
  });

  const engineer = await prisma.user.create({
    data: {
      name: 'Abhishek',
      email: 'abhishek@example.com',
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

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickRandomCombinations(skus, units) {
  const pairs = [];
  for (const sku of skus) {
    for (const unit of units) {
      pairs.push({ sku, unit });
    }
  }

  const shuffled = shuffle(pairs);
  const minCount = Math.min(3, shuffled.length);
  const maxCount = shuffled.length;
  const count = minCount + Math.floor(Math.random() * (maxCount - minCount + 1));
  return shuffled.slice(0, count);
}

async function seedSampleBatches(skus, units) {
  const combinations = pickRandomCombinations(skus, units);
  let productsCreated = 0;

  for (const { sku, unit } of combinations) {
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

    productsCreated += unit.capacity;
  }

  return { batchesCreated: combinations.length, productsCreated, combinations };
}

async function main() {
  await resetDatabase();
  const { supervisor, engineer } = await seedUsers();
  const { skus, units } = await seedCatalog();
  const { batchesCreated, productsCreated, combinations } = await seedSampleBatches(skus, units);

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
  console.log(
    `Seeded ${batchesCreated} batch(es) / ${productsCreated} product(s) for random SKU × unit pairs:`
  );
  for (const { sku, unit } of combinations) {
    console.log(`  - ${sku.name} @ ${unit.name} (${unit.capacity} product(s))`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
