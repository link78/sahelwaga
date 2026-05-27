// Lifecycle state machines for orders. Centralised so PATCH handlers and
// dedicated transition endpoints share the same rules.

import { badRequest } from './errors.js';

type PurchaseOrderStatus =
  | 'DRAFT'
  | 'SENT'
  | 'CONFIRMED'
  | 'IN_PRODUCTION'
  | 'SHIPPED'
  | 'RECEIVED'
  | 'CANCELLED';

type ImportBatchStatus = 'PENDING' | 'IN_TRANSIT' | 'CUSTOMS' | 'CLEARED' | 'RECEIVED';

type SalesOrderStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'PICKED'
  | 'DELIVERED'
  | 'PAID'
  | 'CANCELLED';

const PO_TRANSITIONS: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  DRAFT: ['SENT', 'CANCELLED'],
  SENT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['IN_PRODUCTION', 'CANCELLED'],
  IN_PRODUCTION: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['RECEIVED', 'CANCELLED'],
  RECEIVED: [],
  CANCELLED: [],
};

const IB_TRANSITIONS: Record<ImportBatchStatus, ImportBatchStatus[]> = {
  PENDING: ['IN_TRANSIT'],
  IN_TRANSIT: ['CUSTOMS'],
  CUSTOMS: ['CLEARED'],
  CLEARED: ['RECEIVED'],
  RECEIVED: [],
};

const SO_TRANSITIONS: Record<SalesOrderStatus, SalesOrderStatus[]> = {
  DRAFT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PICKED', 'CANCELLED'],
  PICKED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['PAID'],
  PAID: [],
  CANCELLED: [],
};

function assertTransition<T extends string>(
  table: Record<T, T[]>,
  entity: string,
  from: T,
  to: T,
): void {
  if (from === to) return; // no-op
  const allowed = table[from] ?? [];
  if (!allowed.includes(to)) {
    throw badRequest(
      `Invalid ${entity} status transition: ${from} → ${to}. Allowed: ${
        allowed.length ? allowed.join(', ') : '(none)'
      }`,
    );
  }
}

export const assertPoTransition = (from: PurchaseOrderStatus, to: PurchaseOrderStatus) =>
  assertTransition(PO_TRANSITIONS, 'purchase order', from, to);

export const assertIbTransition = (from: ImportBatchStatus, to: ImportBatchStatus) =>
  assertTransition(IB_TRANSITIONS, 'import batch', from, to);

export const assertSoTransition = (from: SalesOrderStatus, to: SalesOrderStatus) =>
  assertTransition(SO_TRANSITIONS, 'sales order', from, to);
