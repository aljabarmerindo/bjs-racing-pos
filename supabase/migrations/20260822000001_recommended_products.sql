-- Recommended products engine based on transaction data

CREATE OR REPLACE FUNCTION get_recommended_products(
  p_product_id uuid,
  p_limit integer DEFAULT 8
)
RETURNS TABLE (
  id uuid,
  kode text,
  nama text,
  merek text,
  kategori text,
  harga_jual numeric,
  stok integer,
  score integer
) AS $$
BEGIN
  RETURN QUERY
  WITH product_context AS (
    SELECT pr.kategori, pr.merek
    FROM products pr
    WHERE pr.id = p_product_id
  ),
  co_purchased AS (
    SELECT oi2.product_id, COUNT(*) as freq
    FROM order_items oi1
    JOIN order_items oi2 ON oi1.order_id = oi2.order_id
    WHERE oi1.product_id = p_product_id
      AND oi2.product_id != p_product_id
    GROUP BY oi2.product_id
    ORDER BY freq DESC
    LIMIT p_limit
  ),
  same_category AS (
    SELECT pr.id as sc_id, 1 as sc_score
    FROM products pr, product_context pc
    WHERE pr.kategori = pc.kategori
      AND pr.id != p_product_id
      AND pr.status = 'Aktif'
    LIMIT p_limit
  ),
  same_brand AS (
    SELECT pr.id as sb_id, 1 as sb_score
    FROM products pr, product_context pc
    WHERE pr.merek = pc.merek
      AND pr.id != p_product_id
      AND pr.status = 'Aktif'
    LIMIT p_limit
  ),
  combined AS (
    SELECT product_id, freq as score FROM co_purchased
    UNION ALL
    SELECT sc_id, sc_score FROM same_category
    UNION ALL
    SELECT sb_id, sb_score FROM same_brand
  )
  SELECT 
    pr.id, pr.kode, pr.nama, pr.merek, pr.kategori, 
    pr.harga_jual, pr.stok, SUM(cb.score)::integer as total_score
  FROM products pr
  JOIN combined cb ON pr.id = cb.product_id
  WHERE pr.status = 'Aktif'
  GROUP BY pr.id, pr.kode, pr.nama, pr.merek, pr.kategori, pr.harga_jual, pr.stok
  ORDER BY total_score DESC, pr.nama
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;
