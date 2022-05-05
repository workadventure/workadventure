<!doctype html>
<html lang="en">
    <head>
        <script src="<?php echo $_SERVER["FRONT_URL"] ?>/iframe_api.js"></script>
        <script>

            window.addEventListener('load', () => {
                WA.room.setTiles([
                    {x: 0, y: 0, tile: 92, layer: 'setTiles'},
                    {x: 0, y: 2, tile: 'Red', layer: 'setTiles'},
                    {x: 0, y: 3, tile: 99, layer: 'setTiles'},
                    {x: 0, y: 5, tile: 117, layer: 'setTiles'},
                    {x: 0, y: 6, tile: 117, layer: 'setTiles'},
                    {x: 0, y: 9, tile: 74, layer: 'setTiles'}
                ]);
                WA.room.setTiles([
                    {x: 6, y: 4, tile: 'blue', layer: 'setTiles'},
                    {x: 7, y: 4, tile: 109, layer: 'setTiles'},
                    {x: 8, y: 4, tile: 109, layer: 'setTiles'},
                    {x: 9, y: 4, tile: 'blue', layer: 'setTiles'}
                ]);
            });
        </script>
    </head>
    <body>
    </body>
</html>
