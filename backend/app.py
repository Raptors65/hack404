from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import requests
from dotenv import load_dotenv
from functools import wraps
from supabase import create_client, Client

load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes and origins

# Google Maps API configuration
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")
PLACES_API_BASE_URL = "https://maps.googleapis.com/maps/api/place"

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


@app.route('/trip/current', methods=['GET'])
@require_auth
def get_current_trip():
    """Get the user's current active trip"""
    user_id = request.user_id
    
    try:
        # Get the current active trip for the user
        result = supabase.table('trips').select(
            'id, city, country, start_date, created_at'
        ).eq('user_id', user_id).eq('is_active', True).execute()
        
        if result.data:
            trip = result.data[0]
            return jsonify({
                "has_active_trip": True,
                "trip": {
                    "id": trip['id'],
                    "city": trip['city'],
                    "country": trip['country'],
                    "start_date": trip['start_date'],
                    "created_at": trip['created_at']
                }
            }), 200
        else:
            return jsonify({"has_active_trip": False}), 200
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/trip/start', methods=['POST'])
@require_auth
def start_trip():
    """Start a new trip (end any existing active trip first)"""
    user_id = request.user_id
    data = request.get_json()
    
    city = data.get('city')
    country = data.get('country')
    
    if not city:
        return jsonify({"error": "City is required"}), 400
    
    try:
        # End any existing active trip
        supabase.table('trips').update({
            'is_active': False,
            'end_date': 'now()'
        }).eq('user_id', user_id).eq('is_active', True).execute()
        
        # Start new trip
        result = supabase.table('trips').insert({
            'user_id': user_id,
            'city': city,
            'country': country,
            'is_active': True
        }).execute()
        
        if result.data:
            trip = result.data[0]
            return jsonify({
                "message": "Trip started successfully",
                "trip": {
                    "id": trip['id'],
                    "city": trip['city'],
                    "country": trip['country'],
                    "start_date": trip['start_date'],
                    "created_at": trip['created_at']
                }
            }), 201
        else:
            return jsonify({"error": "Failed to create trip"}), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/trip/end', methods=['PUT'])
@require_auth
def end_trip():
    """End the current active trip"""
    user_id = request.user_id
    
    try:
        # End the current active trip
        result = supabase.table('trips').update({
            'is_active': False,
            'end_date': 'now()'
        }).eq('user_id', user_id).eq('is_active', True).execute()
        
        if result.data:
            return jsonify({"message": "Trip ended successfully"}), 200
        else:
            return jsonify({"error": "No active trip found"}), 404
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/trip/recommendations', methods=['GET'])
@require_auth
def get_recommendations():
    """Get place recommendations for a city (hardcoded for now)"""
    city = request.args.get('city', '').lower()
    
    # Hardcoded recommendations for common cities
    recommendations = {
        'new york': [
            {
                'name': 'Central Park',
                'description': 'Beautiful urban park in the heart of Manhattan',
                'category': 'Park',
                'rating': 4.8,
                'image_url': 'https://images.unsplash.com/photo-1520637836862-4d197d17c91a?w=300&h=200&fit=crop'
            },
            {
                'name': 'Times Square',
                'description': 'Famous commercial intersection and tourist destination',
                'category': 'Landmark',
                'rating': 4.2,
                'image_url': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=300&h=200&fit=crop'
            },
            {
                'name': 'Brooklyn Bridge',
                'description': 'Historic bridge connecting Manhattan and Brooklyn',
                'category': 'Landmark',
                'rating': 4.7,
                'image_url': 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=300&h=200&fit=crop'
            }
        ],
        'paris': [
            {
                'name': 'Eiffel Tower',
                'description': 'Iconic iron lattice tower and symbol of Paris',
                'category': 'Landmark',
                'rating': 4.6,
                'image_url': 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=300&h=200&fit=crop'
            },
            {
                'name': 'Louvre Museum',
                'description': 'World famous art museum and historic monument',
                'category': 'Museum',
                'rating': 4.8,
                'image_url': 'https://images.unsplash.com/photo-1566139884294-a7e1ccb6e8c6?w=300&h=200&fit=crop'
            },
            {
                'name': 'Notre-Dame Cathedral',
                'description': 'Medieval Catholic cathedral and architectural masterpiece',
                'category': 'Architecture',
                'rating': 4.7,
                'image_url': 'https://images.unsplash.com/photo-1539650116574-75c0c6d0e66b?w=300&h=200&fit=crop'
            }
        ],
        'tokyo': [
            {
                'name': 'Senso-ji Temple',
                'description': 'Ancient Buddhist temple in Asakusa',
                'category': 'Temple',
                'rating': 4.5,
                'image_url': 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=300&h=200&fit=crop'
            },
            {
                'name': 'Shibuya Crossing',
                'description': 'Busiest pedestrian crossing in the world',
                'category': 'Landmark',
                'rating': 4.3,
                'image_url': 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=300&h=200&fit=crop'
            },
            {
                'name': 'Tokyo Skytree',
                'description': 'Broadcasting tower and observation deck',
                'category': 'Landmark',
                'rating': 4.4,
                'image_url': 'https://images.unsplash.com/photo-1513407030348-c983a97b98d8?w=300&h=200&fit=crop'
            }
        ]
    }
    
    # Default recommendations if city not found
    default_recommendations = [
        {
            'name': 'City Center',
            'description': 'Explore the heart of the city',
            'category': 'Area',
            'rating': 4.2,
            'image_url': 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=300&h=200&fit=crop'
        },
        {
            'name': 'Local Market',
            'description': 'Experience local culture and cuisine',
            'category': 'Market',
            'rating': 4.5,
            'image_url': 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300&h=200&fit=crop'
        },
        {
            'name': 'Historic District',
            'description': 'Discover the city\'s rich history',
            'category': 'Historic',
            'rating': 4.3,
            'image_url': 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=300&h=200&fit=crop'
        }
    ]
    
    city_recommendations = recommendations.get(city, default_recommendations)
    
    return jsonify({
        "city": city.title(),
        "recommendations": city_recommendations
    }), 200
@app.route('/attractions', methods=['GET'])
def get_attractions():
    """Get attractions near the user's location using Google Places API"""
    # Get location parameters from query string
    lat = request.args.get('lat')
    lng = request.args.get('lng')
    radius = request.args.get('radius', '5000')  # Default 5km radius
    type_filter = request.args.get('type', 'tourist_attraction')  # Default to tourist attractions
    
    # Validate required parameters
    if not lat or not lng:
        return jsonify({"error": "Missing required parameters: lat and lng"}), 400
    
    try:
        # Convert to float for validation
        lat = float(lat)
        lng = float(lng)
        radius = int(radius)
        
        # Validate coordinate ranges
        if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
            return jsonify({"error": "Invalid coordinates"}), 400
        
        if radius <= 0 or radius > 50000:  # Max 50km radius
            return jsonify({"error": "Radius must be between 1 and 50000 meters"}), 400
            
    except ValueError:
        return jsonify({"error": "Invalid numeric parameters"}), 400
    
    try:
        # Build the Places API request URL
        url = f"{PLACES_API_BASE_URL}/nearbysearch/json"
        params = {
            'location': f"{lat},{lng}",
            'radius': radius,
            'type': type_filter,
            'key': GOOGLE_MAPS_API_KEY
        }
        
        # Make the API request
        response = requests.get(url, params=params)
        response.raise_for_status()  # Raise exception for HTTP errors
        
        data = response.json()
        
        # Check if the API request was successful
        if data.get('status') != 'OK':
            return jsonify({
                "error": f"Google Places API error: {data.get('status')}",
                "details": data.get('error_message', 'No error details provided')
            }), 500
        
        # Extract and format the attractions
        attractions = []
        for place in data.get('results', []):
            attraction = {
                'place_id': place.get('place_id'),
                'name': place.get('name'),
                'address': place.get('vicinity'),
                'rating': place.get('rating'),
                'user_ratings_total': place.get('user_ratings_total'),
                'types': place.get('types', []),
                'geometry': {
                    'location': place.get('geometry', {}).get('location', {})
                },
                'photos': [
                    {
                        'photo_reference': photo.get('photo_reference'),
                        'width': photo.get('width'),
                        'height': photo.get('height')
                    }
                    for photo in place.get('photos', [])
                ] if place.get('photos') else []
            }
            attractions.append(attraction)
        
        return jsonify({
            "attractions": attractions,
            "total_results": len(attractions),
            "location": {"lat": lat, "lng": lng},
            "radius": radius,
            "type": type_filter
        }), 200
        
    except requests.RequestException as e:
        return jsonify({"error": f"Failed to fetch attractions: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500


@app.route('/attraction_details', methods=['GET'])
def get_attraction_details():
    """Get detailed information about a specific attraction"""
    place_id = request.args.get('place_id')
    
    if not place_id:
        return jsonify({"error": "Missing required parameter: place_id"}), 400
    
    try:
        # Build the Places API request URL for details
        url = f"{PLACES_API_BASE_URL}/details/json"
        params = {
            'place_id': place_id,
            'fields': 'name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,opening_hours,geometry,photos,reviews,types,price_level',
            'key': GOOGLE_MAPS_API_KEY
        }
        
        # Make the API request
        response = requests.get(url, params=params)
        response.raise_for_status()
        
        data = response.json()
        
        # Check if the API request was successful
        if data.get('status') != 'OK':
            return jsonify({
                "error": f"Google Places API error: {data.get('status')}",
                "details": data.get('error_message', 'No error details provided')
            }), 500
        
        place = data.get('result', {})
        
        # Format the detailed attraction data
        attraction_details = {
            'place_id': place.get('place_id'),
            'name': place.get('name'),
            'formatted_address': place.get('formatted_address'),
            'formatted_phone_number': place.get('formatted_phone_number'),
            'website': place.get('website'),
            'rating': place.get('rating'),
            'user_ratings_total': place.get('user_ratings_total'),
            'price_level': place.get('price_level'),
            'types': place.get('types', []),
            'geometry': place.get('geometry', {}),
            'opening_hours': place.get('opening_hours', {}),
            'photos': [
                {
                    'photo_reference': photo.get('photo_reference'),
                    'width': photo.get('width'),
                    'height': photo.get('height')
                }
                for photo in place.get('photos', [])
            ] if place.get('photos') else [],
            'reviews': [
                {
                    'author_name': review.get('author_name'),
                    'rating': review.get('rating'),
                    'relative_time_description': review.get('relative_time_description'),
                    'text': review.get('text')
                }
                for review in place.get('reviews', [])
            ] if place.get('reviews') else []
        }
        
        return jsonify({"attraction": attraction_details}), 200
        
    except requests.RequestException as e:
        return jsonify({"error": f"Failed to fetch attraction details: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500


@app.route('/health', methods=['GET'])
def health_check():
    """Simple health check endpoint"""
    return jsonify({"status": "healthy", "message": "Flask + Supabase backend is running"}), 200


if __name__ == '__main__':
    app.run(debug=True, port=5001)