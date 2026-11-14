-- Skema database aplikasi toko (PostgreSQL)
-- Jalankan file ini di database kosong.

CREATE TABLE IF NOT EXISTS "categories" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "categories_pkey" PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS "check_ins" (
  "id" SERIAL NOT NULL,
  "salesperson_id" INTEGER NOT NULL,
  "customer_id" INTEGER NOT NULL,
  "note" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "check_ins_pkey" PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS "customers" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "address" TEXT,
  "category_id" INTEGER,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "customers_pkey" PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS "gallon_loans" (
  "id" SERIAL NOT NULL,
  "customer_id" INTEGER NOT NULL,
  "qty" INTEGER NOT NULL,
  "returned_qty" INTEGER NOT NULL DEFAULT 0,
  "deposit" INTEGER NOT NULL DEFAULT 0,
  "due_date" DATE,
  "note" TEXT,
  "borrowed_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "returned_at" TIMESTAMPTZ,
  CONSTRAINT "gallon_loans_pkey" PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS "payments" (
  "id" SERIAL NOT NULL,
  "sale_id" INTEGER NOT NULL,
  "kind" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "method" TEXT NOT NULL DEFAULT 'tunai'::text,
  "note" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "payments_pkey" PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS "products" (
  "id" SERIAL NOT NULL,
  "sku" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "unit" TEXT NOT NULL DEFAULT 'pcs'::text,
  "price" INTEGER NOT NULL DEFAULT 0,
  "discount_percent" INTEGER NOT NULL DEFAULT 0,
  "stock" INTEGER NOT NULL DEFAULT 0,
  "min_stock" INTEGER NOT NULL DEFAULT 0,
  "category_id" INTEGER,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "products_sku_key" UNIQUE (sku),
  CONSTRAINT "products_pkey" PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS "sale_items" (
  "id" SERIAL NOT NULL,
  "sale_id" INTEGER NOT NULL,
  "product_id" INTEGER NOT NULL,
  "qty" INTEGER NOT NULL,
  "price" INTEGER NOT NULL,
  "discount_percent" INTEGER NOT NULL DEFAULT 0,
  "returned_qty" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "sale_items_pkey" PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS "sale_returns" (
  "id" SERIAL NOT NULL,
  "sale_id" INTEGER NOT NULL,
  "sale_item_id" INTEGER NOT NULL,
  "product_id" INTEGER NOT NULL,
  "qty" INTEGER NOT NULL,
  "amount" INTEGER NOT NULL DEFAULT 0,
  "reason" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "sale_returns_pkey" PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS "sales" (
  "id" SERIAL NOT NULL,
  "number" TEXT NOT NULL,
  "stage" TEXT NOT NULL DEFAULT 'penawaran'::text,
  "customer_id" INTEGER NOT NULL,
  "salesperson_id" INTEGER,
  "category_id" INTEGER,
  "subtotal" INTEGER NOT NULL DEFAULT 0,
  "discount" INTEGER NOT NULL DEFAULT 0,
  "total" INTEGER NOT NULL DEFAULT 0,
  "paid" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "shipped_at" TIMESTAMPTZ,
  "invoiced_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "sales_number_key" UNIQUE (number),
  CONSTRAINT "sales_pkey" PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS "sales_targets" (
  "id" SERIAL NOT NULL,
  "period" TEXT NOT NULL,
  "salesperson_id" INTEGER,
  "amount" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "sales_targets_pkey" PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS "salespeople" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "commission_percent" NUMERIC(5,2) NOT NULL DEFAULT '0'::numeric,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "salespeople_pkey" PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS "settings" (
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  CONSTRAINT "settings_pkey" PRIMARY KEY (key)
);

