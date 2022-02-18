<!doctype html>
<html lang="en">
<head>
    <script src="<?php echo $_SERVER["FRONT_URL"] ?>/iframe_api.js"></script>
    <script>
        window.addEventListener('load', () => {
            console.log('On load');
            WA.onInit().then(() => {
                console.log('After WA init');
                const createButton = document.getElementById('createEmbeddedWebsite');
                const deleteButton = document.getElementById('deleteEmbeddedWebsite');
                const xField = document.getElementById('x');
                const yField = document.getElementById('y');
                const widthField = document.getElementById('width');
                const heightField = document.getElementById('height');
                const urlField = document.getElementById('url');
                const visibleField = document.getElementById('visible');
                const originField = document.getElementById('origin');
                const scaleField = document.getElementById('scale');

                createButton.addEventListener('click', () => {
                    console.log('CREATING NEW EMBEDDED IFRAME');
                    WA.room.website.create({
                        name: "test",
                        url: urlField.value,
                        position: {
                            x: parseInt(xField.value),
                            y: parseInt(yField.value),
                            width: parseInt(widthField.value),
                            height: parseInt(heightField.value),
                        },
                        visible: !!visibleField.value,
                        origin: originField.value,
                        scale: parseFloat(scaleField.value),
                    });
                });

                deleteButton.addEventListener('click', () => {
                    WA.room.website.delete("test");
                });

                xField.addEventListener('change', async function() {
                    const website = await WA.room.website.get('test');
                    website.x = parseInt(this.value);
                });
                yField.addEventListener('change', async function() {
                    const website = await WA.room.website.get('test');
                    website.y = parseInt(this.value);
                });
                widthField.addEventListener('change', async function() {
                    const website = await WA.room.website.get('test');
                    website.width = parseInt(this.value);
                });
                heightField.addEventListener('change', async function() {
                    const website = await WA.room.website.get('test');
                    website.height = parseInt(this.value);
                });

                urlField.addEventListener('change', async function() {
                    const website = await WA.room.website.get('test');
                    website.url = this.value;
                });

                visibleField.addEventListener('change', async function() {
                    const website = await WA.room.website.get('test');
                    website.visible = this.checked;
                });

                originField.addEventListener('change', async function() {
                    const website = await WA.room.website.get('test');
                    website.origin = this.value;
                });

                scaleField.addEventListener('change', async function() {
                    const website = await WA.room.website.get('test');
                    website.scale = parseFloat(this.value);
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
URL: <input type="text" id="url" value="https://mensuel.framapad.org/p/rt6c904745-9oxm?lang=en" /><br/>
Visible: <input type="checkbox" id="visible" value=1 /><br/>
Origin: <input type="text" id="origin" value="map" /><br/>
Scale: <input type="text" id="scale" value=1 /><br/>

<button id="createEmbeddedWebsite">Create embedded website</button>

<button id="deleteEmbeddedWebsite">Delete embedded website</button>

</body>
</html>
