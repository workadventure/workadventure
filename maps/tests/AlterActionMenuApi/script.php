<!doctype html>
<html lang="en">
<head>
    <script src="<?php echo $_SERVER["FRONT_URL"] ?>/iframe_api.js"></script>
    <script>
        window.addEventListener('load', () => {
            //@ts-ignore
            WA.onInit().then(() => {
                console.log('After WA init');
                const addActionButton = document.getElementById('addActionButton');
                const removeActionButton = document.getElementById('removeActionButton');

                console.log('===== D1 =====');
                WA.utils.onActionMenuClicked.subscribe((data) => {
                    console.log(data);
                });
                
                
                // ((remotePlayerID) => {
                //     console.log('on action menu clicked from script');
                // });

                addActionButton.addEventListener('click', () => {
                    console.log('add action');
                    // WA.camera.set(
                    //     parseInt(xField.value),
                    //     parseInt(yField.value),
                    //     widthField.value ? parseInt(widthField.value) : undefined,
                    //     heightField.value ? parseInt(heightField.value) : undefined,
                    //     lockField.checked,
                    //     smoothField.checked,
                    // );
                });

                removeActionButton.addEventListener('click', () => {
                    console.log('remove action');
                    // WA.camera.followPlayer(smoothField.checked);
                });
            });
        })
    </script>
</head>
<body>

<button id="addActionButton">Add Action</button>
<button id="removeActionButton">Remove Action</button>

</body>
</html>
