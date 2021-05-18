

WA.getMapUrl().then((map) => {console.log('mapUrl : ', map)});
WA.getUuid().then((uuid) => {console.log('Uuid : ',uuid)});
WA.getRoomId().then((roomId) => console.log('roomID : ',roomId));

WA.listenPositionPlayer(console.log);


