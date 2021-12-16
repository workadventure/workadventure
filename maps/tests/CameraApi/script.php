<!doctype html>
<html lang="en">
<head>
    <script src="<?php echo $_SERVER["FRONT_URL"] ?>/iframe_api.js"></script>
    <script>
        window.addEventListener('load', () => {
            console.log('On load');
            WA.onInit().then(() => {
                console.log('After WA init');
                const setPositionButton = document.getElementById('setPositionButton');
                const focusOnButton = document.getElementById('focusOnButton');
                const followPlayerButton = document.getElementById('followPlayerButton');
                const xField = document.getElementById('x');
                const yField = document.getElementById('y');
                const widthField = document.getElementById('width');
                const heightField = document.getElementById('height');
                const smoothField = document.getElementById('smooth');

                setPositionButton.addEventListener('click', () => {
                    console.log('SET POSITION BUTTON PRESSED');
                    console.log(smoothField.checked);
                    WA.camera.setPosition(
                        parseInt(xField.value),
                        parseInt(yField.value),
                        parseInt(widthField.value),
                        parseInt(heightField.value),
                        smoothField.checked,
                    );
                });

                focusOnButton.addEventListener('click', () => {
                    WA.camera.focusOn(
                        parseInt(xField.value),
                        parseInt(yField.value),
                        parseInt(widthField.value),
                        parseInt(heightField.value),
                        smoothField.checked,
                    );
                });

                followPlayerButton.addEventListener('click', () => {
                    WA.camera.followPlayer(smoothField.checked);
                });
            });
        })
    </script>
</head>
<body>
X: <input type="text" id="x" value="64" /><br/>
Y: <input type="text" id="y" value="64" /><br/>
width: <input type="text" id="width" value="600" /><br/>
height: <input type="text" id="height" value="400" /><br/>
Smooth: <input type="checkbox" id="smooth" value=1 /><br/>

<button id="setPositionButton">Set Position</button>
<button id="focusOnButton">Focus On</button>
<button id="followPlayerButton">Follow Player</button>

</body>
</html>
