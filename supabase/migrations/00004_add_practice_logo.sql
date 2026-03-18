-- Add logo support for dietitian practice branding.
ALTER TABLE public.dietitian_practice
ADD COLUMN IF NOT EXISTS logo_url TEXT;
