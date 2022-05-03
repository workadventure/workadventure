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
                const updateButton = document.getElementById('updateButton');
                const xField = document.getElementById('x');
                const yField = document.getElementById('y');
                const widthField = document.getElementById('width');
                const heightField = document.getElementById('height');

                // setCameraButton.addEventListener('click', () => {
                //     WA.camera.set(
                //         parseInt(xField.value),
                //         parseInt(yField.value),
                //         widthField.value ? parseInt(widthField.value) : undefined,
                //         heightField.value ? parseInt(heightField.value) : undefined,
                //         lockField.checked,
                //         smoothField.checked,
                //     );
                // });

                updateButton.addEventListener('click', () => {
                    WA.room.setAreaProperty('Center', 'focusable', false);
                });
            });
        })
    </script>
</head>
<body style="color: #ffffff">
focusable: <input type="checkbox" id="focusable" value=1 checked /><br/>
zoom_margin: <input type="text" id="zoom_margin" value=0 /><br/>
silent: <input type="checkbox" id="silent" value=0 /><br/>
openWebsite: <input type="text" id="openWebiste" value="https://workadventu.re/" /><br/>
silent: <input type="checkbox" id="silent" value=0 /><br/>
jitsiRoom: <input type="text" id="jitsiRoom" value="Meeting Room" /><br/>
jitsiTrigger: <input type="text" id="jitsiTrigger" value="onaction" /><br/>

<button id="updateButton">Update</button>

</body>
</html>
