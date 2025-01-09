var URLACCESS = "http://127.0.0.1:5000/"

joinRoom = () => {
    // run python function to check if room exists
    // if exists:
        // check # users
        // if === 6, alert("Room is full")
        // else, add user to room
    // if not:
        // create room
        // add user to SQL database

    window.location.href = URLACCESS + document.getElementById("joinCode").value;
}
