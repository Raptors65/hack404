from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
from functools import wraps
from supabase import create_client, Client

load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes and origins

# Initialize Supabase client
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)


def require_auth(f):
    """Decorator to require Supabase authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid authorization header'}), 401
        
        token = auth_header.split(' ')[1]
        
        try:
            # Validate token with Supabase
            user_response = supabase.auth.get_user(token)
            request.user_id = user_response.user.id
            request.user_email = user_response.user.email
            
        except Exception as e:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        return f(*args, **kwargs)
    
    return decorated_function


@app.route('/add_review', methods=['POST'])
@require_auth
def add_review():
    data = request.get_json()
    review_id = data.get('review_id')
    # Use authenticated user_id instead of accepting it from request
    user_id = request.user_id
    place_id = data.get('place_id')
    rating = data.get('rating')
    comment = data.get('comment')

    # Validate required fields
    if not all([review_id, place_id, rating]):
        return jsonify({"error": "Missing required fields: review_id, place_id, rating"}), 400

    # Validate rating range
    if not isinstance(rating, int) or rating < 1 or rating > 10:
        return jsonify({"error": "Rating must be an integer between 1 and 10"}), 400

    try:
        # Use Supabase SDK to insert review
        result = supabase.table('reviews').insert({
            'review_id': review_id,
            'user_id': user_id,
            'place_id': place_id,
            'rating': rating,
            'comment': comment
        }).execute()
        
        return jsonify({"message": "Review added successfully", "data": result.data}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

@app.route('/get_reviews', methods=['GET'])
def get_reviews():
    # This endpoint can remain public - anyone can see reviews for a place
    place_id = request.args.get('place_id')
    if not place_id:
        return jsonify({"error": "Missing place_id"}), 400

    try:
        # Use Supabase SDK to fetch reviews
        result = supabase.table('reviews').select(
            'id, user_id, place_id, rating, comment, created_at'
        ).eq('place_id', place_id).execute()
        
        reviews = [
            {
                "review_id": row['id'],
                "user_id": row['user_id'],
                "place_id": row['place_id'],
                "rating": row['rating'],
                "comment": row['comment'],
                "created_at": row['created_at']
            }
            for row in result.data
        ]
        return jsonify({"reviews": reviews}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/add_friend', methods=['POST'])
@require_auth
def add_friend():
    data = request.get_json()
    # Use authenticated user as person_id - users can only add friends for themselves
    person_id = request.user_id
    friend_email = data.get('friend_email')
    
    if not friend_email:
        return jsonify({"error": "Missing friend_email"}), 400
    
    # Prevent users from adding themselves as a friend
    if request.user_email == friend_email:
        return jsonify({"error": "Cannot add yourself as a friend"}), 400

    try:
        # Look up friend by email using direct table query
        users_result = supabase.table('users').select('id').eq('email', friend_email).execute()
        
        if not users_result.data:
            return jsonify({"error": f"User with email {friend_email} not found"}), 404
        
        friend_id = users_result.data[0]['id']
        
        # Check if friendship already exists
        existing = supabase.table('friends').select('id').eq(
            'person_1_id', min(person_id, friend_id)
        ).eq('person_2_id', max(person_id, friend_id)).execute()
        
        if existing.data:
            return jsonify({"message": "Friendship already exists"}), 200
        
        # Use Supabase SDK to insert friendship
        result = supabase.table('friends').insert({
            'person_1_id': min(person_id, friend_id),
            'person_2_id': max(person_id, friend_id)
        }).execute()
        
        return jsonify({"message": "Friend added successfully", "data": result.data}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/remove_friend', methods=['DELETE'])
@require_auth
def remove_friend():
    data = request.get_json()
    # Use authenticated user as person_id - users can only remove their own friends
    person_id = request.user_id
    friend_id = data.get('friend_id')
    
    if not friend_id:
        return jsonify({"error": "Missing friend_id"}), 400

    try:
        # Use Supabase SDK to delete friendship
        result = supabase.table('friends').delete().eq(
            'person_1_id', min(person_id, friend_id)
        ).eq('person_2_id', max(person_id, friend_id)).execute()
        
        if not result.data:
            return jsonify({"error": "Friend relationship not found"}), 404
            
        return jsonify({"message": "Friend removed successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/friends', methods=['GET'])
@require_auth
def get_friends():
    # Use authenticated user_id - users can only get their own friends
    user_id = request.user_id
    
    try:
        # Get friends where user is person_1_id (friend is person_2_id)
        result1 = supabase.table('friends').select(
            'person_2_id, created_at'
        ).eq('person_1_id', user_id).execute()
        
        # Get friends where user is person_2_id (friend is person_1_id)
        result2 = supabase.table('friends').select(
            'person_1_id, created_at'
        ).eq('person_2_id', user_id).execute()
        
        # Combine results and get user details
        friends = []
        
        # Add friends where user is person_1_id
        for row in result1.data:
            friend_details = supabase.table('users').select(
                'id, email'
            ).eq('id', row['person_2_id']).execute()
            
            if friend_details.data:
                friends.append({
                    "friend_id": row['person_2_id'],
                    "friend_email": friend_details.data[0]['email'],
                    "friendship_created": row['created_at']
                })
        
        # Add friends where user is person_2_id
        for row in result2.data:
            friend_details = supabase.table('users').select(
                'id, email'
            ).eq('id', row['person_1_id']).execute()
            
            if friend_details.data:
                friends.append({
                    "friend_id": row['person_1_id'],
                    "friend_email": friend_details.data[0]['email'],
                    "friendship_created": row['created_at']
                })
        
        return jsonify({"friends": friends}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/health', methods=['GET'])
def health_check():
    """Simple health check endpoint"""
    return jsonify({"status": "healthy", "message": "Flask + Supabase backend is running"}), 200


if __name__ == '__main__':
    app.run(debug=True, port=5001)