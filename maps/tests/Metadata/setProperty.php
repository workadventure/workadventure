<!doctype html>
<html lang="en">
    <head>
        <script src="<?php echo $_SERVER["FRONT_URL"] ?>/iframe_api.js"></script>
        <script>
            window.addEventListener('load', () => {
                WA.room.setProperty('iframeTest', 'openWebsite', 'https://www.wikipedia.org/');
                WA.room.setProperty('metadata', 'openWebsite', 'https://www.wikipedia.org/');
            })
        </script>
    </head>
    <body>
        <p>Change the url of this iframe and add the 'openWebsite' property to the red tile layer</p>
    </body>
</html>
