from flask import Flask, request, jsonify
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

conn = psycopg2.connect(
    host=os.getenv("DB_HOST"),
    dbname=os.getenv("DB_NAME"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    port=5432
)
cursor = conn.cursor()


@app.route('/add_review', methods=['POST'])
def add_review():
    data = request.get_json()
    review_id = data.get('review_id')
    user_id = data.get('user_id')
    place_id = data.get('place_id')
    rating = data.get('rating')
    comment = data.get('comment')

    try:
        cursor.execute("""
            INSERT INTO reviews (review_id, user_id, place_id, rating, comment)
            VALUES (%s, %s, %s, %s, %s)
        """, (review_id, user_id, place_id, rating, comment))
        conn.commit()
        return jsonify({"message": "Review added successfully"}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    

@app.route('/get_reviews', methods=['GET'])
def get_reviews():
    place_id = request.args.get('place_id')  # GET params, not JSON body
    if not place_id:
        return jsonify({"error": "Missing place_id"}), 400

    try:
        cursor.execute("""
            SELECT id, user_id, place_id, score, comment
            FROM ratings
            WHERE place_id = %s;
        """, (place_id,))
        rows = cursor.fetchall()
        reviews = [
            {
                "review_id": row[0],
                "user_id": row[1],
                "place_id": row[2],
                "score": row[3],
                "comment": row[4]
            }
            for row in rows
        ]
        return jsonify({"reviews": reviews}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# add friend
@app.route('/add_friend', methods=['POST'])
def add_friend():
    data = request.get_json()
    person_id = data.get('person_id')
    friend_id = data.get('friend_id')
    if not person_id or not friend_id:
        return jsonify({"error": "Missing person_id or friend_id"}), 400

    try:
        cursor.execute("""
            INSERT INTO friends (person_id, friend_id)
            VALUES (%s, %s)
            ON CONFLICT (person_id, friend_id) DO NOTHING;
        """, (person_id, friend_id))
        conn.commit()
        return jsonify({"message": "Friend added successfully"}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500


# Delete friend
@app.route('/remove_friend', methods=['DELETE'])
def remove_friend():
    data = request.get_json()
    person_id = data.get('person_id')
    friend_id = data.get('friend_id')

    try:
        cursor.execute("""
            DELETE FROM friends
            WHERE person_id = %s AND friend_id = %s;
        """, (person_id, friend_id))
        conn.commit()
        return jsonify({"message": "Friend removed successfully"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

# Get user's friends
@app.route('/friends/<user_id>', methods=['GET'])
def get_friends(user_id):
    try:
        cursor.execute("""
            SELECT friend_id FROM friends
            WHERE person_id = %s;
        """, (user_id,))
        rows = cursor.fetchall()
        friend_ids = [row[0] for row in rows]
        return jsonify({"friends": friend_ids}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

if __name__ == '__main__':
    app.run(debug=True)