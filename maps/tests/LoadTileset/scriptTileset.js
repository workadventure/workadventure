WA.room.loadTileset("http://maps.workadventure.localhost/tests/LoadTileset/Yellow.json").then((firstgid) => {
    WA.room.setTiles([
        {x: 5, y: 5, tile: firstgid + 1, layer: 'bottom'},
    ]);
});
