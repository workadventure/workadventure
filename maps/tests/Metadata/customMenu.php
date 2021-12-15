<!doctype html>
<html lang="en">
<head>
    <script src="<?php echo $_SERVER["FRONT_URL"] ?>/iframe_api.js"></script>
    <script>
        window.addEventListener('load', () => {
            WA.ui.registerMenuCommand('test', 'customIframeMenu.html', {autoClose: true});
        })
    </script>
</head>
<body>
    <p>Add a custom menu</p>
</body>
</html>
