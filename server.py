from flask import Flask, request, jsonify
from flask_socketio import SocketIO, join_room, leave_room, emit
from flask_cors import CORS
import gevent
from gevent import monkey
monkey.patch_all()

app = Flask(__name__)  # Remove the port parameter here
CORS(app)

socketio = SocketIO(
    app,
    cors_allowed_origins=["http://127.0.0.1:5500", "http://localhost:5500"],
    async_mode='gevent',
    logger=True,
    engineio_logger=True
)

# Store room information
rooms = {}

@socketio.on('join')
def on_join(data):
    room = data['room']
    username = data['username']
    
    if room not in rooms:
        rooms[room] = {'players': {}}
    
    # Add the new player
    rooms[room]['players'][username] = {'score': 0}
    join_room(room)
    
    # Emit to ALL clients in the room, including the sender
    emit('player_update', {'players': rooms[room]['players']}, to=room)

@socketio.on('start_game')
def on_start_game(data):
    room = data['room']
    emit('start_game', to=room)

@socketio.on('sync_question')
def on_sync_question(data):
    room = data['room']
    question_state = data.get('questionState', {})
    emit('sync_question', {'questionState': question_state}, to=room)

@socketio.on('update_score')
def on_update_score(data):
    room = data['room']
    username = data['username']
    score = data['score']
    
    if room in rooms and username in rooms[room]['players']:
        rooms[room]['players'][username]['score'] = score
        # Emit to ALL clients in the room
        emit('player_update', {'players': rooms[room]['players']}, to=room)

@socketio.on('disconnect')
def on_disconnect():
    for room in rooms:
        for username, player in list(rooms[room]['players'].items()):
            if request.sid in player.get('sids', []):
                del rooms[room]['players'][username]
                # Emit updated player list after disconnect
                emit('player_update', {'players': rooms[room]['players']}, to=room)
                break

@socketio.on('start_reading')
def on_start_reading(data):
    room = data['room']
    emit('start_reading', to=room)

if __name__ == '__main__':
    socketio.run(
        app,
        host='127.0.0.1',
        port=8080,  # Port is specified here in socketio.run()
        debug=True,
        use_reloader=False,
        allow_unsafe_werkzeug=True
    )
