-- Enhance search to include vehicle code (kode motor)

CREATE OR REPLACE FUNCTION public.search_products(
  search_term text DEFAULT NULL,
  merek_filter text DEFAULT NULL,
  kategori_filter text DEFAULT NULL,
  status_filter text DEFAULT 'Aktif',
  low_stock_only boolean DEFAULT false,
  supplier_filter text DEFAULT NULL,
  ukuran_filter text DEFAULT NULL,
  lini_produk_filter text DEFAULT NULL,
  price_range text DEFAULT 'semua',
  p_vehicle_code text DEFAULT NULL
)
RETURNS SETOF public.products
AS $$
BEGIN
  RETURN QUERY
  SELECT p.*
  FROM public.products p
  LEFT JOIN product_vehicle_compatibilities pvc ON p.id = pvc.product_id
  LEFT JOIN vehicle_models vm ON pvc.vehicle_model_id = vm.id
  LEFT JOIN vehicle_codes vc ON vm.id = vc.vehicle_model_id
  WHERE (status_filter = 'semua' OR p.status = status_filter)
    AND (
      search_term IS NULL
      OR search_term = ''
      OR p.search_terms ILIKE '%' || search_term || '%'
      OR p.kode ILIKE '%' || search_term || '%'
      OR p.sku ILIKE '%' || search_term || '%'
      OR p.merek ILIKE '%' || search_term || '%'
      OR p.kategori ILIKE '%' || search_term || '%'
      OR vc.code ILIKE '%' || search_term || '%'
      OR vc.name ILIKE '%' || search_term || '%'
    )
    AND (p_vehicle_code IS NULL OR p_vehicle_code = '' OR vc.code ILIKE '%' || p_vehicle_code || '%')
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
  GROUP BY p.id, p.kode, p.nama, p.kategori, p.harga_beli, p.harga_jual, p.stok, p.stok_min, p.supplier, p.created_at, p.status, p.merek, p.updated_at, p.catatan, p.supplier_id, p.satuan_dasar, p.satuan_pembelian, p.nilai_konversi, p.harga_grosir, p.ukuran, p.stok_dialokasikan, p.image_url, p.color_swatch_url, p.specifications, p.color_variant, p.sku, p.lini_produk, p.harga_coret, p.total_terjual, p.rating, p.jumlah_ulasan, p.color_hex, p.berat_gram, p.tags, p.group_id, p.image_url_2, p.image_url_3, p.is_master, p.variant_label, p.panjang_cm, p.lebar_cm, p.tinggi_cm, p.search_synonyms, p.search_terms
  ORDER BY p.updated_at DESC;
END;
$$ LANGUAGE plpgsql;
