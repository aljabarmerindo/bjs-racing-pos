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

## Files Already Modified

| File | Change | Status |
|------|--------|--------|
| `src/pages/Pos.jsx` (`processCheckout`) | Removed direct `.update({ stok })` call; kept `stock_logs.insert()`. Added `isSubmitting` (useState) guard. | ✅ Done — deployed on Vercel (17:40:53) |
| Supabase DB `process_po_receipt_v2` function | Removed direct `stok = stok + ...` from `UPDATE products`; kept `stock_logs.insert`. | ✅ Done via Management API |
| Supabase DB `process_po_receipt` function (v1) | Same fix — removed direct stock update; kept `stock_logs.insert`. | ✅ Done via Management API |
| `supabase/migrations/20260801000000_fix_double_stock_update.sql` (new) | Documents the trigger for the POS repo. | ✅ Done |
| `src/pages/DetailPembelian.jsx` (`handleProcessReceipt`) | Removed direct stok update. | ✅ Done |
| `src/hooks/useAIPosAgent.js` | Added `processingRef` lock + debounce for AI voice search. | ✅ Done |
| `src/components/AIAssistantModal.jsx` | Added debounce guard for AI voice input. | ✅ Done |

## Remaining Action Items

### 1. Fix Double-Click Race Condition in `processCheckout`

**File**: `src/pages/Pos.jsx`

Replace the `useState`-based guard with a `useRef` for synchronous protection:

```javascript
// Current (line ~403 area — add this):
import { useRef } from "react";
const isSubmittingRef = useRef(false);

// In processCheckout (line 840):
const processCheckout = async (isPaid) => {
  if (isSubmittingRef.current) return;
  isSubmittingRef.current = true;
  // ... rest of function ...
  // IMPORTANT: Reset in finally block:
  // isSubmittingRef.current = false;
```

This prevents both double-clicks and rapid Enter-key triggers from causing duplicate `stock_logs` inserts.

### 2. Ensure Product List Refreshes After Checkout (OK branch)

**File**: `src/pages/Pos.jsx`, around line 928-931

Add `forceRefresh()` call in the receipt confirmation "OK" branch:

```javascript
if (window.confirm(successMsg + "\n\nApakah Anda ingin menampilkan struk?")) {
  setReceiptData({ ...newTransaction, customer_data: selectedCustomer });
  forceRefresh();  // ← ADD THIS
} else {
  resetPage();
}
```

### 3. Add Button Disable During Submission

**File**: `src/pages/Pos.jsx`, around line 358-371

The "Bayar" button currently has no `disabled` state for `isSubmitting`. Add it to prevent UI confusion:

```javascript
<button
  onClick={() => processCheckout(true)}
  disabled={cart.length === 0 || isSubmitting || parseFloat(cashPaid) < finalTotal + shippingCost}
  // ...
>
```

## Risk & Notes

- The trigger `handle_stock_log_change` was migrated from the **bjs-racing-store** repo, not the **bjs-racing-pos** repo. Both share the same Supabase DB.
- If the trigger is ever dropped, stock will stop updating because the frontend will no longer have the direct `.update({ stok })`. The migration should be added to `bjs-racing-pos` to ensure the trigger is recreated if the DB is reset.
- No triggers exist on `transactions` table directly — the double decrement in POS is purely caused by the frontend code + the `stock_logs` trigger interaction.

---

## Post-Fix Investigation: Why User Still Reports Double Decrement

### Evidence the Fix IS Working

After the Vercel deployment (Sat Aug 01 2026 17:40:53 GMT, matching commit `502ea0f` at 17:40:46), the `stock_logs` table shows correct single decrements:

| Timestamp (UTC) | Product ID (prefix) | `perubahan` | Trx ID (prefix) |
|---|---|---|---|
| 2026-08-01 17:47:33 | `ab802418...` | **-1** | `724cf308...` |
| 2026-08-01 17:50:07 | `ab802418...` | **-1** | `227764d2...` |

Product "Test" (ab802418) currently has `stok=995`, matching expected decrease from these two single-quantity checkouts. Each entry has exactly one `stock_logs` row with `perubahan=-1`.

**Deployed Vercel bundle** (`index-BLF0FbVh.js`) confirmed to contain the fix — no `.from("products").update({stok:...})` in checkout path; only `stock_logs.insert()` with `perubahan: -item.quantity`.

### Most Likely Explanation

The user tested checkout **before** the Vercel deployment completed:

1. User pushed commits but Vercel auto-deploy was broken (git remote lacked GitHub token → no webhook triggered).
2. Fix was committed at 17:12:19 (`cea9309`) and 17:40:46 (`502ea0f`).
3. Git remote was reconfigured with GitHub token → push triggered Vercel deployment at 17:40:53.
4. User tested between 14:59–15:16 (before deployment), when the old code (direct `products.stok` update + trigger) was still live.

### Remaining Vulnerability: Double-Click Race Condition

The `isSubmitting` guard in `processCheckout` uses `useState`, which is **asynchronous in React**. If the user double-clicks the "Bayar" button quickly:

```javascript
// Line 840-841 (CURRENT — vulnerable)
const processCheckout = async (isPaid) => {
  if (isSubmitting) return;  // ← Race: both clicks see false before state updates
  ...
  setIsSubmitting(true);     // ← Async, doesn't prevent second call
```

Both click handlers execute synchronously before React processes the state update, so both pass the guard and insert into `stock_logs` — each triggering the decrement, resulting in a **2x decrease** (identical to the original bug symptom).

**Fix**: Use `useRef` for synchronous guard, same pattern already used in `useAIPosAgent.js` (`processingRef`):

```javascript
const isSubmittingRef = useRef(false);

const processCheckout = async (isPaid) => {
  if (isSubmittingRef.current) return;
  isSubmittingRef.current = true;
  ...
  // Reset in finally block:
  // isSubmittingRef.current = false;
```

### Secondary Issue: Product List Not Refreshed After Checkout

When user clicks "OK" on the receipt confirm dialog (line 928-931), `resetPage()` is NOT called:

```javascript
if (window.confirm(successMsg + "\n\nApakah Anda ingin menampilkan struk?")) {
  setReceiptData({ ...newTransaction, customer_data: selectedCustomer });
  // ← NO forceRefresh() / setRefreshTrigger() called
} else {
  resetPage();  // ← Only called when user cancels receipt
}
```

This means product cards on the POS page show **stale stok** until a manual page refresh. The user may see outdated values, especially if testing repeatedly.

**Fix**: Call `forceRefresh()` in both branches (or after `setReceiptData`).

### Verification Steps (Post-Fix)

1. Clear browser cache/Ctrl+F5, then do a fresh checkout of 1 item.
2. Check `stock_logs`: should have exactly 1 entry with `perubahan = -1` for that transaction.
3. Check `products.stok`: should decrease by exactly 1.
4. Click "Bayar" button rapidly (double-click test): if guard is still `useState`, the second click may create a duplicate `stock_logs` entry.