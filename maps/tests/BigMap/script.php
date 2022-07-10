<!doctype html>
<html lang="en">
    <head>
        <script src="<?php echo $_SERVER["FRONT_URL"] ?>/iframe_api.js"></script>
        <script>
            window.addEventListener('load', () => {
                document.getElementById('show/hideLayer').onclick = () => {
                    if (document.getElementById('show/hideLayer').checked) {
                        WA.room.showLayer('wall');
                    }
                    else {
                        WA.room.hideLayer('wall');
                    }
                }
            })
        </script>
    </head>
    <body style="color: #ffffff">
    	<div>
            <label for="show/hideLayer">Hide Layer: </label><input type="checkbox" id="show/hideLayer" name="visible" value="show" checked>
        </div>
    </body>
</html>
