-- Add multiple products support per feed post
-- Applied: 2026-08-20

CREATE TABLE public.feed_post_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, product_id)
);

CREATE INDEX idx_feed_post_products_post ON public.feed_post_products(post_id);
CREATE INDEX idx_feed_post_products_product ON public.feed_post_products(product_id);

ALTER TABLE public.feed_post_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view feed post products"
  ON public.feed_post_products FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.feed_posts
      WHERE feed_posts.id = feed_post_products.post_id
      AND feed_posts.is_published = true
    )
  );

CREATE POLICY "Admins can manage feed post products"
  ON public.feed_post_products FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );
