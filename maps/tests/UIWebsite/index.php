<html>
    <head>
        <script src="<?php echo $_SERVER["FRONT_URL"] ?>/iframe_api.js"></script>
        <script>
            WA.onInit().then(async () => {
                console.log("IframeId WA",WA.iframeId);
            });

        </script>
    </head>
    <body style="background-color: white;">
    This is test page
    </body>

</html>