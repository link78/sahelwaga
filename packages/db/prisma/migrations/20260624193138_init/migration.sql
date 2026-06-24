-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'OPS', 'SALES', 'SUPPLIER_PORTAL', 'CLIENT_PORTAL');

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('EN', 'FR');

-- CreateEnum
CREATE TYPE "SupplierStatus" AS ENUM ('PROSPECT', 'UNDER_REVIEW', 'APPROVED', 'BLOCKED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SupplierRating" AS ENUM ('A', 'B', 'C');

-- CreateEnum
CREATE TYPE "WhoGmpStatus" AS ENUM ('UNKNOWN', 'PENDING', 'VERIFIED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD', 'EUR', 'XOF', 'INR');

-- CreateEnum
CREATE TYPE "Incoterm" AS ENUM ('EXW', 'FOB', 'CIF', 'CFR', 'DAP', 'DDP');

-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('ANTIBIOTIC', 'ANTIMALARIAL', 'PAINKILLER', 'PEDIATRIC_SYRUP', 'IV_FLUID', 'CONSUMABLE', 'OTHER');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('CLINIC', 'PHARMACY', 'NGO', 'DISTRIBUTOR', 'GOVERNMENT');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('WHO_GMP', 'COA', 'STABILITY', 'IMPORT_PERMIT', 'INVOICE', 'PACKING_LIST', 'BL_AWB', 'LICENSE', 'CONTRACT', 'OTHER');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'SENT', 'CONFIRMED', 'IN_PRODUCTION', 'SHIPPED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ImportBatchStatus" AS ENUM ('PENDING', 'IN_TRANSIT', 'CUSTOMS', 'CLEARED', 'RECEIVED');

-- CreateEnum
CREATE TYPE "SalesOrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'PICKED', 'DELIVERED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StockMovementReason" AS ENUM ('IMPORT_RECEIPT', 'SALES_DELIVERY', 'ADJUSTMENT', 'RETURN');

-- CreateEnum
CREATE TYPE "LeadKind" AS ENUM ('PARTNERSHIP', 'ACCOUNT', 'CONTACT');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "locale" "Locale" NOT NULL DEFAULT 'EN',
    "role" "UserRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "supplierId" TEXT,
    "clientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "replacedById" TEXT,
    "createdByIp" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "status" "SupplierStatus" NOT NULL DEFAULT 'PROSPECT',
    "whoGmpStatus" "WhoGmpStatus" NOT NULL DEFAULT 'UNKNOWN',
    "rating" "SupplierRating",
    "notes" TEXT,
    "showSupplierPublicly" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierContact" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierVetting" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "whoGmpVerified" BOOLEAN NOT NULL DEFAULT false,
    "coaReceived" BOOLEAN NOT NULL DEFAULT false,
    "stabilityHotClimate" BOOLEAN NOT NULL DEFAULT false,
    "westAfricaReferences" BOOLEAN NOT NULL DEFAULT false,
    "reviewerId" TEXT,
    "decisionDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierVetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierExportRecord" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "volume" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierExportRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierPriceTier" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "minQty" INTEGER NOT NULL,
    "unitPrice" DECIMAL(14,4) NOT NULL,
    "currency" "Currency" NOT NULL,
    "incoterm" "Incoterm",
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierPriceTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "inn" TEXT,
    "category" "ProductCategory" NOT NULL,
    "form" TEXT,
    "strength" TEXT,
    "packSize" TEXT,
    "shelfLifeMonths" INTEGER,
    "storageConditions" TEXT,
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSupplier" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "supplierProductCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductSupplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductPricing" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "fobCost" DECIMAL(14,4) NOT NULL,
    "landedCostEstimate" DECIMAL(14,4),
    "currency" "Currency" NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductPricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientPriceList" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clientId" TEXT,
    "clientType" "ClientType",
    "currency" "Currency" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientPriceList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientPriceListItem" (
    "id" TEXT NOT NULL,
    "priceListId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "unitPrice" DECIMAL(14,4) NOT NULL,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientPriceListItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ClientType" NOT NULL,
    "country" TEXT NOT NULL,
    "city" TEXT,
    "address" TEXT,
    "creditTermsDays" INTEGER,
    "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientContact" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "title" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "uploadedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentLink" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "supplierId" TEXT,
    "productId" TEXT,
    "purchaseOrderId" TEXT,
    "importBatchId" TEXT,
    "clientId" TEXT,
    "salesOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" "Currency" NOT NULL,
    "incoterm" "Incoterm",
    "targetShipmentDate" TIMESTAMP(3),
    "notes" TEXT,
    "subtotal" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderLine" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "unitPrice" DECIMAL(14,4) NOT NULL,
    "lineTotal" DECIMAL(14,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "dgpmlAuthNumber" TEXT,
    "status" "ImportBatchStatus" NOT NULL DEFAULT 'PENDING',
    "shippedAt" TIMESTAMP(3),
    "arrivedAt" TIMESTAMP(3),
    "customsClearedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatchLine" (
    "id" TEXT NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "qtyShipped" INTEGER NOT NULL,
    "qtyReceived" INTEGER NOT NULL DEFAULT 0,
    "lotNumber" TEXT,
    "manufactureDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportBatchLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesOrder" (
    "id" TEXT NOT NULL,
    "soNumber" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "status" "SalesOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" "Currency" NOT NULL,
    "deliveryDate" TIMESTAMP(3),
    "notes" TEXT,
    "subtotal" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesOrderLine" (
    "id" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "unitPrice" DECIMAL(14,4) NOT NULL,
    "lineTotal" DECIMAL(14,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockLocation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "reason" "StockMovementReason" NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "lotNumber" TEXT,
    "expiryDate" TIMESTAMP(3),
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "kind" "LeadKind" NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "country" TEXT,
    "message" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_supplierId_idx" ON "User"("supplierId");

-- CreateIndex
CREATE INDEX "User_clientId_idx" ON "User"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Supplier_status_idx" ON "Supplier"("status");

-- CreateIndex
CREATE INDEX "Supplier_deletedAt_idx" ON "Supplier"("deletedAt");

-- CreateIndex
CREATE INDEX "SupplierContact_supplierId_idx" ON "SupplierContact"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierVetting_supplierId_key" ON "SupplierVetting"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierExportRecord_supplierId_idx" ON "SupplierExportRecord"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierPriceTier_supplierId_productId_idx" ON "SupplierPriceTier"("supplierId", "productId");

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "Product"("category");

-- CreateIndex
CREATE INDEX "Product_status_idx" ON "Product"("status");

-- CreateIndex
CREATE INDEX "Product_deletedAt_idx" ON "Product"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSupplier_productId_supplierId_key" ON "ProductSupplier"("productId", "supplierId");

-- CreateIndex
CREATE INDEX "ProductPricing_productId_effectiveFrom_idx" ON "ProductPricing"("productId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "ClientPriceList_clientId_idx" ON "ClientPriceList"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientPriceListItem_priceListId_productId_key" ON "ClientPriceListItem"("priceListId", "productId");

-- CreateIndex
CREATE INDEX "Client_type_idx" ON "Client"("type");

-- CreateIndex
CREATE INDEX "Client_status_idx" ON "Client"("status");

-- CreateIndex
CREATE INDEX "Client_deletedAt_idx" ON "Client"("deletedAt");

-- CreateIndex
CREATE INDEX "ClientContact_clientId_idx" ON "ClientContact"("clientId");

-- CreateIndex
CREATE INDEX "Document_type_idx" ON "Document"("type");

-- CreateIndex
CREATE INDEX "Document_expiryDate_idx" ON "Document"("expiryDate");

-- CreateIndex
CREATE INDEX "DocumentLink_documentId_idx" ON "DocumentLink"("documentId");

-- CreateIndex
CREATE INDEX "DocumentLink_supplierId_idx" ON "DocumentLink"("supplierId");

-- CreateIndex
CREATE INDEX "DocumentLink_productId_idx" ON "DocumentLink"("productId");

-- CreateIndex
CREATE INDEX "DocumentLink_purchaseOrderId_idx" ON "DocumentLink"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "DocumentLink_importBatchId_idx" ON "DocumentLink"("importBatchId");

-- CreateIndex
CREATE INDEX "DocumentLink_clientId_idx" ON "DocumentLink"("clientId");

-- CreateIndex
CREATE INDEX "DocumentLink_salesOrderId_idx" ON "DocumentLink"("salesOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_poNumber_key" ON "PurchaseOrder"("poNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrder_supplierId_idx" ON "PurchaseOrder"("supplierId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_status_idx" ON "PurchaseOrder"("status");

-- CreateIndex
CREATE INDEX "PurchaseOrderLine_purchaseOrderId_idx" ON "PurchaseOrderLine"("purchaseOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "ImportBatch_batchNumber_key" ON "ImportBatch"("batchNumber");

-- CreateIndex
CREATE INDEX "ImportBatch_purchaseOrderId_idx" ON "ImportBatch"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "ImportBatch_status_idx" ON "ImportBatch"("status");

-- CreateIndex
CREATE INDEX "ImportBatchLine_importBatchId_idx" ON "ImportBatchLine"("importBatchId");

-- CreateIndex
CREATE INDEX "ImportBatchLine_productId_idx" ON "ImportBatchLine"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrder_soNumber_key" ON "SalesOrder"("soNumber");

-- CreateIndex
CREATE INDEX "SalesOrder_clientId_idx" ON "SalesOrder"("clientId");

-- CreateIndex
CREATE INDEX "SalesOrder_status_idx" ON "SalesOrder"("status");

-- CreateIndex
CREATE INDEX "SalesOrderLine_salesOrderId_idx" ON "SalesOrderLine"("salesOrderId");

-- CreateIndex
CREATE INDEX "StockMovement_productId_locationId_idx" ON "StockMovement"("productId", "locationId");

-- CreateIndex
CREATE INDEX "StockMovement_refType_refId_idx" ON "StockMovement"("refType", "refId");

-- CreateIndex
CREATE INDEX "Lead_kind_idx" ON "Lead"("kind");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierContact" ADD CONSTRAINT "SupplierContact_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierVetting" ADD CONSTRAINT "SupplierVetting_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierExportRecord" ADD CONSTRAINT "SupplierExportRecord_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPriceTier" ADD CONSTRAINT "SupplierPriceTier_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPriceTier" ADD CONSTRAINT "SupplierPriceTier_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSupplier" ADD CONSTRAINT "ProductSupplier_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSupplier" ADD CONSTRAINT "ProductSupplier_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPricing" ADD CONSTRAINT "ProductPricing_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPriceList" ADD CONSTRAINT "ClientPriceList_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPriceListItem" ADD CONSTRAINT "ClientPriceListItem_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "ClientPriceList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPriceListItem" ADD CONSTRAINT "ClientPriceListItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientContact" ADD CONSTRAINT "ClientContact_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentLink" ADD CONSTRAINT "DocumentLink_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentLink" ADD CONSTRAINT "DocumentLink_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentLink" ADD CONSTRAINT "DocumentLink_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentLink" ADD CONSTRAINT "DocumentLink_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentLink" ADD CONSTRAINT "DocumentLink_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentLink" ADD CONSTRAINT "DocumentLink_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentLink" ADD CONSTRAINT "DocumentLink_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatchLine" ADD CONSTRAINT "ImportBatchLine_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatchLine" ADD CONSTRAINT "ImportBatchLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderLine" ADD CONSTRAINT "SalesOrderLine_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderLine" ADD CONSTRAINT "SalesOrderLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "StockLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

