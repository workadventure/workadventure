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

                const focusableField = document.getElementById('focusable');
                const zoomMarginField = document.getElementById('zoom_margin');
                const silentField = document.getElementById('silent');
                const openWebisteField = document.getElementById('openWebiste');
                const jitsiRoomField = document.getElementById('jitsiRoom');
                const jitsiTriggerField = document.getElementById('jitsiTrigger');

                updateButton.addEventListener('click', () => {
                    WA.room.setAreaProperty('Center', 'focusable', focusableField.checked);
                    WA.room.setAreaProperty('Center', 'silent', silentField.checked);
                    WA.room.setAreaProperty('Center', 'zoom_margin', zoomMarginField.value || undefined);
                    WA.room.setAreaProperty('Center', 'openWebsite', openWebisteField.value || undefined);
                    WA.room.setAreaProperty('Center', 'jitsiRoom', jitsiRoomField.value || undefined);
                    WA.room.setAreaProperty('Center', 'jitsiTrigger', jitsiTriggerField.value || undefined);
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
jitsiRoom: <input type="text" id="jitsiRoom" value="Meeting Room" /><br/>
jitsiTrigger: <input type="text" id="jitsiTrigger" value="onaction" /><br/>

<button id="updateButton">Update</button>

</body>
</html>
