<!doctype html>
<html lang="en">
<head>
    <script src="<?php echo $_SERVER["FRONT_URL"] ?>/iframe_api.js"></script>
    <script>
        window.addEventListener('load', () => {
            //@ts-ignore
            WA.onInit().then(() => {
                console.log('After WA init');
                let lastRemotePlayerClicked;
                const addActionButton = document.getElementById('addActionButton');
                const removeActionButton = document.getElementById('removeActionButton');

                console.log('===== D1 =====');
                WA.utils.onRemotePlayerClicked.subscribe((data) => {
                    console.log(data);
                    lastRemotePlayerClicked = data.id;
                    WA.utils.addMenuActionKeysToRemotePlayer(data.id, ['hit me', 'log info']);
                });
                
                
                // ((remotePlayerID) => {
                //     console.log('on action menu clicked from script');
                // });

                addActionButton.addEventListener('click', () => {
                    console.log('add action');
                    WA.utils.addMenuActionKeysToRemotePlayer(lastRemotePlayerClicked, [Math.random().toString()]);
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
