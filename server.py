from flask import Flask, request, jsonify
from flask_socketio import SocketIO, join_room, leave_room, emit
from flask_cors import CORS
import sqlite3
import json

app = Flask(__name__)

# Remove all other CORS configurations and just use this simple one
CORS(app)

socketio = SocketIO(app, 
    cors_allowed_origins="*",  # Allow all origins for socket.io
    async_mode='eventlet'
)

# Add CORS headers to all responses
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', 'http://127.0.0.1:5500')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

# Initialize SQLite database
def init_db():
    conn = sqlite3.connect('kibol.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS rooms
                 (room_id TEXT PRIMARY KEY, 
                  current_question TEXT,
                  users TEXT)''')
    conn.commit()
    conn.close()

init_db()

# Helper functions
def get_room_users(room_id):
    conn = sqlite3.connect('kibol.db')
    c = conn.cursor()
    c.execute('SELECT users FROM rooms WHERE room_id = ?', (room_id,))
    result = c.fetchone()
    conn.close()
    
    if result and result[0]:
        return json.loads(result[0])
    return {}

def update_room_users(room_id, users):
    conn = sqlite3.connect('kibol.db')
    c = conn.cursor()
    c.execute('UPDATE rooms SET users = ? WHERE room_id = ?', 
              (json.dumps(users), room_id))
    conn.commit()
    conn.close()

# REST endpoints
@app.route('/checkroomexists', methods=['GET'])
def check_room_exists():
    room_id = request.args.get('roomid')
    
    conn = sqlite3.connect('kibol.db')
    c = conn.cursor()
    c.execute('SELECT COUNT(*) FROM rooms WHERE room_id = ?', (room_id,))
    exists = c.fetchone()[0] > 0
    
    if exists:
        users = get_room_users(room_id)
        num_users = len(users)
    else:
        num_users = 0
        
    conn.close()
    
    return jsonify({
        'exists': exists,
        'users': num_users
    })

@app.route('/createroom', methods=['POST'])
def create_room():
    room_id = request.form.get('roomid')
    username = request.form.get('username')
    
    conn = sqlite3.connect('kibol.db')
    c = conn.cursor()
    
    # Create new room with initial user
    users = {username: 0}  # username: score
    c.execute('INSERT INTO rooms (room_id, users) VALUES (?, ?)',
              (room_id, json.dumps(users)))
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True})

@app.route('/joinroom', methods=['POST'])
def join_room_http():
    room_id = request.form.get('roomid')
    username = request.form.get('username')
    
    users = get_room_users(room_id)
    if len(users) >= 6:
        return jsonify({'error': 'Room is full'}), 400
        
    users[username] = 0
    update_room_users(room_id, users)
    
    return jsonify({'success': True})

# Socket.IO events
@socketio.on('joinQuestionRoom')
def on_join(data):
    room = data['roomCode']
    username = data['username']
    join_room(room)
    
    # Notify others that user joined
    users = get_room_users(room)
    emit('userJoined', {'users': users}, room=room)

@socketio.on('disconnect')
def on_disconnect():
    # Handle user disconnection
    # You might want to remove the user from the room's user list
    pass

@socketio.on('newQuestion')
def on_new_question(data):
    room = data['roomCode']
    
    # Store current question in database
    conn = sqlite3.connect('kibol.db')
    c = conn.cursor()
    c.execute('UPDATE rooms SET current_question = ? WHERE room_id = ?',
              (json.dumps(data), room))
    conn.commit()
    conn.close()
    
    # Broadcast new question to all users in room
    emit('questionUpdate', {
        'question': data['question'],
        'answer': data['answer'],
        'questionId': data['questionId'],
        'bonuses': data.get('bonuses')
    }, room=room)

@socketio.on('updateScore')
def on_score_update(data):
    room = data['roomCode']
    username = data['username']
    points = data['points']
    
    # Update user's score
    users = get_room_users(room)
    users[username] = users.get(username, 0) + points
    update_room_users(room, users)
    
    # Broadcast updated scores to all users in room
    emit('scoreUpdate', {'users': users}, room=room)

@socketio.on('buzz')
def on_buzz(data):
    room = data['roomCode']
    username = data['username']
    # Notify all users in room who buzzed
    emit('userBuzzed', {'username': username}, room=room)

if __name__ == '__main__':
    socketio.run(app, host='127.0.0.1', debug=True, port=5000)
