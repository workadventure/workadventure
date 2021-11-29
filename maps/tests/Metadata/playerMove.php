<!doctype html>
<html lang="en">
    <head>
        <script src="<?php echo $_SERVER["FRONT_URL"] ?>/iframe_api.js"></script>
        <script>
            window.addEventListener('load', () => {
                WA.player.onPlayerMove(console.log);
            })
        </script>
    </head>
    <body>
        <p>Log in the console the movement of the current player in the zone of the iframe</p>
    </body>
</html>
