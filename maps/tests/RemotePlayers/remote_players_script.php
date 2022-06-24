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
                    document.getElementById("events").innerText += "New user: " + remotePlayer.name + "\n";
                });

                WA.players.onPlayerLeaves().subscribe((remotePlayer) => {
                    document.getElementById("events").innerText += "User left: " + remotePlayer.name + "\n";
                });

                WA.players.onPlayersMove().subscribe(({ player, newPosition, oldPosition }) => {
                    document.getElementById("events").innerText += `User : ${player.name} moved from (${oldPosition.x}, ${oldPosition.y}) to (${newPosition.x}, ${newPosition.y})\n`;
                });


                document.getElementById('listCurrentPlayers').addEventListener('click', () => {
                    document.getElementById('list').innerHTML = '';
                    for (const player of WA.players.list()) {
                        document.getElementById('list').innerHTML += "<li>User " + player.id + ": " + player.name + "</li>";
                    }
                });
            });
        })
    </script>
</head>
<body>
<p>Players list (updated when button is clicked)</p>
<ul id="list">

</ul>
<br/>
<button id="listCurrentPlayers">List current connected players</button>

<p>
Events:
<pre id="events">

</pre>
</p>

</body>
</html>
