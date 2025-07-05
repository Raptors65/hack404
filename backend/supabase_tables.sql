-- =====================================================
-- Supabase Tables with Row Level Security (RLS)
-- =====================================================

-- Enable RLS on the auth.users table (if not already enabled)
-- This is usually already done by Supabase
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Reviews Table
-- =====================================================

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
    person_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(person_id, friend_id),
    CHECK (person_id != friend_id) -- Prevent self-friendship
);

-- Enable RLS on friends table
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

-- RLS Policies for friends table
-- Users can only see friendships where they are the person
CREATE POLICY "Users can view their own friendships" ON public.friends
    FOR SELECT USING (auth.uid() = person_id);

-- Users can only insert friendships for themselves
CREATE POLICY "Users can insert their own friendships" ON public.friends
    FOR INSERT WITH CHECK (auth.uid() = person_id);

-- Users can only delete their own friendships
CREATE POLICY "Users can delete their own friendships" ON public.friends
    FOR DELETE USING (auth.uid() = person_id);

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
CREATE INDEX IF NOT EXISTS idx_friends_person_id ON public.friends(person_id);

-- Index for finding if friendship exists (both directions)
CREATE INDEX IF NOT EXISTS idx_friends_lookup ON public.friends(person_id, friend_id);

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
-- Optional: Helper Views
-- =====================================================

-- View to get friend relationships in both directions
CREATE OR REPLACE VIEW public.mutual_friendships AS
SELECT DISTINCT
    LEAST(person_id, friend_id) as user1_id,
    GREATEST(person_id, friend_id) as user2_id,
    LEAST(f1.created_at, f2.created_at) as friendship_created_at
FROM public.friends f1
JOIN public.friends f2 ON f1.person_id = f2.friend_id AND f1.friend_id = f2.person_id;

-- Enable RLS on the view
ALTER VIEW public.mutual_friendships ENABLE ROW LEVEL SECURITY;

-- Policy for mutual friendships view
CREATE POLICY "Users can see mutual friendships they're part of" ON public.mutual_friendships
    FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- =====================================================
-- Grant Permissions
-- =====================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.friends TO authenticated;
GRANT SELECT ON public.mutual_friendships TO authenticated;
GRANT USAGE ON SEQUENCE public.reviews_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.friends_id_seq TO authenticated; 