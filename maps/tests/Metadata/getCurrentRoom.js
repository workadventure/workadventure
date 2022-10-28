WA.onInit().then(async () => {
    console.log('id: ', WA.room.id);
    console.log('Map URL: ', WA.room.mapURL);
    console.log('Player name: ', WA.player.name);
    console.log('Player id: ', WA.player.id);
    console.log('Player tags: ', WA.player.tags);
    console.log('Player token: ', WA.player.userRoomToken);
    console.log('Player woka: ', await WA.player.woka);
    setTimeout(async () => console.log('Player woka: ', await WA.player.woka), 5000)

    console.log("Metadata: ", WA.metadata);
});

WA.room.getTiledMap().then((data) => {
    console.log('Map data', data);
})
