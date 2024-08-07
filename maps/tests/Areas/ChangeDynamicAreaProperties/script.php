<!doctype html>
<html lang="en">

<head>
    <script src="<?php echo $_SERVER["FRONT_URL"] ?>/iframe_api.js"></script>
    <script>
        window.addEventListener('load', () => {
            //@ts-ignore
            WA.camera.onCameraUpdate((worldView) => console.log(worldView));
            WA.onInit().then(async () => {
                console.log('After WA init');
                const updateButton = document.getElementById('updateButton');

                const focusableField = document.getElementById('focusable');
                const zoomMarginField = document.getElementById('zoom_margin');
                const silentField = document.getElementById('silent');
                const openWebisteField = document.getElementById('openWebiste');
                const jitsiRoomField = document.getElementById('jitsiRoom');
                const jitsiTriggerField = document.getElementById('jitsiTrigger');
                const onAreaEnterField = document.getElementById('onAreaEnter');
                const onAreaLeaveField = document.getElementById('onAreaLeave');

                const area = WA.room.area.create({
                    name: 'Center',
                    x: 224,
                    y: 256,
                    width: 514,
                    height: 292,
                });

                area.setProperty('focusable', true);

                WA.room.area.onEnter('Center').subscribe(() => {
                    console.log(onAreaEnterField.value || 'default area enter message');
                });

                WA.room.area.onLeave('Center').subscribe(() => {
                    console.log(onAreaLeaveField.value || 'default area leave message');
                });

                updateButton.addEventListener('click', () => {
                    area.setProperty('focusable', focusableField.checked);
                    area.setProperty('silent', silentField.checked);
                    area.setProperty('zoom_margin', zoomMarginField.value || undefined);
                    area.setProperty('openWebsite', openWebisteField.value || undefined);
                    area.setProperty('jitsiRoom', jitsiRoomField.value || undefined);
                    area.setProperty('jitsiTrigger', jitsiTriggerField.value || undefined);
                });
            });
        })
    </script>
</head>

<body style="color: #ffffff">
    focusable: <input type="checkbox" id="focusable" value=1 checked /><br />
    zoom_margin: <input type="text" id="zoom_margin" value=0 /><br />
    silent: <input type="checkbox" id="silent" value=0 /><br />
    openWebsite: <input type="text" id="openWebiste" value="https://workadventu.re/" /><br />
    jitsiRoom: <input type="text" id="jitsiRoom" value="Meeting Room" /><br />
    jitsiTrigger: <input type="text" id="jitsiTrigger" value="onaction" /><br />
    onAreaEnterLog: <input type="text" id="onAreaEnter" value="Area entered" /><br />
    onAreaLeaveLog: <input type="text" id="onAreaLeave" value="Area left" /><br />

    <button id="updateButton">Update</button>

</body>

</html>
