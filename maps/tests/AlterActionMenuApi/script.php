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

                WA.ui.onRemotePlayerClicked.subscribe((remotePlayer) => {
                    const action = remotePlayer.addAction('tell a joke', () => {
                        console.log('I am telling you a joke');
                        window.setTimeout(
                            () => {
                                action.remove();
                                console.log('remove action');
                            },
                            1000,
                        );
                    });
                    remotePlayer.addAction('do NOT tell a joke', () => {
                        console.log('I am NOT telling you a joke');
                    });
                });
                
                addActionButton.addEventListener('click', () => {
                    // const randomActionName = Math.random().toString();
                    // randomActions.push(randomActionName);
                    // WA.ui.addActionsMenuKeyToRemotePlayer(lastRemotePlayerClicked, randomActionName);
                });

                removeActionButton.addEventListener('click', () => {
                    // const randomAction = randomActions.pop();
                    // if (randomAction) {
                    //     WA.ui.removeActionsMenuKeyFromRemotePlayer(lastRemotePlayerClicked, randomAction);
                    // }
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
