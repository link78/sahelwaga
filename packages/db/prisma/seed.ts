/* eslint-disable no-console */
import { PrismaClient, UserRole, SupplierStatus, WhoGmpStatus, ProductCategory, ProductStatus, Currency, ClientType, ClientStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // --- Users -------------------------------------------------------------
  const adminPassword = await bcrypt.hash('admin123!', 10);
  const opsPassword = await bcrypt.hash('ops123!', 10);

  await prisma.user.upsert({
    where: { email: 'admin@sahelpharma.local' },
    update: {},
    create: {
      email: 'admin@sahelpharma.local',
      name: 'Admin User',
      passwordHash: adminPassword,
      role: UserRole.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: 'ops@sahelpharma.local' },
    update: {},
    create: {
      email: 'ops@sahelpharma.local',
      name: 'Ops User (BF)',
      passwordHash: opsPassword,
      role: UserRole.OPS,
      locale: 'FR',
    },
  });

  await prisma.user.upsert({
    where: { email: 'absalim78@yahoo.com' },
    update: {},
    create: {
      email: 'absalim78@yahoo.com',
      name: 'Abdoul Salim',
      passwordHash: adminPassword,
      role: UserRole.ADMIN,
    },
  });

  // --- Suppliers ---------------------------------------------------------
  const supplierData = [
    { name: 'Mumbai Pharma Ltd', country: 'India', status: SupplierStatus.APPROVED, whoGmpStatus: WhoGmpStatus.VERIFIED },
    { name: 'Hyderabad Generics', country: 'India', status: SupplierStatus.APPROVED, whoGmpStatus: WhoGmpStatus.VERIFIED },
    { name: 'Chennai Labs', country: 'India', status: SupplierStatus.UNDER_REVIEW, whoGmpStatus: WhoGmpStatus.PENDING },
    { name: 'Ahmedabad Bio', country: 'India', status: SupplierStatus.PROSPECT, whoGmpStatus: WhoGmpStatus.UNKNOWN },
    { name: 'Pune Sterile Solutions', country: 'India', status: SupplierStatus.APPROVED, whoGmpStatus: WhoGmpStatus.VERIFIED },
  ];

  for (const s of supplierData) {
    await prisma.supplier.upsert({
      where: { id: `seed-${s.name.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: { id: `seed-${s.name.toLowerCase().replace(/\s+/g, '-')}`, ...s },
    });
  }

  // --- Products ---------------------------------------------------------
  const products = [
    { name: 'Amoxicillin 500mg', inn: 'Amoxicillin', category: ProductCategory.ANTIBIOTIC, form: 'Capsule', strength: '500mg', packSize: '10x10', status: ProductStatus.ACTIVE },
    { name: 'Artemether-Lumefantrine 80/480', inn: 'Artemether/Lumefantrine', category: ProductCategory.ANTIMALARIAL, form: 'Tablet', strength: '80/480mg', packSize: '6 tabs', status: ProductStatus.ACTIVE },
    { name: 'Paracetamol Syrup 120mg/5ml', inn: 'Paracetamol', category: ProductCategory.PEDIATRIC_SYRUP, form: 'Syrup', strength: '120mg/5ml', packSize: '60ml', status: ProductStatus.ACTIVE },
    { name: 'Sodium Chloride 0.9% IV 500ml', inn: 'Sodium Chloride', category: ProductCategory.IV_FLUID, form: 'IV solution', strength: '0.9%', packSize: '500ml', status: ProductStatus.ACTIVE },
    { name: 'Sterile Gauze Pads', category: ProductCategory.CONSUMABLE, form: 'Pad', packSize: '100 pcs', status: ProductStatus.ACTIVE },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { id: `seed-${p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` },
      update: {},
      create: { id: `seed-${p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, ...p },
    });
  }

  // --- Clients ----------------------------------------------------------
  const clients = [
    { name: 'Clinique Saint-Camille', type: ClientType.CLINIC, country: 'BF', city: 'Ouagadougou' },
    { name: 'Pharmacie du Centre', type: ClientType.PHARMACY, country: 'BF', city: 'Bobo-Dioulasso' },
    { name: 'ONG Santé Sahel', type: ClientType.NGO, country: 'BF', city: 'Ouagadougou' },
  ];
  for (const c of clients) {
    await prisma.client.upsert({
      where: { id: `seed-${c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` },
      update: {},
      create: { id: `seed-${c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, status: ClientStatus.ACTIVE, ...c },
    });
  }

  // --- Stock location ---------------------------------------------------
  await prisma.stockLocation.upsert({
    where: { id: 'seed-bf-main-warehouse' },
    update: {},
    create: { id: 'seed-bf-main-warehouse', name: 'Ouagadougou Main Warehouse', country: 'BF' },
  });

  // --- Portal users (Phase 5) -------------------------------------------
  const portalPassword = await bcrypt.hash('portal123!', 10);
  await prisma.user.upsert({
    where: { email: 'supplier@mumbai-pharma.local' },
    update: {},
    create: {
      email: 'supplier@mumbai-pharma.local',
      name: 'Mumbai Pharma Portal',
      passwordHash: portalPassword,
      role: UserRole.SUPPLIER_PORTAL,
      supplierId: 'seed-mumbai-pharma-ltd',
    },
  });
  await prisma.user.upsert({
    where: { email: 'client@saint-camille.local' },
    update: {},
    create: {
      email: 'client@saint-camille.local',
      name: 'Saint-Camille Portal',
      passwordHash: portalPassword,
      role: UserRole.CLIENT_PORTAL,
      clientId: 'seed-clinique-saint-camille',
    },
  });

  console.log('Seed complete.');
  console.log('Login: admin@sahelpharma.local / admin123!');
  console.log('Login: absalim78@yahoo.com / admin123!');
  console.log('Login: ops@sahelpharma.local / ops123!');
  console.log('Login: supplier@mumbai-pharma.local / portal123!');
  console.log('Login: client@saint-camille.local / portal123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
