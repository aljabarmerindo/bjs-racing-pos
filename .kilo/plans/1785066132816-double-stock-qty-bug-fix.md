# Double Stock/Qty Bug — Root Cause & Fix Plan

## Problem

1. **POS checkout**: selling 1 item reduces stock by 2.
2. **Pembelian receipt**: receiving 1 qty increases stock by 2.

## Root Cause

A database trigger `handle_stock_log_change` fires **AFTER INSERT ON stock_logs** and updates `products.stok`:

```sql
CREATE TRIGGER trigger_handle_stock_log_change
  AFTER INSERT ON public.stock_logs
  FOR EACH ROW EXECUTE FUNCTION handle_stock_log_change()
```

```sql
-- handle_stock_log_change()
IF NEW.product_id IS NOT NULL THEN
  UPDATE public.products
  SET stok = stok + NEW.perubahan, ...
  WHERE id = NEW.product_id;
END IF;
```

Both the application code AND this trigger modify `products.stok`, causing double changes:

### POS Checkout (`src/pages/Pos.jsx`, `processCheckout`, lines 880–890)
1. Frontend: `UPDATE products SET stok = stok - item.quantity` (direct update, line 883)
2. Frontend: `INSERT INTO stock_logs (perubahan = -item.quantity)` (line 885)
3. **Trigger fires**: `UPDATE products SET stok = stok + (-item.quantity)` (decrement again)

→ Stock decreases by `2 × item.quantity` instead of `1 ×`.

### Purchase Order Receipt (`process_po_receipt_v2` stored procedure, called from `src/pages/DetailPembelian.jsx` line 242)
1. Function: `UPDATE products SET stok = stok + quantity_to_add_to_stock` (direct update)
2. Function: `INSERT INTO stock_logs (perubahan = quantity_to_add_to_stock)`
3. **Trigger fires**: `UPDATE products SET stok = stok + quantity_to_add_to_stock` (increment again)

→ Stock increases by `2 × quantity_to_add_to_stock` instead of `1 ×`.

### Old `process_po_receipt` (v1) — same bug
The v1 function also does both a direct `UPDATE products SET stok = stok + v_quantity` AND an `INSERT INTO stock_logs`. Same double-increment issue. (Not currently called from the codebase, but should be fixed or removed.)

## Scope

- Both `bjs-racing-pos` and `bjs-racing-store` projects share the same Supabase DB (`ykotzsmncvyfveypeevb`).
- The trigger migration lives in `bjs-racing-store/supabase/migrations/2026_07_26_stock_trigger.sql`.
- `bjs-racing-pos` repo has no local migration for this trigger (it was created in DB externally).

## Fix Strategy

**Approach: Remove all direct `products.stok` updates; let the trigger be the single source of truth via `stock_logs` inserts.**

### 1. Fix `src/pages/Pos.jsx` — `processCheckout`

**Current (lines 880–890):**
```javascript
for (const item of cart) {
  await supabase
    .from("products")
    .update({ stok: item.stok - item.quantity })
    .eq("id", item.id);
  await supabase.from("stock_logs").insert({
    product_id: item.id,
    perubahan: -item.quantity,
    keterangan: `Terjual via POS (Trx ID: ${newTransaction.id})`,
  });
}
```

**Fix:** Remove the direct `.update({ stok: ... })` call. Keep only the `stock_logs.insert()`. The trigger will decrement stock automatically.

```javascript
for (const item of cart) {
  await supabase.from("stock_logs").insert({
    product_id: item.id,
    perubahan: -item.quantity,
    keterangan: `Terjual via POS (Trx ID: ${newTransaction.id})`,
  });
}
```

Also add an early-return guard at the top of `processCheckout`:
```javascript
if (isSubmitting) return;
```

### 2. Fix `process_po_receipt_v2` stored procedure (via Management API)

Remove the line:
```sql
stok = stok + item_data.quantity_to_add_to_stock,
```

from the `UPDATE public.products` statement. Keep the `INSERT INTO stock_logs` — the trigger will handle the stock increment.

New function body:
```sql
CREATE OR REPLACE FUNCTION public.process_po_receipt_v2(...)
...
        UPDATE public.products 
        SET 
            harga_beli = item_data.final_landed_cost,
            harga_jual = COALESCE(item_data.new_selling_price, harga_jual),
            updated_at = now()
        WHERE id = item_data.product_id;

        INSERT INTO public.stock_logs (product_id, perubahan, keterangan) 
        VALUES (item_data.product_id, item_data.quantity_to_add_to_stock, 'Penerimaan dari PO #' || v_po_number);
...
```

This change must be applied to the live Supabase database via the Management API (POST to `/database/query`).

### 3. Fix `process_po_receipt` (v1) stored procedure (same approach)

Remove the direct stock update line:
```sql
UPDATE public.products SET stok = stok + v_quantity, ...
```
→
```sql
UPDATE public.products SET harga_beli = v_new_purchase_price, harga_jual = COALESCE(v_new_selling_price, harga_jual) WHERE id = v_product_id;
```

Keep the `INSERT INTO stock_logs` — the trigger handles stock.

### 4. Create a new migration file in `bjs-racing-pos`

Add `supabase/migrations/20260801000000_fix_double_stock_update.sql` documenting the trigger (so the POS repo is aware of it):
```sql
-- Document: handle_stock_log_change trigger exists in the shared Supabase DB.
-- Stock is updated via stock_logs inserts + trigger. Do NOT also UPDATE products.stok directly.
```

## Validation Steps

1. **POS checkout**: Sell 1 item → verify `products.stok` decreases by exactly 1, `stock_logs` has one entry with `perubahan = -1`.
2. **Pembelian receipt**: Receive 1 PO item → verify `products.stok` increases by exactly `quantity_to_add_to_stock`, `stock_logs` has one entry.
3. **Check `product_history_logs`**: The `log_product_changes` trigger should log the stock change only once (it fires AFTER the trigger updates `products.stok`).
4. **Edge case**: Verify that manual stock adjustments (e.g., via Produk page) still work correctly — they should insert into `stock_logs` rather than updating `products.stok` directly. (Check if any code path still does direct `stok` updates outside the fixed areas.)

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/Pos.jsx` (lines 880–890) | Remove direct `.update({ stok })` call; keep `stock_logs.insert()`. Add `isSubmitting` guard. |
| Supabase DB `process_po_receipt_v2` function | Remove direct `stok = stok + ...` from `UPDATE products`; keep `stock_logs.insert`. |
| Supabase DB `process_po_receipt` function | Same fix — remove direct stock update; keep `stock_logs.insert`. |
| `supabase/migrations/20260801000000_fix_double_stock_update.sql` (new) | Document the trigger for the POS repo. |

## Risk & Notes

- The trigger `handle_stock_log_change` was migrated from the **bjs-racing-store** repo, not the **bjs-racing-pos** repo. Both share the same Supabase DB.
- If the trigger is ever dropped, stock will stop updating because the frontend will no longer have the direct `.update({ stok })`. The migration should be added to `bjs-racing-pos` to ensure the trigger is recreated if the DB is reset.
- No triggers exist on `transactions` table directly — the double decrement in POS is purely caused by the frontend code + the `stock_logs` trigger interaction.