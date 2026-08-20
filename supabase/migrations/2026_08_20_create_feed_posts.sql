-- Feed posts and comments tables
-- Applied: 2026-08-20

CREATE TABLE public.feed_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  slug TEXT UNIQUE,
  content TEXT,
  post_type TEXT NOT NULL DEFAULT 'image',
  media_url TEXT,
  thumbnail_url TEXT,
  youtube_url TEXT,
  product_id UUID REFERENCES public.products(id),
  category TEXT,
  tags TEXT[],
  is_published BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.feed_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES public.feed_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_spam BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_feed_posts_published ON public.feed_posts(is_published, published_at DESC);
CREATE INDEX idx_feed_posts_category ON public.feed_posts(category);
CREATE INDEX idx_feed_posts_featured ON public.feed_posts(is_featured);
CREATE INDEX idx_feed_posts_slug ON public.feed_posts(slug);
CREATE INDEX idx_feed_comments_post ON public.feed_comments(post_id, created_at DESC);
CREATE INDEX idx_feed_comments_customer ON public.feed_comments(customer_id);

ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published feed posts"
  ON public.feed_posts FOR SELECT USING (is_published = true);

CREATE POLICY "Admins can manage feed posts"
  ON public.feed_posts FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Public can view non-deleted comments"
  ON public.feed_comments FOR SELECT USING (is_deleted = false);

CREATE POLICY "Authenticated users can create comments"
  ON public.feed_comments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage comments"
  ON public.feed_comments FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE OR REPLACE FUNCTION public.slugify(text TEXT)
RETURNS TEXT AS $$
DECLARE
  result TEXT;
BEGIN
  result := lower(text);
  result := regexp_replace(result, '[^a-z0-9\s-]', '', 'g');
  result := regexp_replace(result, '\s+', '-', 'g');
  result := regexp_replace(result, '-+', '-', 'g');
  result := trim(both '-' from result);
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.generate_feed_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.slugify(NEW.title) || '-' || substring(NEW.id::text, 1, 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_feed_slug
  BEFORE INSERT OR UPDATE ON public.feed_posts
  FOR EACH ROW EXECUTE FUNCTION public.generate_feed_slug();
