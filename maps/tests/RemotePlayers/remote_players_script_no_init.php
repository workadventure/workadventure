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

            try {
                WA.players.onPlayerEnters;
            } catch (e) {
                document.getElementById('onPlayerEntersException').innerText = "Yes";
            }

            try {
                WA.players.onPlayerLeaves;
            } catch (e) {
                document.getElementById('onPlayerLeavesException').innerText = "Yes";
            }
        })
    </script>
</head>

<body>

    <p>Exception correctly thrown for onPlayerEnters: <span id="onPlayerEntersException">No</span></p>
    <p>Exception correctly thrown for onPlayerLeaves: <span id="onPlayerLeavesException">No</span></p>

</body>

</html>
