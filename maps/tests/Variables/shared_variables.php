<!doctype html>
<html lang="en">
<head>
    <script src="<?php echo $_SERVER["FRONT_URL"] ?>/iframe_api.js"></script>
    <script>
        window.addEventListener('load', () => {
            console.log('On load');
            WA.onInit().then(() => {
                console.log('After WA init');
                const textField = document.getElementById('textField');
                textField.value = WA.state.textField;

                textField.addEventListener('change', function (evt) {
                    console.log('saving variable')
                    WA.state.textField = this.value;
                });

                WA.state.onVariableChange('textField').subscribe((value) => {
                    console.log('variable changed received')
                    textField.value = value;
                });

                document.getElementById('btn').addEventListener('click', () => {
                    console.log(WA.state.loadVariable('textField'));
                    document.getElementById('placeholder').innerText = WA.state.loadVariable('textField');
                });

                document.getElementById('setUndefined').addEventListener('click', () => {
                    WA.state.textField = undefined;
                    document.getElementById('textField').value = '';
                });
            });
        })
    </script>
</head>
<body>
<input type="text" id="textField" />

<button id="setUndefined">Delete variable</button>

<button id="btn">Display textField variable value</button>
<div id="placeholder"></div>
</body>
</html>
