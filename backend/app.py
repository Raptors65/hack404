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