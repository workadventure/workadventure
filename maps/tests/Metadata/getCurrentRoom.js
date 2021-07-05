WA.onInit().then(() => {
    console.log('id: ', WA.room.id);
    console.log('Map URL: ', WA.room.mapURL);
    console.log('Player name: ', WA.player.name);
    console.log('Player id: ', WA.player.id);
    console.log('Player tags: ', WA.player.tags);
});

WA.room.getMap().then((data) => {
    console.log('Map data', data);
})
