-- Migration: fix double stock update (POS + Pembelian)
--
-- BUG: Stock was being modified twice whenever a transaction was created,
-- a purchase order receipt was processed, a wholesale invoice was created,
-- or a transaction was deleted.
--
-- ROOT CAUSE:
--   The trigger `handle_stock_log_change` (created in
--   2026_07_26_stock_trigger.sql in the bjs-racing-store repo) fires
--   AFTER INSERT ON stock_logs and automatically does:
--     UPDATE products SET stok = stok + NEW.perubahan WHERE id = NEW.product_id;
--
--   However, application code AND stored procedures were ALSO directly
--   updating products.stok at the same time, causing every stock change
--   to be applied twice.
--
-- FIX:
--   Remove all direct `UPDATE products SET stok = ...` statements from:
--     1. process_po_receipt_v2  (purchase order receipt - Pembelian)
--     2. process_po_receipt     (legacy purchase order receipt)
--     3. process_grosir_invoice (wholesale invoice creation)
--     4. delete_transaction_and_restore_stock (transaction deletion)
--
--   Keep all INSERT INTO stock_logs calls. The trigger handles the stock
--   update as the single source of truth.
--
--   In the frontend Pos.jsx processCheckout, the direct
--   supabase.from("products").update({ stok }) call was removed;
--   only the stock_logs insert remains.

-- 0. Drop the old unused overload of process_po_receipt (different arg signature)
DROP FUNCTION IF EXISTS public.process_po_receipt(uuid, text, jsonb);

-- 1. process_po_receipt_v2: remove direct stok update, keep stock_logs insert
CREATE OR REPLACE FUNCTION public.process_po_receipt_v2(p_po_id uuid, p_invoice_image_url text, p_shipping_cost numeric, p_discount_amount numeric, p_other_costs numeric, p_payment_status text, p_due_date date, p_total_amount numeric, p_items jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    item_data record;
    v_po_number text;
BEGIN
    SELECT po_number INTO v_po_number FROM public.purchase_orders WHERE id = p_po_id;

    UPDATE public.purchase_orders
    SET
        status = 'Selesai',
        invoice_image_url = p_invoice_image_url,
        shipping_cost = p_shipping_cost,
        discount_amount = p_discount_amount,
        other_costs = p_other_costs,
        payment_status = p_payment_status,
        due_date = p_due_date,
        total_amount = p_total_amount
    WHERE id = p_po_id;

    FOR item_data IN SELECT * FROM jsonb_populate_recordset(null::po_item_receipt_type, p_items)
    LOOP
        UPDATE public.purchase_order_items
        SET
            quantity_received = item_data.quantity_received,
            purchase_price = item_data.final_landed_cost
        WHERE id = item_data.po_item_id;

        -- NOTE: stok is NOT updated here directly. The stock_logs insert
        -- below triggers handle_stock_log_change which updates stok.
        UPDATE public.products
        SET
            harga_beli = item_data.final_landed_cost,
            harga_jual = COALESCE(item_data.new_selling_price, harga_jual),
            updated_at = now()
        WHERE id = item_data.product_id;

        INSERT INTO public.stock_logs (product_id, perubahan, keterangan)
        VALUES (item_data.product_id, item_data.quantity_to_add_to_stock, 'Penerimaan dari PO #' || v_po_number);
    END LOOP;
END;
$$;

-- 2. process_po_receipt (v1): same fix
CREATE OR REPLACE FUNCTION public.process_po_receipt(p_po_id uuid, p_invoice_image_url text, p_new_purchase_price numeric, p_new_selling_price numeric, p_payment_status text, p_due_date date, p_total_amount numeric, p_items jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    item_record jsonb;
    v_product_id uuid;
    v_quantity integer;
    v_new_purchase_price numeric;
    v_new_selling_price numeric;
    v_total_amount numeric := 0;
    v_supplier_name text;
    v_po_number text;
BEGIN
    PERFORM set_config('request.bypass_rls', 'on', true);

    FOR item_record IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (item_record->>'product_id')::uuid;
        v_quantity := (item_record->>'quantity_ordered')::integer;
        v_new_purchase_price := (item_record->>'new_purchase_price')::numeric;
        v_new_selling_price := (item_record->>'new_selling_price')::numeric;

        UPDATE public.purchase_order_items SET purchase_price = v_new_purchase_price, quantity_received = v_quantity WHERE purchase_order_id = p_po_id AND product_id = v_product_id;

        -- NOTE: stok is NOT updated here directly. The stock_logs insert
        -- below triggers handle_stock_log_change which updates stok.
        UPDATE public.products SET harga_beli = v_new_purchase_price, harga_jual = COALESCE(v_new_selling_price, harga_jual) WHERE id = v_product_id;

        INSERT INTO public.stock_logs(product_id, perubahan, keterangan) VALUES (v_product_id, v_quantity, 'Penerimaan barang dari PO');
        v_total_amount := v_total_amount + (v_new_purchase_price * v_quantity);
    END LOOP;

    SELECT po.po_number, s.nama_supplier INTO v_po_number, v_supplier_name FROM public.purchase_orders po LEFT JOIN public.suppliers s ON po.supplier_id = s.id WHERE po.id = p_po_id;
    UPDATE public.purchase_orders SET status = 'Selesai', total_amount = v_total_amount, invoice_image_url = p_invoice_image_url WHERE id = p_po_id;

    INSERT INTO public.expenses(tanggal, kategori_pengeluaran, keterangan, jumlah)
    VALUES (CURRENT_DATE, 'Pembelian Stok', 'Pembelian ke ' || COALESCE(v_supplier_name, 'Supplier Umum') || ' (PO: ' || v_po_number || ')', v_total_amount);
END;
$$;

-- 3. delete_transaction_and_restore_stock: remove direct stok update
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
  SELECT items INTO v_items
  FROM public.transactions
  WHERE id = p_transaction_id;

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
        -- NOTE: stok is NOT updated here directly. The stock_logs insert
        -- below triggers handle_stock_log_change which updates stok.
        INSERT INTO public.stock_logs (product_id, perubahan, keterangan)
        VALUES (
          v_product_id,
          v_qty,
          'Restore stok dari penghapusan transaksi ' || p_transaction_id::text
        );
      END IF;
    END LOOP;
  END IF;

  DELETE FROM public.transactions
  WHERE id = p_transaction_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_transaction_and_restore_stock(uuid) TO anon, authenticated;

-- 4. process_grosir_invoice: remove direct stok update, use stock_logs insert
CREATE OR REPLACE FUNCTION public.process_grosir_invoice(p_sales_order_id uuid, p_customer_id uuid, p_invoice_number text, p_termin_pembayaran text, p_items jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_invoice_id uuid;
    total_subtotal numeric := 0;
    total_diskon_item numeric := 0;
    total_laba_invoice numeric := 0;
    item record;
    product_info record;
BEGIN
    FOR item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id uuid, kuantitas integer, harga_grosir_deal numeric, diskon_item_rp numeric) LOOP
        total_subtotal := total_subtotal + (item.harga_grosir_deal * item.kuantitas);
        total_diskon_item := total_diskon_item + (item.diskon_item_rp * item.kuantitas);
    END LOOP;

    INSERT INTO public.invoices(sales_order_id, customer_id, invoice_number, termin_pembayaran, subtotal, total_diskon, total_akhir, status_pembayaran)
    VALUES (p_sales_order_id, p_customer_id, p_invoice_number, p_termin_pembayaran, total_subtotal, total_diskon_item, total_subtotal - total_diskon_item, 'Belum Lunas')
    RETURNING id INTO new_invoice_id;

    FOR item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id uuid, kuantitas integer, harga_grosir_deal numeric, diskon_item_rp numeric) LOOP
        INSERT INTO public.invoice_items(invoice_id, product_id, kuantitas, harga_grosir_deal, diskon_item_rp, subtotal)
        VALUES (new_invoice_id, item.product_id, item.kuantitas, item.harga_grosir_deal, item.diskon_item_rp, (item.harga_grosir_deal * item.kuantitas));
        SELECT harga_beli INTO product_info FROM public.products WHERE id = item.product_id;
        total_laba_invoice := total_laba_invoice + ((item.harga_grosir_deal * item.kuantitas) - (product_info.harga_beli * item.kuantitas) - (item.diskon_item_rp * item.kuantitas));

        -- NOTE: stok is NOT updated here directly. The stock_logs insert
        -- below triggers handle_stock_log_change which updates stok.
        -- stok_dialokasikan IS still updated directly (not handled by trigger).
        UPDATE public.products
        SET stok_dialokasikan = stok_dialokasikan - item.kuantitas
        WHERE id = item.product_id;

        INSERT INTO public.stock_logs (product_id, perubahan, keterangan)
        VALUES (item.product_id, -item.kuantitas, 'Penjualan Grosir Invoice #' || p_invoice_number);
    END LOOP;

    INSERT INTO public.transactions(customer_id, total, diskon, total_akhir, bayar, kembalian, total_laba, items, status_pembayaran, sisa_hutang, invoice_number)
    VALUES(p_customer_id, total_subtotal, total_diskon_item, total_subtotal - total_diskon_item, 0, 0, total_laba_invoice, p_items, 'Belum Lunas', total_subtotal - total_diskon_item, p_invoice_number);

    RETURN new_invoice_id;
END;
$$;

-- 5. Fix handle_stock_log_change trigger: properly manage total_terjual on restore
CREATE OR REPLACE FUNCTION public.handle_stock_log_change()
RETURNS TRIGGER AS $func$
BEGIN
  IF NEW.product_id IS NOT NULL THEN
    UPDATE public.products
    SET
      stok = stok + NEW.perubahan,
      total_terjual = total_terjual +
        CASE
          WHEN NEW.perubahan < 0 THEN ABS(NEW.perubahan)
          WHEN NEW.perubahan > 0 AND NEW.keterangan ILIKE '%Restore%' THEN -NEW.perubahan
          ELSE 0
        END
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Ensure the stock trigger exists (re-create if missing)
DROP TRIGGER IF EXISTS trigger_handle_stock_log_change ON public.stock_logs;
CREATE TRIGGER trigger_handle_stock_log_change
  AFTER INSERT ON public.stock_logs
  FOR EACH ROW EXECUTE FUNCTION public.handle_stock_log_change();