-- Data saat ini dari database
-- Jalankan setelah schema.sql.

BEGIN;

-- customers (1 baris)
INSERT INTO "customers" ("id", "name", "phone", "address", "category_id", "created_at") VALUES (2, 'dhr', '12321412', NULL, NULL, '2026-11-14T08:41:58.158Z');

-- gallon_loans (1 baris)
INSERT INTO "gallon_loans" ("id", "customer_id", "qty", "returned_qty", "deposit", "due_date", "note", "borrowed_at", "returned_at") VALUES (1, 2, 100, 0, 0, '2026-11-15T00:00:00.000Z', NULL, '2026-11-14T08:44:07.654Z', NULL);

-- payments (1 baris)
INSERT INTO "payments" ("id", "sale_id", "kind", "amount", "method", "note", "created_at") VALUES (1, 2, 'penerimaan', 6000000, 'tunai', NULL, '2026-11-14T08:43:34.724Z');

-- products (1 baris)
INSERT INTO "products" ("id", "sku", "name", "unit", "price", "discount_percent", "stock", "min_stock", "category_id", "created_at") VALUES (2, 'AQ-1500', 'Air Mineral 1.5L', 'pcs', 6000, 0, 1000, 0, NULL, '2026-11-14T08:40:51.311Z');

-- sale_items (1 baris)
INSERT INTO "sale_items" ("id", "sale_id", "product_id", "qty", "price", "discount_percent", "returned_qty") VALUES (3, 2, 2, 1000, 6000, 0, 0);

-- sales (1 baris)
INSERT INTO "sales" ("id", "number", "stage", "customer_id", "salesperson_id", "category_id", "subtotal", "discount", "total", "paid", "notes", "shipped_at", "invoiced_at", "created_at") VALUES (2, 'PJ-MWG5REJX', 'lunas', 2, NULL, NULL, 6000000, 0, 6000000, 6000000, NULL, '2026-11-14T08:43:21.739Z', '2026-11-14T08:43:28.676Z', '2026-11-14T08:43:00.364Z');

-- settings (1 baris)
INSERT INTO "settings" ("key", "value") VALUES ('gallon_total', '1000');

-- Sinkronkan sequence id agar data baru tidak bentrok
SELECT setval(pg_get_serial_sequence('"categories"', 'id'), COALESCE((SELECT MAX("id") FROM "categories"), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('"check_ins"', 'id'), COALESCE((SELECT MAX("id") FROM "check_ins"), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('"customers"', 'id'), COALESCE((SELECT MAX("id") FROM "customers"), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('"gallon_loans"', 'id'), COALESCE((SELECT MAX("id") FROM "gallon_loans"), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('"payments"', 'id'), COALESCE((SELECT MAX("id") FROM "payments"), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('"products"', 'id'), COALESCE((SELECT MAX("id") FROM "products"), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('"sale_items"', 'id'), COALESCE((SELECT MAX("id") FROM "sale_items"), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('"sale_returns"', 'id'), COALESCE((SELECT MAX("id") FROM "sale_returns"), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('"sales"', 'id'), COALESCE((SELECT MAX("id") FROM "sales"), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('"sales_targets"', 'id'), COALESCE((SELECT MAX("id") FROM "sales_targets"), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('"salespeople"', 'id'), COALESCE((SELECT MAX("id") FROM "salespeople"), 0) + 1, false);

COMMIT;
