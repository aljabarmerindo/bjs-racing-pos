-- Alter specifications column from JSONB to TEXT
-- This allows plain text input with line breaks instead of JSON key-value format

ALTER TABLE public.products 
  ALTER COLUMN specifications TYPE TEXT 
  USING specifications::TEXT;

-- Note: Existing 2 products with specifications data will be converted to text format
-- The UI has been updated to display specifications as plain text with whitespace-pre-wrap
