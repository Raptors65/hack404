CREATE TABLE IF NOT EXISTS public.reviews (
    id BIGSERIAL PRIMARY KEY,
    review_id TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    place_id TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 10),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on reviews table
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reviews table
-- Anyone can read reviews (public data)
CREATE POLICY "Anyone can view reviews" ON public.reviews
    FOR SELECT USING (true);

-- Users can only insert reviews for themselves
CREATE POLICY "Users can insert their own reviews" ON public.reviews
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own reviews
CREATE POLICY "Users can update their own reviews" ON public.reviews
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own reviews
CREATE POLICY "Users can delete their own reviews" ON public.reviews
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- Friends Table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.friends (
    id BIGSERIAL PRIMARY KEY,
    person_1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    person_2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(person_1_id, person_2_id),
    CHECK (person_1_id < person_2_id) -- Prevent self-friendship
);

-- Enable RLS on friends table
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

-- RLS Policies for friends table
-- Users can only see friendships where they are the person
CREATE POLICY "Users can view their own friendships" ON public.friends
    FOR SELECT USING (auth.uid() = person_1_id OR auth.uid() = person_2_id);

-- Users can only insert friendships for themselves
CREATE POLICY "Users can insert their own friendships" ON public.friends
    FOR INSERT WITH CHECK (auth.uid() = person_1_id OR auth.uid() = person_2_id);

-- Users can only delete their own friendships
CREATE POLICY "Users can delete their own friendships" ON public.friends
    FOR DELETE USING (auth.uid() = person_1_id OR auth.uid() = person_2_id);

-- Users cannot update friendships (use delete + insert instead)
-- This prevents changing who the friendship is between

-- =====================================================
-- Indexes for Performance
-- =====================================================

-- Index for finding reviews by place
CREATE INDEX IF NOT EXISTS idx_reviews_place_id ON public.reviews(place_id);

-- Index for finding reviews by user
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.reviews(user_id);

-- Index for finding friends by person
CREATE INDEX IF NOT EXISTS idx_friends_person_1_id ON public.friends(person_1_id);
CREATE INDEX IF NOT EXISTS idx_friends_person_2_id ON public.friends(person_2_id);

-- Index for finding if friendship exists (both directions)
CREATE INDEX IF NOT EXISTS idx_friends_lookup ON public.friends(person_1_id, person_2_id);

-- =====================================================
-- Updated_at Trigger for Reviews
-- =====================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at on reviews
CREATE TRIGGER update_reviews_updated_at 
    BEFORE UPDATE ON public.reviews 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Grant Permissions
-- =====================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.friends TO authenticated;
GRANT USAGE ON SEQUENCE public.reviews_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.friends_id_seq TO authenticated; 