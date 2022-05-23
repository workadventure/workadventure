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

                const createButton = document.getElementById('createButton');

                const xField = document.getElementById('x');
                const yField = document.getElementById('y');
                const widthField = document.getElementById('width');
                const heightField = document.getElementById('height');

                createButton.addEventListener('click', () => {
                    const area = WA.area.create({
                        name: 'DynamicArea',
                        x: Number(xField.value) ?? 0,
                        y: Number(yField.value) ?? 0,
                        width: Number(widthField.value) ?? 320,
                        height: Number(heightField.value) ?? 320,
                    });
                    console.log(area);
                    // WA.area.setProperty('DynamicArea', 'focusable', true);
                });

                WA.area.onEnter('DynamicArea').subscribe(() => {
                    console.log('area enter message');
                });

                WA.area.onLeave('DynamicArea').subscribe(() => {
                    console.log('area leave message');
                });
            });
        })
    </script>
</head>
<body style="color: #ffffff">
x: <input type="text" id="x" value=0 /><br/>
y: <input type="text" id="y" value=0 /><br/>
width: <input type="text" id="width" value=320 /><br/>
height: <input type="text" id="height" value=320 /><br/>

<button id="createButton">Create Area</button>

</body>
</html>
