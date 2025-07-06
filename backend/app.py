from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import requests
import uuid
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
    place_name = data.get('place_name')
    rating = data.get('rating')
    comment = data.get('comment')
    latitude = data.get('latitude')
    longitude = data.get('longitude')

    # Validate required fields
    if not all([review_id, place_id, place_name, rating]):
        return jsonify({"error": "Missing required fields: review_id, place_id, place_name, rating"}), 400

    # Validate rating range
    if not isinstance(rating, int) or rating < 1 or rating > 10:
        return jsonify({"error": "Rating must be an integer between 1 and 10"}), 400

    # Validate coordinates if provided
    if latitude is not None and longitude is not None:
        try:
            latitude = float(latitude)
            longitude = float(longitude)
            if not (-90 <= latitude <= 90) or not (-180 <= longitude <= 180):
                return jsonify({"error": "Invalid coordinates"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid coordinate format"}), 400

    try:
        # Use Supabase SDK to insert review
        review_data = {
            'review_id': review_id,
            'user_id': user_id,
            'place_id': place_id,
            'place_name': place_name,
            'rating': rating,
            'comment': comment
        }
        
        # Add coordinates if provided
        if latitude is not None and longitude is not None:
            review_data['latitude'] = latitude
            review_data['longitude'] = longitude
        
        result = supabase.table('reviews').insert(review_data).execute()
        
        return jsonify({"message": "Review added successfully", "data": result.data}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

@app.route('/rate_place', methods=['POST'])
@require_auth
def rate_place():
    """Rate a place with a simple rating (1-10) and optional comment"""
    data = request.get_json()
    user_id = request.user_id
    place_id = data.get('place_id')
    place_name = data.get('place_name')  # Place name from frontend
    rating = data.get('rating')
    comment = data.get('comment', '')  # Optional comment
    latitude = data.get('latitude')
    longitude = data.get('longitude')
    
    # Validate required fields
    if not all([place_id, place_name, rating]):
        return jsonify({"error": "Missing required fields: place_id, place_name, rating"}), 400
    
    # Validate rating range
    if not isinstance(rating, int) or rating < 1 or rating > 10:
        return jsonify({"error": "Rating must be an integer between 1 and 10"}), 400
    
    # Validate coordinates if provided
    if latitude is not None and longitude is not None:
        try:
            latitude = float(latitude)
            longitude = float(longitude)
            if not (-90 <= latitude <= 90) or not (-180 <= longitude <= 180):
                return jsonify({"error": "Invalid coordinates"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid coordinate format"}), 400
    
    try:
        # Check if user already rated this place
        existing_review = supabase.table('reviews').select('id, review_id').eq(
            'user_id', user_id
        ).eq('place_id', place_id).execute()
        
        if existing_review.data:
            # Update existing review
            review_id = existing_review.data[0]['review_id']
            update_data = {
                'rating': rating,
                'comment': comment,
                'place_name': place_name
            }
            
            # Add coordinates if provided
            if latitude is not None and longitude is not None:
                update_data['latitude'] = latitude
                update_data['longitude'] = longitude
            
            result = supabase.table('reviews').update(update_data).eq('review_id', review_id).execute()
            
            return jsonify({
                "message": "Rating updated successfully",
                "data": result.data[0],
                "action": "updated"
            }), 200
        else:
            # Create new review with generated review_id
            review_id = str(uuid.uuid4())
            
            review_data = {
                'review_id': review_id,
                'user_id': user_id,
                'place_id': place_id,
                'place_name': place_name,
                'rating': rating,
                'comment': comment
            }
            
            # Add coordinates if provided
            if latitude is not None and longitude is not None:
                review_data['latitude'] = latitude
                review_data['longitude'] = longitude
            
            result = supabase.table('reviews').insert(review_data).execute()
            
            return jsonify({
                "message": "Rating added successfully",
                "data": result.data[0],
                "action": "created"
            }), 201
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/get_user_rating', methods=['GET'])
@require_auth
def get_user_rating():
    """Get the current user's rating for a specific place"""
    place_id = request.args.get('place_id')
    user_id = request.user_id
    
    if not place_id:
        return jsonify({"error": "Missing place_id"}), 400
    
    try:
        # Get user's rating for this place
        result = supabase.table('reviews').select(
            'rating, comment, created_at, updated_at'
        ).eq('place_id', place_id).eq('user_id', user_id).execute()
        
        if result.data:
            rating_data = result.data[0]
            return jsonify({
                "has_rating": True,
                "rating": rating_data['rating'],
                "comment": rating_data['comment'],
                "created_at": rating_data['created_at'],
                "updated_at": rating_data['updated_at']
            }), 200
        else:
            return jsonify({"has_rating": False}), 200
            
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
                'id, email, name'
            ).eq('id', row['person_2_id']).execute()
            
            if friend_details.data:
                friends.append({
                    "friend_id": row['person_2_id'],
                    "friend_email": friend_details.data[0]['email'],
                    "friend_name": friend_details.data[0]['name'],
                    "friendship_created": row['created_at']
                })
        
        # Add friends where user is person_2_id
        for row in result2.data:
            friend_details = supabase.table('users').select(
                'id, email, name'
            ).eq('id', row['person_1_id']).execute()
            
            if friend_details.data:
                friends.append({
                    "friend_id": row['person_1_id'],
                    "friend_email": friend_details.data[0]['email'],
                    "friend_name": friend_details.data[0]['name'],
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
    """Get place recommendations for a city using Google Places API"""
    city = request.args.get('city', '').strip()
    
    if not city:
        return jsonify({"error": "Missing required parameter: city"}), 400
    
    try:
        # First, get coordinates for the city using Geocoding API
        geocoding_url = "https://maps.googleapis.com/maps/api/geocode/json"
        geocoding_params = {
            'address': city,
            'key': GOOGLE_MAPS_API_KEY
        }
        
        geocoding_response = requests.get(geocoding_url, params=geocoding_params)
        geocoding_response.raise_for_status()
        geocoding_data = geocoding_response.json()
        
        if geocoding_data.get('status') != 'OK' or not geocoding_data.get('results'):
            return jsonify({
                "error": f"Could not find location for city: {city}",
                "details": geocoding_data.get('error_message', 'City not found')
            }), 404
        
        # Get the coordinates of the city
        location = geocoding_data['results'][0]['geometry']['location']
        lat = location['lat']
        lng = location['lng']
        formatted_address = geocoding_data['results'][0]['formatted_address']
        
        # Search for tourist attractions in the city
        places_url = f"{PLACES_API_BASE_URL}/nearbysearch/json"
        places_params = {
            'location': f"{lat},{lng}",
            'radius': '10000',  # 10km radius
            'type': 'tourist_attraction',
            'key': GOOGLE_MAPS_API_KEY
        }
        
        places_response = requests.get(places_url, params=places_params)
        places_response.raise_for_status()
        places_data = places_response.json()
        
        if places_data.get('status') != 'OK':
            return jsonify({
                "error": f"Google Places API error: {places_data.get('status')}",
                "details": places_data.get('error_message', 'No error details provided')
            }), 500
        
        # Get user's friends to check for their ratings
        user_id = request.user_id
        friends = []
        
        try:
            # Get friends where user is person_1_id
            result1 = supabase.table('friends').select(
                'person_2_id'
            ).eq('person_1_id', user_id).execute()
            
            # Get friends where user is person_2_id
            result2 = supabase.table('friends').select(
                'person_1_id'
            ).eq('person_2_id', user_id).execute()
            
            # Collect friend IDs
            friend_ids = []
            for row in result1.data:
                friend_ids.append(row['person_2_id'])
            for row in result2.data:
                friend_ids.append(row['person_1_id'])
                
            # Get friend details (email and name) for display
            if friend_ids:
                friends_details = supabase.table('users').select(
                    'id, email, name'
                ).in_('id', friend_ids).execute()
                
                friends = {friend['id']: {'email': friend['email'], 'name': friend['name']} for friend in friends_details.data}
                
        except Exception as e:
            # If friend lookup fails, continue without friend indicators
            friends = {}
        
        # Format the recommendations
        recommendations = []
        for place in places_data.get('results', [])[:10]:  # Limit to 10 results
            # Map Google Places types to our categories
            place_types = place.get('types', [])
            category = 'Attraction'
            if 'museum' in place_types:
                category = 'Museum'
            elif 'park' in place_types:
                category = 'Park'
            elif 'church' in place_types or 'place_of_worship' in place_types:
                category = 'Religious Site'
            elif 'shopping_mall' in place_types or 'store' in place_types:
                category = 'Shopping'
            elif 'restaurant' in place_types or 'food' in place_types:
                category = 'Restaurant'
            elif any(t in place_types for t in ['landmark', 'point_of_interest']):
                category = 'Landmark'
            
            # Get photo URL if available
            photo_url = None
            if place.get('photos'):
                photo_reference = place['photos'][0]['photo_reference']
                photo_url = f"https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference={photo_reference}&key={GOOGLE_MAPS_API_KEY}"
            
            # Check if friends liked this place (rating >= 8)
            friends_who_liked = []
            place_id = place.get('place_id')
            
            if friends and place_id:
                try:
                    # Get reviews for this place from friends with high ratings
                    friend_reviews = supabase.table('reviews').select(
                        'user_id, rating'
                    ).eq('place_id', place_id).in_('user_id', list(friends.keys())).gte('rating', 8).execute()
                    
                    for review in friend_reviews.data:
                        friend_id = review['user_id']
                        if friend_id in friends:
                            friend_data = friends[friend_id]
                            # Use the name field if available, otherwise fall back to extracting from email
                            friend_name = friend_data['name'] if friend_data['name'] else friend_data['email'].split('@')[0].title()
                            friends_who_liked.append({
                                'id': friend_id,
                                'name': friend_name,
                                'email': friend_data['email'],
                                'rating': review['rating']
                            })
                            
                except Exception as e:
                    # If review lookup fails, continue without friend indicators
                    pass
            
            # Create friend indicator text
            friend_indicator = None
            if friends_who_liked:
                count = len(friends_who_liked)
                if count == 1:
                    friend_indicator = f"{friends_who_liked[0]['name']} liked this place"
                elif count == 2:
                    friend_indicator = f"{friends_who_liked[0]['name']} and {friends_who_liked[1]['name']} liked this place"
                else:
                    friend_indicator = f"{friends_who_liked[0]['name']} and {count - 1} others liked this place"
            
            recommendation = {
                'place_id': place_id,
                'name': place.get('name'),
                'description': place.get('vicinity', ''),
                'category': category,
                'rating': place.get('rating'),
                'user_ratings_total': place.get('user_ratings_total'),
                'image_url': photo_url,
                'location': place.get('geometry', {}).get('location', {}),
                'friends_who_liked': friends_who_liked,
                'friend_indicator': friend_indicator
            }
            recommendations.append(recommendation)
        
        return jsonify({
            "city": city.title(),
            "formatted_address": formatted_address,
            "location": {"lat": lat, "lng": lng},
            "recommendations": recommendations,
            "total_results": len(recommendations)
        }), 200
        
    except requests.RequestException as e:
        return jsonify({"error": f"Failed to fetch recommendations: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500
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


@app.route('/feed', methods=['GET'])
@require_auth
def get_feed():
    """Get feed data including featured lists and friend activity"""
    user_id = request.user_id
    
    try:
        # Get user's friends
        friend_ids = []
        
        # Get friends where user is person_1_id
        result1 = supabase.table('friends').select(
            'person_2_id'
        ).eq('person_1_id', user_id).execute()
        
        # Get friends where user is person_2_id
        result2 = supabase.table('friends').select(
            'person_1_id'
        ).eq('person_2_id', user_id).execute()
        
        # Collect friend IDs
        for row in result1.data:
            friend_ids.append(row['person_2_id'])
        for row in result2.data:
            friend_ids.append(row['person_1_id'])
        
        # Get recent friend activity (reviews and completed trips)
        friend_activity = []
        
        if friend_ids:
            # Calculate date 30 days ago
            from datetime import datetime, timedelta
            thirty_days_ago = (datetime.now() - timedelta(days=30)).isoformat()
            
            # Get recent reviews from friends (last 30 days)
            recent_reviews = supabase.table('reviews').select(
                'user_id, place_id, place_name, rating, comment, created_at'
            ).in_('user_id', friend_ids).gte(
                'created_at', thirty_days_ago
            ).order('created_at', desc=True).limit(20).execute()
            
            # Get recent completed trips from friends (last 30 days)
            recent_trips = supabase.table('trips').select(
                'user_id, city, country, start_date, end_date, created_at'
            ).in_('user_id', friend_ids).eq('is_active', False).not_.is_(
                'end_date', 'null'
            ).gte('created_at', thirty_days_ago).order(
                'end_date', desc=True
            ).limit(20).execute()
            
            # Get user details for the activities
            if friend_ids:
                users_details = supabase.table('users').select(
                    'id, email, name'
                ).in_('id', friend_ids).execute()
                
                users_map = {user['id']: user for user in users_details.data}
                
                # Format review activities
                for review in recent_reviews.data:
                    user_data = users_map.get(review['user_id'])
                    if user_data:
                        friend_name = user_data['name'] if user_data['name'] else user_data['email'].split('@')[0].title()
                        friend_activity.append({
                            'type': 'review',
                            'id': f"review_{review['user_id']}_{review['place_id']}_{review['created_at']}",
                            'user_id': review['user_id'],
                            'user_name': friend_name,
                            'user_email': user_data['email'],
                            'place_id': review['place_id'],
                            'place_name': review.get('place_name', 'Unknown Place'),
                            'rating': review['rating'],
                            'comment': review['comment'],
                            'created_at': review['created_at']
                        })
                
                # Format trip activities
                for trip in recent_trips.data:
                    user_data = users_map.get(trip['user_id'])
                    if user_data:
                        friend_name = user_data['name'] if user_data['name'] else user_data['email'].split('@')[0].title()
                        friend_activity.append({
                            'type': 'trip',
                            'id': f"trip_{trip['user_id']}_{trip['created_at']}",
                            'user_id': trip['user_id'],
                            'user_name': friend_name,
                            'user_email': user_data['email'],
                            'city': trip['city'],
                            'country': trip['country'],
                            'start_date': trip['start_date'],
                            'end_date': trip['end_date'],
                            'created_at': trip['created_at']
                        })
        
        # Sort all activities by creation date
        friend_activity.sort(key=lambda x: x['created_at'], reverse=True)
        
        # Hardcoded featured lists for now
        featured_lists = [
            {
                'id': 'nyc_nightlife',
                'title': 'Best Places to Visit at Night in NYC',
                'description': 'Discover the city that never sleeps',
                'image_url': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=300&h=200&fit=crop',
                'place_count': 12
            },
            {
                'id': 'paris_cafes',
                'title': 'Hidden Cafés in Paris',
                'description': 'Local favorites off the beaten path',
                'image_url': 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=300&h=200&fit=crop',
                'place_count': 8
            },
            {
                'id': 'tokyo_temples',
                'title': 'Sacred Temples in Tokyo',
                'description': 'Find peace in the bustling city',
                'image_url': 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=300&h=200&fit=crop',
                'place_count': 15
            },
            {
                'id': 'london_pubs',
                'title': 'Historic Pubs in London',
                'description': 'Where history meets great beer',
                'image_url': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=300&h=200&fit=crop',
                'place_count': 10
            },
            {
                'id': 'la_beaches',
                'title': 'Best Beaches in Los Angeles',
                'description': 'Sun, surf, and endless summer vibes',
                'image_url': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=200&fit=crop',
                'place_count': 7
            }
        ]
        
        return jsonify({
            'featured_lists': featured_lists,
            'friend_activity': friend_activity[:15],  # Limit to 15 most recent activities
            'total_activities': len(friend_activity)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/user/reviewed-places', methods=['GET'])
@require_auth
def get_user_reviewed_places():
    """Get all places the user has reviewed with coordinates for map display"""
    user_id = request.user_id
    
    try:
        # Get all reviews by the user that have coordinates
        result = supabase.table('reviews').select(
            'place_id, place_name, rating, comment, latitude, longitude, created_at'
        ).eq('user_id', user_id).not_.is_('latitude', 'null').not_.is_('longitude', 'null').execute()
        
        # Format the places for map display
        reviewed_places = []
        for review in result.data:
            reviewed_places.append({
                'place_id': review['place_id'],
                'place_name': review['place_name'],
                'rating': review['rating'],
                'comment': review['comment'],
                'latitude': float(review['latitude']),
                'longitude': float(review['longitude']),
                'created_at': review['created_at']
            })
        
        return jsonify({
            'places': reviewed_places,
            'total_places': len(reviewed_places)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/health', methods=['GET'])
def health_check():
    """Simple health check endpoint"""
    return jsonify({"status": "healthy", "message": "Flask + Supabase backend is running"}), 200


if __name__ == '__main__':
    app.run(debug=True, port=5001)