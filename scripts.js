var URLACCESS = "http://127.0.0.1:5000/"

joinRoom = () => {
    const roomCode = document.getElementById("joinCode").value;
    const username = document.getElementById("username").value;

    if (!roomCode || !username) {
        alert("Please enter both room code and username");
        return;
    }

    sessionStorage.setItem('roomCode', roomCode);
    sessionStorage.setItem('username', username);

    $.ajax({
        url: URLACCESS + "checkroomexists",
        type: 'GET',
        dataType: 'json',
        crossDomain: true,
        xhrFields: {
            withCredentials: false
        },
        data: {
            "roomid": roomCode,
            "username": username
        },
        success: function (data) {
            if (data['exists'] === false) {
                // Create new room
                $.ajax({
                    url: URLACCESS + "createroom",
                    type: 'POST',
                    dataType: 'json',
                    crossDomain: true,
                    xhrFields: {
                        withCredentials: false
                    },
                    data: {
                        "roomid": roomCode,
                        "username": username
                    },
                    success: function() {
                        window.location.href = '/kibol/questionspage';
                    }
                });
            } else {
                // Join existing room
                $.ajax({
                    url: URLACCESS + "joinroom",
                    type: 'POST',
                    dataType: 'json',
                    crossDomain: true,
                    xhrFields: {
                        withCredentials: false
                    },
                    data: {
                        "roomid": roomCode,
                        "username": username
                    },
                    success: function() {
                        window.location.href = '/kibol/questionspage';
                    }
                });
            }
        },
        error: function (error) {
            console.error('Error:', error);
        }
    });
}
