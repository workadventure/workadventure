<!doctype html>
<html lang="en">
<head>
    <script src="<?php echo $_SERVER["FRONT_URL"] ?>/iframe_api.js"></script>
    <script>
        window.addEventListener('load', () => {
            //@ts-ignore
            WA.onInit().then(() => {

                const actions = {
                    'Ask to tell a joke': () => {
                        console.log("Why don't scientists trust atoms?");
                        setTimeout(() => { console.log('...'); }, 1000);
                        setTimeout(() => { console.log('...'); }, 2000);
                        setTimeout(() => { console.log('BECAUSE THEY MAKE UP EVERYTHING!') }, 3000);
                    },
                }

                const randomActions = [];

                let lastRemotePlayerClicked;
                const addActionButton = document.getElementById('addActionButton');
                const removeActionButton = document.getElementById('removeActionButton');

                WA.utils.onRemotePlayerClicked.subscribe((data) => {
                    console.log(data);
                    lastRemotePlayerClicked = data.id;
                    WA.utils.addActionsMenuKeyToRemotePlayer(data.id, 'Ask to tell a joke');
                });

                WA.utils.onActionsMenuActionClicked.subscribe((data) => {
                    console.log(data);
                    const action = actions[data.actionName];
                    if (action) {
                        action();
                    }
                });
                
                addActionButton.addEventListener('click', () => {
                    const randomActionName = Math.random().toString();
                    randomActions.push(randomActionName);
                    WA.utils.addActionsMenuKeyToRemotePlayer(lastRemotePlayerClicked, randomActionName);
                });

                removeActionButton.addEventListener('click', () => {
                    const randomAction = randomActions.pop();
                    if (randomAction) {
                        WA.utils.removeActionsMenuKeyFromRemotePlayer(lastRemotePlayerClicked, randomAction);
                    }
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
