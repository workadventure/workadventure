

/*WA.getMapUrl().then((map) => {console.log('mapUrl : ', map)});
WA.getUuid().then((uuid) => {console.log('Uuid : ',uuid)});
WA.getRoomId().then((roomId) => console.log('roomID : ',roomId));*/

//WA.onPlayerMove(console.log);
WA.setProperty('metadata', 'openWebsite', 'https://fr.wikipedia.org/');
WA.getDataLayer().then((data) => {console.log('data 1 : ', data)});