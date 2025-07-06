-- Add latitude and longitude columns to reviews table for map functionality
-- This allows us to display user's reviewed places on a map without repeated Google Maps API calls

ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Add indexes for efficient geographic queries
CREATE INDEX IF NOT EXISTS idx_reviews_coordinates ON public.reviews(latitude, longitude);

-- Add a comment to document the purpose
COMMENT ON COLUMN public.reviews.latitude IS 'Latitude coordinate of the reviewed place';
COMMENT ON COLUMN public.reviews.longitude IS 'Longitude coordinate of the reviewed place';