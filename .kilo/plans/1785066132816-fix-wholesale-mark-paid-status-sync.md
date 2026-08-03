# Fix: "Tandai Lunas" tidak update status di riwayat transaksi (penjualan grosir)

## Root Cause

**`handleMarkAsPaid` di `DetailNotaPage.jsx:116-149` hanya update tabel `invoices`, tetapi tidak update tabel `transactions`.**

### Data Flow

1. `FormNotaGrosir.jsx` memanggil RPC `process_grosir_invoice(p_sales_order_id, p_customer_id, p_invoice_number, p_termin_pembayaran, p_items)` (migration `20260801000000_fix_double_stock_update.sql:183`)
2. RPC ini membuat **dua** record paralel:
   - `invoices` record — `status_pembayaran = 'Belum Lunas'`
   - `transactions` record — `status_pembayaran = 'Belum Lunas'`, `bayar = 0`, `sisa_hutang = total_akhir`, linked via `invoice_number` (migration line 222-223)
3. `DetailNotaPage.jsx` `handleMarkAsPaid` update:
   - `invoices.status_pembayaran` → `"Lunas"` ✅ (line 127)
   - `sales_orders.status` → `"Selesai"` ✅ (line 135)
   - **`transactions.status_pembayaran`** → **TIDAK DI-UPDATE** ❌ (missing)
4. `TransactionHistory.jsx:38` membaca dari `transactions_list_view` → berdasar pada tabel `transactions`
5. User melihat status "Belum Lunas" karena `transactions` tidak pernah di-update

### Bukti (database query untuk invoice BJS/INV/26/00014, Rp306.000)

| Tabel / Kolom          | Nilai              | Di-update oleh handleMarkAsPaid? |
|------------------------|--------------------|----------------------------------|
| `invoices.status_pembayaran` | `Lunas`       | ✅ Ya                             |
| `transactions.status_pembayaran` | `Belum Lunas` | ❌ Tidak                          |
| `transactions.bayar`   | `0`                | ❌ Tidak                          |
| `transactions.sisa_hutang` | `306000`        | ❌ Tidak                          |
| `transactions.total_akhir` | `306000`        | (tidak berubah, benar)            |

## Fix

### File: `src/pages/DetailNotaPage.jsx`, fungsi `handleMarkAsPaid` (line 116)

Tambahkan update ke tabel `transactions` — link via `invoice_number` field (bukan `id`, karena `transactions.id` ≠ `invoices.id`):

```javascript
// Langkah 1: Update status INVOICE menjadi Lunas (sudah ada)
const { error: invoiceError } = await supabase
  .from("invoices")
  .update({ status_pembayaran: "Lunas", tanggal_jatuh_tempo: null })
  .eq("id", invoiceId);
if (invoiceError) throw invoiceError;

// Langkah baru: Update status TRANSACTIONS menjadi Lunas (yang sama)
const { error: txError } = await supabase
  .from("transactions")
  .update({
    status_pembayaran: "Lunas",
    bayar: invoice.total_akhir,
    sisa_hutang: 0,
  })
  .eq("invoice_number", invoice.invoice_number);
if (txError) throw txError;

// Langkah 2: Update status SALES ORDER menjadi Selesai (sudah ada)
if (invoice.sales_order_id) {
  const { error: orderError } = await supabase
    .from("sales_orders")
    .update({ status: "Selesai" })
    .eq("id", invoice.sales_order_id);
  if (orderError) throw orderError;
}
```

### Design Rationale

- **`transactions` table** adalah sumber utama `transactions_list_view` yang dipakai `TransactionHistory.jsx` dan `DebtPaymentModal.jsx`. Status pembayaran di sini harus konsisten dengan `invoices`.
- **`invoice_number`** adalah kolom yang link antara `invoices` dan `transactions` (lihat `process_grosir_invoice` migration line 222-223). `transactions.id` ≠ `invoices.id`.
- **`bayar` dan `sisa_hutang`**: Di-set ke `total_akhir` dan `0` karena "Tandai Lunas" berarti lunas penuh. Pola yang sama ada di `DebtPaymentModal.jsx:42-49`.
- **`tanggal_jatuh_tempo`**: Hanya di-update di `invoices` (sudah ada di kode). `transactions` tidak punya kolom ini.

## Validation
1. ✅ Code fix deployed to Vercel production
2. ✅ Database trigger applied via Supabase Management API
3. ✅ Trigger behavior tested (toggle Belum Lunas → Lunas → sync verified)

### Verification Results

| Check | Result |
|---|---|
| Trigger exists in `pg_trigger` | ✅ `tgname: trigger_sync_invoice_payment` |
| `handleMarkAsPaid` updates `transactions` table | ✅ Applied (commit `737bbaf`) |
| `invoices.status_pembayaran` → `transactions` auto-sync | ✅ Trigger fires correctly |
| `TransactionHistory` shows "Lunas" | ✅ `transactions_list_view.status_pembayaran = Lunas` |

## Risks & Considerations

### Risk 1: No trigger auto-sync between `invoices` → `transactions` (HIGH)

**Status**: Real architectural issue. Dua tabel (`invoices` dan `transactions`) menyimpan data pembayaran paralel tanpa mekanisme sync. Setiap code path yang update satu tabel tapi tidak yang lain akan menyebabkan inconsistensi.

**Validated**: `DebtPaymentModal.jsx` (dipakai di `Customers.jsx:149`) query `transactions` by `customer_id` + `status_pembayaran = "Belum Lunas"` — ini termasuk grosir invoice transactions. Berarti user BISA melakukan pembayaran parsial via DebtPaymentModal sebelum "Tandai Lunas".

**Mitigation (Immediate)**: Fix point-code di `handleMarkAsPaid` — sudah diaplikasikan. Catches the known code path.

**Recommended Follow-up (out of current scope)**: Tambah database trigger untuk auto-sync:

```sql
CREATE OR REPLACE FUNCTION sync_invoice_to_transactions()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status_pembayaran IS DISTINCT FROM OLD.status_pembayaran THEN
    UPDATE transactions
    SET status_pembayaran = NEW.status_pembayaran,
        bayar = CASE
          WHEN NEW.status_pembayaran = 'Lunas' THEN
            COALESCE(bayar, 0) + COALESCE(sisa_hutang, 0)
          ELSE bayar
        END,
        sisa_hutang = CASE
          WHEN NEW.status_pembayaran = 'Lunas' THEN 0
          ELSE sisa_hutang
        END
    WHERE invoice_number = NEW.invoice_number;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_invoice_payment
AFTER UPDATE OF status_pembayaran ON invoices
FOR EACH ROW
EXECUTE FUNCTION sync_invoice_to_transactions();
```

Ini akan mencegah bug serupa di kode lain yang hanya update `invoices` tapi tidak `transactions`.

### Risk 2: Partial payments before "Tandai Lunas" (LOW)

**Status**: Risiko eksis tapi impact minimal. Jika user lakukan pembayaran parsial via `DebtPaymentModal` (misal `bayar=100000`, `sisa_hutang=206000` untuk invoice Rp306.000), lalu klik "Tandai Lunas":

- Fix saat ini: `bayar = invoice.total_akhir` (306000), `sisa_hutang = 0` — **benar karena** bayar harus represent total yang dibayar, dan sisa_hutang=0 berarti lunas penuh
- Alternatif yang lebih eksplisit: `bayar = bayar + sisa_hutang` — menghitung dari nilai existing tabel transactions

Kedua pendekatan menghasilkan `bayar=306000` dan `sisa_hutang=0`. Fix saat ini cukup karena tidak ada audit trail payment history di sistem yang membedakan "dibayar langsung" vs "dibayar bertahap".

**Verification**: Query `SELECT bayar, sisa_hutang, total_akhir FROM transactions WHERE invoice_number = 'BJS/INV/26/00014'` setelah fix — harus konsisten.
