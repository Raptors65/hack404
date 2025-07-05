# Wander App - Social Travel App

## Backend
- Flask backend running on port 5001
- Uses Supabase for auth and database
- CORS enabled for frontend communication

## Frontend
- React Native with Expo
- Bottom tabs navigation: Feed, Past Trips, New Trip, Map, Profile
- Uses native RN components (removed @rneui/themed)

## Friend System
- Backend expects friend_email, looks up UUID, stores friendship with UUIDs
- Frontend sends friend_email to /add_friend endpoint
- Database uses person_1_id and person_2_id (min/max pattern for bidirectional friendship)

## Database Schema
- Need public.users table that syncs with auth.users (auth schema not exposed via API)
- Friends table uses UUID references to public.users