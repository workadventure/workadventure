<!doctype html>
<html lang="en">
<head>
    <script src="<?php echo $_SERVER["FRONT_URL"] ?>/iframe_api.js"></script>
    <script>
        window.addEventListener('load', () => {
            //@ts-ignore
            WA.camera.onCameraUpdate((worldView) => console.log(worldView));
            WA.onInit().then(() => {
                console.log('After WA init');
                const setCameraButton = document.getElementById('setCameraButton');
                const followPlayerButton = document.getElementById('followPlayerButton');
                const xField = document.getElementById('x');
                const yField = document.getElementById('y');
                const widthField = document.getElementById('width');
                const heightField = document.getElementById('height');
                const smoothField = document.getElementById('smooth');
                const durationField = document.getElementById('duration');
                const lockField = document.getElementById('lock');

                setCameraButton.addEventListener('click', () => {
                    WA.camera.set(
                        parseInt(xField.value),
                        parseInt(yField.value),
                        widthField.value ? parseInt(widthField.value) : undefined,
                        heightField.value ? parseInt(heightField.value) : undefined,
                        lockField.checked,
                        smoothField.checked,
                        durationField.value ? parseInt(durationField.value) : undefined
                    );
                });

                followPlayerButton.addEventListener('click', () => {
                    WA.camera.followPlayer(smoothField.checked, (durationField.value ? parseInt(durationField.value) : undefined));
                });
            });
        })
    </script>
</head>
<body>
X: <input type="text" id="x" value="496" /><br/>
Y: <input type="text" id="y" value="655" /><br/>
width: <input type="text" id="width" value="480" /><br/>
height: <input type="text" id="height" value="286" /><br/>
Smooth: <input type="checkbox" id="smooth" value=1 /><br/>
Duration: <input type="text" id="duration" value="1000" /><br/>
Lock: <input type="checkbox" id="lock" value=1 /><br/>

<button id="setCameraButton">Set Camera</button>
<button id="followPlayerButton">Follow Player</button>

</body>
</html>
