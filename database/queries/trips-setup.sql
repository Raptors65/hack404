-- =====================================================
-- Trips Table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.trips (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    city TEXT NOT NULL,
    country TEXT,
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure only one active trip per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_trips_user_active ON public.trips(user_id) WHERE is_active = TRUE;

-- Enable RLS on trips table
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trips table
-- Users can only view their own trips
CREATE POLICY "Users can view their own trips" ON public.trips
    FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert trips for themselves
CREATE POLICY "Users can insert their own trips" ON public.trips
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own trips
CREATE POLICY "Users can update their own trips" ON public.trips
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own trips
CREATE POLICY "Users can delete their own trips" ON public.trips
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- Indexes for Performance
-- =====================================================

-- Index for finding trips by user
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON public.trips(user_id);

-- Index for finding active trips
CREATE INDEX IF NOT EXISTS idx_trips_active ON public.trips(is_active) WHERE is_active = TRUE;

-- Index for finding trips by city
CREATE INDEX IF NOT EXISTS idx_trips_city ON public.trips(city);

-- =====================================================
-- Updated_at Trigger for Trips
-- =====================================================

-- Trigger to automatically update updated_at on trips
CREATE TRIGGER update_trips_updated_at 
    BEFORE UPDATE ON public.trips 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Grant Permissions
-- =====================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trips TO authenticated;
GRANT USAGE ON SEQUENCE public.trips_id_seq TO authenticated;