-- Feature audit (Nov 2026): coupons, cash on delivery, unfinished-checkout follow-up.
-- Written to be safe to run on a database that already has these objects
-- (e.g. when the init migration was generated from the newer schema).

DO $$ BEGIN
  CREATE TYPE "PaymentMethod" AS ENUM ('UPI', 'COD');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CouponKind" AS ENUM ('PERCENT', 'FLAT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "discount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "couponCode" TEXT,
  ADD COLUMN IF NOT EXISTS "codFee" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'UPI';

CREATE TABLE IF NOT EXISTS "Coupon" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "kind" "CouponKind" NOT NULL DEFAULT 'PERCENT',
  "value" INTEGER NOT NULL,
  "minOrder" INTEGER NOT NULL DEFAULT 0,
  "maxDiscount" INTEGER,
  "forCorporate" BOOLEAN NOT NULL DEFAULT false,
  "expiresAt" TIMESTAMP(3),
  "usageLimit" INTEGER,
  "usedCount" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Coupon_code_key" ON "Coupon"("code");

CREATE TABLE IF NOT EXISTS "CheckoutLead" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "name" TEXT,
  "cart" JSONB NOT NULL,
  "subtotal" INTEGER NOT NULL,
  "orderId" TEXT,
  "contactedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CheckoutLead_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CheckoutLead_sessionId_key" ON "CheckoutLead"("sessionId");
CREATE INDEX IF NOT EXISTS "CheckoutLead_createdAt_idx" ON "CheckoutLead"("createdAt");
