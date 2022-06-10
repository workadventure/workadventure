<!doctype html>
<html lang="en">
<head>
    <style>
        body {
            background-color: white;
            color: black;
        }
    </style>
    <script src="<?php echo $_SERVER["FRONT_URL"] ?>/iframe_api.js"></script>
    <script>
        window.addEventListener('load', () => {
            console.log('On load');

            WA.onInit().then(() => {
                console.log('After WA init');
                WA.players.enableTracking();


                WA.players.onPlayerEnters().subscribe((remotePlayer) => {
                    document.getElementById("text").value += "New user: " + remotePlayer.name + "\n";
                    document.getElementById("events").innerText += "New user: " + remotePlayer.name + "\n";
                });

                WA.players.onPlayerLeaves().subscribe((remotePlayer) => {
                    document.getElementById("text").value += "User left: " + remotePlayer.name + "\n";
                    document.getElementById("events").innerText += "User left: " + remotePlayer.name + "\n";
                });


                document.getElementById('listCurrentPlayers').addEventListener('click', () => {
                    document.getElementById("text").value = "Players list: \n\n";
                    for (const player of WA.players.list()) {
                        document.getElementById("text").value += "User " + player.id + ": " + player.name + "\n";
                    }
                });
            });
        })
    </script>
</head>
<body>
<textarea id="text" rows="30" cols="80">

</textarea>
<br/>
<button id="listCurrentPlayers">List current connected players</button>

<p>
Events:
<pre id="events">

</pre>
</p>

</body>
</html>
