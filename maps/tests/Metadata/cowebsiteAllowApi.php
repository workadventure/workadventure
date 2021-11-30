<!doctype html>
<html lang="en">
    <head>
        <script src="<?php echo $_SERVER["FRONT_URL"] ?>/iframe_api.js"></script>
        <script>
            window.addEventListener('load', () => {
                WA.chat.sendChatMessage('The iframe opened by a script works !', 'Mr Robot');
            })
        </script>
    </head>
    <body>
        <p>Website opened by script.</p>
    </body>
</html>
