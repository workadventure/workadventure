<!doctype html>
<html lang="en">
<head>
    <script src="<?php echo $_SERVER["FRONT_URL"] ?>/iframe_api.js"></script>
    <script>
        let closed = true;
        window.addEventListener('load', () => {
            //@ts-ignore
            WA.onInit().then(() => {
                console.log('After WA init');
                const toogleDoorButton = document.getElementById('toogleDoorButton');

                toogleDoorButton.addEventListener('click', async () => {                    
                    closed ? WA.room.hideLayer('closedPath') : WA.room.showLayer('closedPath');
                    closed = !closed;
                });
            });
        })
    </script>
</head>
<body>

<button id="toogleDoorButton">Toggle Door</button>

</body>
</html>
