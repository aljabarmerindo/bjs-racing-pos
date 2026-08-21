-- Recover POS search RPCs
-- Source: extracted from live Supabase on 2026-08-19
-- Note: These functions were originally created manually in Supabase SQL Editor.
-- This migration backs them up so they can be reapplied if dropped.

-- 1) search_products - used by POS Produk.jsx, Pos.jsx, NotaOcrModal.jsx, ManajemenFeed.jsx
CREATE OR REPLACE FUNCTION public.search_products(
  search_term text DEFAULT NULL,
  merek_filter text DEFAULT NULL,
  kategori_filter text DEFAULT NULL,
  status_filter text DEFAULT 'Aktif',
  low_stock_only boolean DEFAULT false,
  supplier_filter text DEFAULT NULL,
  ukuran_filter text DEFAULT NULL,
  lini_produk_filter text DEFAULT NULL,
  price_range text DEFAULT 'semua'
)
RETURNS SETOF public.products
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT p.*
  FROM public.products p
  WHERE (status_filter = 'semua' OR p.status = status_filter)
    AND (
      search_term IS NULL
      OR search_term = ''
      OR p.search_terms ILIKE '%' || search_term || '%'
      OR p.kode ILIKE '%' || search_term || '%'
      OR p.sku ILIKE '%' || search_term || '%'
      OR p.merek ILIKE '%' || search_term || '%'
      OR p.kategori ILIKE '%' || search_term || '%'
    )
    AND (merek_filter IS NULL OR merek_filter = 'semua' OR p.merek = merek_filter)
    AND (kategori_filter IS NULL OR kategori_filter = 'semua' OR p.kategori = kategori_filter)
    AND (low_stock_only = false OR p.stok <= p.stok_min)
    AND (supplier_filter IS NULL OR supplier_filter = 'semua' OR p.supplier = supplier_filter)
    AND (ukuran_filter IS NULL OR ukuran_filter = 'semua' OR p.ukuran = ukuran_filter)
    AND (lini_produk_filter IS NULL OR lini_produk_filter = 'semua' OR p.lini_produk = lini_produk_filter)
    AND (
      price_range IS NULL OR price_range = 'semua'
      OR (price_range = '0-50000' AND p.harga_jual <= 50000)
      OR (price_range = '50000-100000' AND p.harga_jual > 50000 AND p.harga_jual <= 100000)
      OR (price_range = '100000-200000' AND p.harga_jual > 100000 AND p.harga_jual <= 200000)
      OR (price_range = '200000-500000' AND p.harga_jual > 200000 AND p.harga_jual <= 500000)
      OR (price_range = '500000+' AND p.harga_jual > 500000)
    )
  ORDER BY p.updated_at DESC;
END;
$$;

-- 2) search_products_for_po_v2 - used by POS FormPesananGrosir.jsx, FormPembelian.jsx
CREATE OR REPLACE FUNCTION public.search_products_for_po_v2(
  search_term text DEFAULT NULL,
  merek_filter text DEFAULT NULL,
  kategori_filter text DEFAULT NULL,
  supplier_filter text DEFAULT 'semua'
)
RETURNS SETOF public.products
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT p.*
  FROM public.products p
  WHERE p.status = 'Aktif'
    AND (
      search_term IS NULL
      OR search_term = ''
      OR p.search_terms ILIKE '%' || search_term || '%'
      OR p.kode ILIKE '%' || search_term || '%'
      OR p.sku ILIKE '%' || search_term || '%'
      OR p.merek ILIKE '%' || search_term || '%'
      OR p.kategori ILIKE '%' || search_term || '%'
    )
    AND (merek_filter IS NULL OR merek_filter = 'semua' OR p.merek = merek_filter)
    AND (kategori_filter IS NULL OR kategori_filter = 'semua' OR p.kategori = kategori_filter)
    AND (supplier_filter IS NULL OR supplier_filter = 'semua' OR p.supplier = supplier_filter)
  ORDER BY p.updated_at DESC;
END;
$$;

-- 3) get_cascade_filter_options - used by POS Produk.jsx
CREATE OR REPLACE FUNCTION public.get_cascade_filter_options(
  p_merek text DEFAULT 'semua',
  p_kategori text DEFAULT 'semua',
  p_lini_produk text DEFAULT 'semua',
  p_ukuran text DEFAULT 'semua',
  p_supplier text DEFAULT 'semua',
  p_status text DEFAULT 'semua',
  p_low_stock_only boolean DEFAULT false
)
RETURNS TABLE(
  merek text[],
  kategori text[],
  lini_produk text[],
  ukuran text[],
  supplier text[],
  price_nol bigint,
  price_1_15k bigint,
  price_15k_25k bigint,
  price_25k_50k bigint,
  price_50k_100k bigint,
  price_100k_plus bigint
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_where TEXT := '';
  v_where_merek TEXT := '';
  v_where_kategori TEXT := '';
  v_where_lini TEXT := '';
  v_where_ukuran TEXT := '';
  v_where_supplier TEXT := '';
BEGIN
  IF p_status IS NOT NULL AND p_status != 'semua' THEN
    v_where := ' AND status = ' || quote_literal(p_status);
  END IF;
  IF p_low_stock_only THEN
    v_where := v_where || ' AND stok <= stok_min';
  END IF;

  IF p_merek IS NOT NULL AND p_merek != 'semua' THEN
    v_where_merek := ' AND merek ILIKE ' || quote_literal(p_merek);
  END IF;

  IF p_kategori IS NOT NULL AND p_kategori != 'semua' THEN
    v_where_kategori := ' AND kategori ILIKE ' || quote_literal(p_kategori);
  END IF;

  IF p_lini_produk IS NOT NULL AND p_lini_produk != 'semua' THEN
    v_where_lini := ' AND lini_produk ILIKE ' || quote_literal(p_lini_produk);
  END IF;

  IF p_ukuran IS NOT NULL AND p_ukuran != 'semua' THEN
    v_where_ukuran := ' AND ukuran ILIKE ' || quote_literal(p_ukuran);
  END IF;

  IF p_supplier IS NOT NULL AND p_supplier != 'semua' THEN
    v_where_supplier := ' AND supplier ILIKE ' || quote_literal(p_supplier);
  END IF;

  RETURN QUERY EXECUTE format(
    $Q$WITH
    cte_merek AS (
      SELECT DISTINCT p.merek
      FROM products p
      WHERE p.merek IS NOT NULL AND p.merek != '' %s
    ),
    cte_kategori AS (
      SELECT DISTINCT p.kategori
      FROM products p
      WHERE p.kategori IS NOT NULL AND p.kategori != '' %s %s
    ),
    cte_lini AS (
      SELECT DISTINCT p.lini_produk
      FROM products p
      WHERE p.lini_produk IS NOT NULL AND p.lini_produk != '' %s %s %s
    ),
    cte_ukuran AS (
      SELECT DISTINCT p.ukuran
      FROM products p
      WHERE p.ukuran IS NOT NULL AND p.ukuran != '' %s %s %s %s
    ),
    cte_supplier AS (
      SELECT DISTINCT p.supplier
      FROM products p
      WHERE p.supplier IS NOT NULL AND p.supplier != '' %s %s %s %s %s
    ),
    cte_price AS (
      SELECT
        CASE
          WHEN harga_jual = 0 THEN 0
          WHEN harga_jual <= 15000 THEN 1
          WHEN harga_jual <= 25000 THEN 2
          WHEN harga_jual <= 50000 THEN 3
          WHEN harga_jual <= 100000 THEN 4
          ELSE 5
        END AS bucket,
        count(*) AS cnt
      FROM products p
      WHERE 1=1 %s %s %s %s %s %s
      GROUP BY 1
    )
    SELECT
      (SELECT array_agg(merek ORDER BY merek) FROM cte_merek),
      (SELECT array_agg(kategori ORDER BY kategori) FROM cte_kategori),
      (SELECT array_agg(lini_produk ORDER BY lini_produk) FROM cte_lini),
      (SELECT array_agg(ukuran ORDER BY ukuran) FROM cte_ukuran),
      (SELECT array_agg(supplier ORDER BY supplier) FROM cte_supplier),
      COALESCE((SELECT cnt FROM cte_price WHERE bucket = 0), 0),
      COALESCE((SELECT cnt FROM cte_price WHERE bucket = 1), 0),
      COALESCE((SELECT cnt FROM cte_price WHERE bucket = 2), 0),
      COALESCE((SELECT cnt FROM cte_price WHERE bucket = 3), 0),
      COALESCE((SELECT cnt FROM cte_price WHERE bucket = 4), 0),
      COALESCE((SELECT cnt FROM cte_price WHERE bucket = 5), 0)$Q$,
    v_where,
    v_where, v_where_merek,
    v_where, v_where_merek, v_where_kategori,
    v_where, v_where_merek, v_where_kategori, v_where_lini,
    v_where, v_where_merek, v_where_kategori, v_where_lini, v_where_ukuran,
    v_where, v_where_merek, v_where_kategori, v_where_lini, v_where_ukuran, v_where_supplier
  );
END;
$$;

-- 4) get_peak_hours - used by POS Dashboard.jsx
CREATE OR REPLACE FUNCTION public.get_peak_hours(
  start_date timestamp with time zone,
  end_date timestamp with time zone
)
RETURNS TABLE(jam integer, jumlah_transaksi bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Jakarta')::int AS jam,
    COUNT(*) AS jumlah_transaksi
  FROM transactions
  WHERE created_at >= start_date AND created_at <= end_date
  GROUP BY jam
  ORDER BY jam;
$$;

-- 5) get_sales_by_brand - used by POS Dashboard.jsx
CREATE OR REPLACE FUNCTION public.get_sales_by_brand(
  start_date timestamp with time zone,
  end_date timestamp with time zone
)
RETURNS TABLE(merek text, total_penjualan numeric, jumlah_transaksi bigint)
LANGUAGE sql
AS $$
  SELECT
    item->>'merek' AS merek,
    SUM((item->>'quantity')::numeric * (item->>'harga_jual')::numeric) AS total_penjualan,
    COUNT(*) AS jumlah_transaksi
  FROM transactions, jsonb_array_elements(items) AS item
  WHERE created_at >= start_date AND created_at <= end_date
    AND item->>'merek' IS NOT NULL AND TRIM(item->>'merek') != ''
  GROUP BY item->>'merek'
  ORDER BY total_penjualan DESC;
$$;

-- 6) get_profit_margin_by_category - used by POS Dashboard.jsx
CREATE OR REPLACE FUNCTION public.get_profit_margin_by_category(
  start_date timestamp with time zone,
  end_date timestamp with time zone
)
RETURNS TABLE(kategori text, total_pendapatan numeric, total_laba numeric, margin_persen numeric)
LANGUAGE sql
AS $$
  SELECT
    item->>'kategori' AS kategori,
    SUM((item->>'quantity')::numeric * (item->>'harga_jual')::numeric) AS total_pendapatan,
    SUM((item->>'quantity')::numeric * ((item->>'harga_jual')::numeric - (item->>'harga_beli')::numeric)) AS total_laba,
    CASE
      WHEN SUM((item->>'quantity')::numeric * (item->>'harga_jual')::numeric) > 0
      THEN ROUND(
        SUM((item->>'quantity')::numeric * ((item->>'harga_jual')::numeric - (item->>'harga_beli')::numeric))
        / SUM((item->>'quantity')::numeric * (item->>'harga_jual')::numeric) * 100, 1
      )
      ELSE 0
    END AS margin_persen
  FROM transactions, jsonb_array_elements(items) AS item
  WHERE created_at >= start_date AND created_at <= end_date
    AND item->>'kategori' IS NOT NULL AND TRIM(item->>'kategori') != ''
  GROUP BY item->>'kategori'
  ORDER BY margin_persen DESC;
$$;

-- 7) get_purchase_vs_sales - used by POS Dashboard.jsx
CREATE OR REPLACE FUNCTION public.get_purchase_vs_sales(
  start_date timestamp with time zone,
  end_date timestamp with time zone
)
RETURNS TABLE(tanggal date, penjualan numeric, pembelian numeric)
LANGUAGE sql
AS $$
  WITH sales AS (
    SELECT DATE(created_at) AS tanggal, SUM(total_akhir) AS penjualan
    FROM transactions
    WHERE created_at >= start_date AND created_at <= end_date
    GROUP BY DATE(created_at)
  ),
  purchases AS (
    SELECT order_date AS tanggal, SUM(total_amount) AS pembelian
    FROM purchase_orders
    WHERE order_date >= DATE(start_date) AND order_date <= DATE(end_date)
    GROUP BY order_date
  )
  SELECT COALESCE(s.tanggal, p.tanggal) AS tanggal,
         COALESCE(s.penjualan, 0) AS penjualan,
         COALESCE(p.pembelian, 0) AS pembelian
  FROM sales s
  FULL OUTER JOIN purchases p ON s.tanggal = p.tanggal
  ORDER BY tanggal;
$$;
