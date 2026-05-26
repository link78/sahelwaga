import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { authRequired } from '../../middleware/auth.js';

const router: Router = Router();
router.use(authRequired);

// Dashboard stats endpoint — returns KPIs and alerts for the overview page.
router.get('/stats', async (_req, res) => {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [
    activeSuppliers,
    activeProducts,
    openPOs,
    openSalesOrders,
    shipmentsInTransit,
    expiringCOAs,
    expiringStability,
    lowStockProducts,
  ] = await Promise.all([
    // Active suppliers (APPROVED status, not deleted)
    prisma.supplier.count({
      where: { status: 'APPROVED', deletedAt: null },
    }),
    // Active products
    prisma.product.count({
      where: { status: 'ACTIVE', deletedAt: null },
    }),
    // Open POs to India (not received/cancelled)
    prisma.purchaseOrder.count({
      where: {
        status: { in: ['DRAFT', 'SENT', 'CONFIRMED', 'IN_PRODUCTION', 'SHIPPED'] },
      },
    }),
    // Open orders in Burkina Faso (sales orders that are not delivered/paid/cancelled)
    prisma.salesOrder.count({
      where: {
        status: { in: ['DRAFT', 'CONFIRMED', 'PICKED'] },
      },
    }),
    // Shipments in transit
    prisma.importBatch.count({
      where: { status: 'IN_TRANSIT' },
    }),
    // Alerts: COAs expiring within 30 days
    prisma.document.count({
      where: {
        type: 'COA',
        expiryDate: { lte: thirtyDaysFromNow, gte: now },
      },
    }),
    // Alerts: Stability data expiring within 30 days
    prisma.document.count({
      where: {
        type: 'STABILITY',
        expiryDate: { lte: thirtyDaysFromNow, gte: now },
      },
    }),
    // Alerts: Low stock — products with net stock <= 0
    // Derived from stock movements aggregated per product
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(DISTINCT "productId")::bigint as count
      FROM "StockMovement"
      GROUP BY "productId"
      HAVING SUM(qty) <= 0
    `.then((rows: { count: bigint }[]) => Number(rows[0]?.count ?? 0))
      .catch(() => 0),
  ]);

  res.json({
    kpis: {
      activeSuppliers,
      activeProducts,
      openPOs,
      openSalesOrders,
      shipmentsInTransit,
    },
    alerts: {
      expiringCOAs,
      expiringStability,
      lowStockProducts,
    },
  });
});

export { router as dashboardRouter };
