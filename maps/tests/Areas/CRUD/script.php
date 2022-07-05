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

                const areas = {};

                const createButton = document.getElementById('createButton');
                const updateButton = document.getElementById('updateButton');
                const deleteButton = document.getElementById('deleteButton');
                const getButton = document.getElementById('getButton');
                const printButton = document.getElementById('printButton');

                const nameField = document.getElementById('name');
                const xField = document.getElementById('x');
                const yField = document.getElementById('y');
                const widthField = document.getElementById('width');
                const heightField = document.getElementById('height');

                const deleteNameField = document.getElementById('deleteName');

                const getNameField = document.getElementById('getName');

                let currentlySelectedArea = undefined;

                createButton.addEventListener('click', () => {
                    const area = WA.room.area.create({
                        name: nameField.value,
                        x: Number(xField.value) ?? 0,
                        y: Number(yField.value) ?? 0,
                        width: Number(widthField.value) ?? 320,
                        height: Number(heightField.value) ?? 320,
                    });
                    currentlySelectedArea = area;
                    areas[nameField.value] = area;
                    
                    WA.room.area.onEnter(nameField.value).subscribe(() => {
                        console.log(`${nameField.value} area enter message`);
                    });
                    WA.room.area.onLeave(nameField.value).subscribe(() => {
                        console.log(`${nameField.value} area leave message`);
                    });
                });

                updateButton.addEventListener('click', async () => {
                    const area = await WA.room.area.get(nameField.value);
                    if (area) {
                        if (xField.value) {
                            console.log('change x to:' + xField.value)
                            area.x = Number(xField.value);
                        }
                        if (yField.value) {
                            console.log('change y to:' + yField.value)
                            area.y = Number(yField.value);
                        }
                        if (widthField.value) {
                            console.log('change width to:' + widthField.value)
                            area.width = Number(widthField.value);
                        }
                        if (heightField.value) {
                            console.log('change height to:' + heightField.value)
                            area.height = Number(heightField.value);
                        }
                    }
                });

                deleteButton.addEventListener('click', () => {
                    WA.room.area.delete(deleteNameField.value);
                    if (currentlySelectedArea?.name === deleteNameField.value) {
                        currentlySelectedArea = undefined;
                    }
                });

                getButton.addEventListener('click', async () => {
                    const area = await WA.room.area.get(getNameField.value);
                    currentlySelectedArea = area;
                    console.log(area);
                });

                printButton.addEventListener('click', async () => {
                    console.log(currentlySelectedArea);
                });
            });
        })
    </script>
</head>
<body style="color: #ffffff">
name: <input type="text" id="name" value='DynamicArea' /><br/>
x: <input type="text" id="x" value=0 /><br/>
y: <input type="text" id="y" value=0 /><br/>
width: <input type="text" id="width" value=320 /><br/>
height: <input type="text" id="height" value=320 /><br/>

<button id="createButton">Create Area</button>
<button id="updateButton">Update Area</button>

<br><br><br>

name: <input type="text" id="deleteName" value='DynamicArea' /><br/>
<button id="deleteButton">Delete Area</button>

<br><br><br>

name: <input type="text" id="getName" value='DynamicArea' /><br/>
<button id="getButton">Get Area</button>

<br><br><br>

<button id="printButton">Print Current Area Info</button>

</body>
</html>
