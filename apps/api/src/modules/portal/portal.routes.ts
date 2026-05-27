import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { forbidden, notFound } from '../../lib/errors.js';
import { authRequired } from '../../middleware/auth.js';

const router: Router = Router();
router.use(authRequired);

// Aggregated overview for the signed-in portal user.
// SUPPLIER_PORTAL → own supplier profile + open PO counts.
// CLIENT_PORTAL   → own client profile + open SO counts.
router.get('/me', async (req, res) => {
  const auth = req.auth!;

  if (auth.role === 'SUPPLIER_PORTAL') {
    if (!auth.supplierId) throw forbidden('Supplier portal user is not linked to a supplier');
    const supplier = await prisma.supplier.findFirst({
      where: { id: auth.supplierId, deletedAt: null },
      include: {
        vetting: true,
        contacts: { where: { isPrimary: true }, take: 1 },
      },
    });
    if (!supplier) throw notFound('Supplier not found');

    const [openPOs, totalPOs, documentCount] = await Promise.all([
      prisma.purchaseOrder.count({
        where: {
          supplierId: supplier.id,
          status: { in: ['DRAFT', 'SENT', 'CONFIRMED', 'IN_PRODUCTION', 'SHIPPED'] },
        },
      }),
      prisma.purchaseOrder.count({ where: { supplierId: supplier.id } }),
      prisma.documentLink.count({ where: { supplierId: supplier.id } }),
    ]);

    return res.json({
      scope: 'supplier' as const,
      supplier,
      kpis: { openPurchaseOrders: openPOs, totalPurchaseOrders: totalPOs, documents: documentCount },
    });
  }

  if (auth.role === 'CLIENT_PORTAL') {
    if (!auth.clientId) throw forbidden('Client portal user is not linked to a client');
    const client = await prisma.client.findFirst({
      where: { id: auth.clientId, deletedAt: null },
      include: { contacts: { where: { isPrimary: true }, take: 1 } },
    });
    if (!client) throw notFound('Client not found');

    const [openSOs, totalSOs, documentCount] = await Promise.all([
      prisma.salesOrder.count({
        where: {
          clientId: client.id,
          status: { in: ['DRAFT', 'CONFIRMED', 'PICKED'] },
        },
      }),
      prisma.salesOrder.count({ where: { clientId: client.id } }),
      prisma.documentLink.count({ where: { clientId: client.id } }),
    ]);

    return res.json({
      scope: 'client' as const,
      client,
      kpis: { openSalesOrders: openSOs, totalSalesOrders: totalSOs, documents: documentCount },
    });
  }

  throw forbidden('Portal endpoint is only available to portal users');
});

export { router as portalRouter };
