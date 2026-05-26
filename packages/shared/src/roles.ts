export const USER_ROLES = ['ADMIN', 'OPS', 'SALES', 'SUPPLIER_PORTAL', 'CLIENT_PORTAL'] as const;
export type UserRole = (typeof USER_ROLES)[number];

// Read/write capability matrix (mirrors the build plan's RBAC table).
// Used by both the API (middleware) and the web (route guards).
export const RBAC: Record<string, { read: UserRole[]; write: UserRole[] }> = {
  suppliers: { read: ['ADMIN', 'OPS', 'SALES', 'SUPPLIER_PORTAL'], write: ['ADMIN', 'OPS'] },
  products: { read: ['ADMIN', 'OPS', 'SALES', 'SUPPLIER_PORTAL', 'CLIENT_PORTAL'], write: ['ADMIN', 'OPS'] },
  purchaseOrders: { read: ['ADMIN', 'OPS', 'SUPPLIER_PORTAL'], write: ['ADMIN', 'OPS'] },
  importBatches: { read: ['ADMIN', 'OPS', 'SALES'], write: ['ADMIN', 'OPS'] },
  salesOrders: { read: ['ADMIN', 'OPS', 'SALES', 'CLIENT_PORTAL'], write: ['ADMIN', 'OPS', 'SALES', 'CLIENT_PORTAL'] },
  clients: { read: ['ADMIN', 'OPS', 'SALES', 'CLIENT_PORTAL'], write: ['ADMIN', 'OPS', 'SALES'] },
  documents: { read: ['ADMIN', 'OPS', 'SALES', 'SUPPLIER_PORTAL', 'CLIENT_PORTAL'], write: ['ADMIN', 'OPS', 'SUPPLIER_PORTAL'] },
  users: { read: ['ADMIN'], write: ['ADMIN'] },
};
