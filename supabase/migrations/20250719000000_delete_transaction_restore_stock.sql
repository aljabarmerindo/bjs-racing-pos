-- Migration: delete_transaction_and_restore_stock
-- Permanently deletes a transaction and restores the product stock that was
-- deducted at the time of sale. SECURITY DEFINER so the anon key can perform
-- the write while bypassing RLS.
--
-- Stock restoration is handled by inserting a row into stock_logs with a
-- positive perubahan; the handle_stock_log_change trigger on stock_logs
-- updates products.stok automatically. We must NOT also directly UPDATE
-- products.stok here, or the stock would be doubled.

CREATE OR REPLACE FUNCTION public.delete_transaction_and_restore_stock(p_transaction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_items jsonb;
  v_item  jsonb;
  v_product_id uuid;
  v_qty   int;
BEGIN
  -- Fetch the items JSON array for the transaction (may be NULL).
  SELECT items INTO v_items
  FROM public.transactions
  WHERE id = p_transaction_id;

  -- Gracefully handle missing transaction or NULL/empty items.
  IF v_items IS NOT NULL THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
    LOOP
      v_product_id := COALESCE(
        (v_item->>'product_id')::uuid,
        (v_item->>'id')::uuid
      );
      v_qty := COALESCE(
        (v_item->>'kuantitas')::int,
        (v_item->>'quantity')::int,
        0
      );

      IF v_product_id IS NOT NULL AND v_qty > 0 THEN
        INSERT INTO public.stock_logs (product_id, perubahan, keterangan)
        VALUES (
          v_product_id,
          v_qty,
          'Restore stok dari penghapusan transaksi ' || p_transaction_id::text
        );
      END IF;
    END LOOP;
  END IF;

  -- Finally remove the transaction itself.
  DELETE FROM public.transactions
  WHERE id = p_transaction_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_transaction_and_restore_stock(uuid) TO anon, authenticated;
