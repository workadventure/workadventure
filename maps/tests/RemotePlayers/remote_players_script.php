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
            WA.onInit().then(async () => {
                console.log('WA INIT');
                await WA.players.configureTracking();
                for (const remotePlayer of WA.players.list()) {
                    remotePlayer.state.onVariableChange("testVariable").subscribe((value) => {
                        document.getElementById("events").innerText += "User '" + remotePlayer.name + "' testVariable changed. New value: " + value + " (tracked locally)\n";
                        if (value === remotePlayer.state.testVariable) {
                            document.getElementById("events").innerText += "Asserted value from event and from WA.players.state is the same\n";
                        } else {
                            document.getElementById("events").innerText += "ERROR! Value from event and from WA.players.state are different!\n";
                        }
                    });
                }


                WA.players.onPlayerEnters.subscribe((remotePlayer) => {
                    console.log("REMOTE PLAYER", remotePlayer);
                    document.getElementById("events").innerText += "New user: " + remotePlayer.name + "\n";
                    remotePlayer.state.onVariableChange("testVariable").subscribe((value) => {
                        document.getElementById("events").innerText += "User '" + remotePlayer.name + "' testVariable changed. New value: " + value + " (tracked locally)\n";
                    });
                });

                WA.players.onPlayerLeaves.subscribe((remotePlayer) => {
                    document.getElementById("events").innerText += "User left: " + remotePlayer.name + "\n";
                });

                WA.players.onPlayerMoves.subscribe(({
                    player,
                    newPosition,
                    oldPosition
                }) => {
                    document.getElementById("events").innerText += `User : ${player.name} moved from (${oldPosition.x}, ${oldPosition.y}) to (${newPosition.x}, ${newPosition.y})\n`;
                });


                document.getElementById('listCurrentPlayers').addEventListener('click', () => {
                    document.getElementById('list').innerHTML = '';
                    for (const player of WA.players.list()) {
                        document.getElementById('list').innerHTML += "<li>User " + player.id + ": " + player.name + "</li>";
                    }
                });

                document.getElementById("the-variable").addEventListener('change', (event) => {
                    const value = event.target.value;
                    WA.player.state.saveVariable("testVariable", value, {
                        public: true,
                        persist: true,
                        ttl: 200,
                        scope: "room"
                    });
                });

                WA.players.onVariableChange("testVariable").subscribe(({
                    player,
                    value
                }) => {
                    document.getElementById("events").innerText += "User '" + player.name + "' testVariable changed. New value: " + value + " (tracked globally)\n";
                });
            });
        })
    </script>
</head>

<body>
    <p>Players list (updated when button is clicked)</p>
    <ul id="list">

    </ul>
    <br />
    <button id="listCurrentPlayers">List current connected players</button>

    <hr />

    Change a variable associated to current player:
    <input id="the-variable" type="text" />

    <hr />
    <p>
        Events:
    <pre id="events">
    </pre>
    </p>

</body>

</html>
