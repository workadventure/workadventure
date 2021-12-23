<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>API in iframe menu</title>
    <script src="<?php echo $_SERVER["FRONT_URL"] ?>/iframe_api.js"></script>
    <script>
    window.addEventListener('load', () => {
      WA.chat.sendChatMessage('The iframe opened by a script works !', 'Mr Robot');
    })
    </script>
</head>
<body style="text-align: center">
    <p style="color: whitesmoke">This is an iframe in a custom menu.</p>
</body>
</html>
