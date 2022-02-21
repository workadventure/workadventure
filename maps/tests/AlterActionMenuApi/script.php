<!doctype html>
<html lang="en">
<head>
    <script src="<?php echo $_SERVER["FRONT_URL"] ?>/iframe_api.js"></script>
    <script>
        window.addEventListener('load', () => {
            //@ts-ignore
            WA.onInit().then(() => {
                const addActionButton = document.getElementById('addActionButton');
                const removeActionButton = document.getElementById('removeActionButton');
                let lastRemotePlayerClicked;

                WA.ui.onRemotePlayerClicked.subscribe((remotePlayer) => {
                    lastRemotePlayerClicked = remotePlayer;
                    const action = remotePlayer.addAction('This will disappear!', () => {
                        console.log('You managed to click me, young hero');
                    });
                    window.setTimeout(
                        () => {
                            action.remove();
                            console.log('remove action');
                        },
                        1000,
                    );
                    remotePlayer.addAction('do NOT tell a joke', () => {
                        console.log('I am NOT telling you a joke');
                    });
                });
                
                addActionButton.addEventListener('click', () => {
                    const randomActionName = Math.random().toString();
                    action = lastRemotePlayerClicked?.addAction(randomActionName, () => {
                        console.log(`called action ${randomActionName}`);
                    });
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
