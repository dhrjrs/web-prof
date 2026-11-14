# Database (PostgreSQL)

- `schema.sql` - struktur semua tabel (wajib).
- `data.sql` - data saat ini dari database Neon (opsional).

## Opsi A: Tetap pakai Neon (paling mudah)

Database sudah ada di cloud. Cukup isi `DATABASE_URL` di `.env.local` dengan
connection string dari dashboard Neon (https://console.neon.tech) atau dari menu Vars di v0.

## Opsi B: PostgreSQL lokal

1. Install PostgreSQL (https://www.postgresql.org/download/) atau Docker:
   `docker run --name toko-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16`
2. Buat database dan impor:
   ```bash
   createdb -U postgres toko
   psql -U postgres -d toko -f database/schema.sql
   psql -U postgres -d toko -f database/data.sql
   ```
   (Bisa juga lewat pgAdmin / DBeaver: buka Query Tool, jalankan isi kedua file.)
3. Isi `.env.local`:
   ```
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/toko
   ```
4. Jalankan `pnpm dev`.
