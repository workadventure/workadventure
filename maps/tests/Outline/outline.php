<!doctype html>
<html lang="en">
<head>
    <script src="<?php echo $_SERVER["FRONT_URL"] ?>/iframe_api.js"></script>
    <script>
        WA.onInit().then(() => {
            console.log('After WA init');
            const setOutlineButton = document.getElementById('setOutline');
            const removeOutlineButton = document.getElementById('removeOutline');
            const redField = document.getElementById('red');
            const greenField = document.getElementById('green');
            const blueField = document.getElementById('blue');

            setOutlineButton.addEventListener('click', () => {
                console.log('SETTING OUTLINE');
                WA.player.setOutlineColor(parseInt(redField.value), parseInt(greenField.value), parseInt(blueField.value));
            });

            removeOutlineButton.addEventListener('click', () => {
                console.log('REMOVING OUTLINE');
                WA.player.removeOutlineColor();
            });
        });
    </script>
</head>
<body>
red: <input type="text" id="red" value="0" /><br/>
green: <input type="text" id="green" value="0" /><br/>
blue: <input type="text" id="blue" value="0" /><br/>

<button id="setOutline">Set outline</button>

<button id="removeOutline">Remove outline</button>

</body>
</html>
