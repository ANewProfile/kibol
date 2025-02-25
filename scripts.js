var URLACCESS = "http://127.0.0.1:5000/"

joinRoom = () => {
    $.ajax({
        url: URLACCESS + "checkroomexists",
        type: 'GET',
        dataType: 'json',
        data: {
            "roomid": document.getElementById("joinCode").value,
        },
        success: function (data) {
            // if exists:
                // check # users
                // if === 6, alert("Room is full")
                // else, add user to room
            // if not:
                // create room
                // add user to SQL database
            if (data['exists'] === false) {
                alert("Room does not exist");
            } else {
                alert(`Room exists and has ${data['users']} users`);
            }
        },
        error: function (error) {
            console.error('Error:', error);
        }
    })

    window.location.href = '/kibol/questionspage'
}
