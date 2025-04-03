const socket = io('http://127.0.0.1:8080', {
    transports: ['websocket'],
    upgrade: false
});

function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function createRoom() {
    const username = document.getElementById('username').value.trim();
    if (!username) {
        alert('Please enter a username');
        return;
    }
    
    const roomCode = generateRoomCode();
    sessionStorage.setItem('username', username);
    sessionStorage.setItem('roomCode', roomCode);
    sessionStorage.setItem('isHost', 'true');
    
    window.location.href = 'questionspage/index.html';
}

function joinRoom() {
    const username = document.getElementById('username').value.trim();
    const roomCode = document.getElementById('roomCode').value.trim();
    
    if (!username || !roomCode) {
        alert('Please enter both username and room code');
        return;
    }
    
    sessionStorage.setItem('username', username);
    sessionStorage.setItem('roomCode', roomCode);
    sessionStorage.setItem('isHost', 'false');
    
    window.location.href = 'questionspage/index.html';
}
