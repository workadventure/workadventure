import {RoomConnection} from "../play/src/front/Connexion/RoomConnection";
import {connectionManager} from "../play/src/front/Connexion/ConnectionManager";
import * as WebSocket from "ws"
import { AvailabilityStatus } from '../play/src/messages/ts-proto-generated/protos/messages';

let userMovedCount = 0;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

RoomConnection.setWebsocketFactory((url: string) => {
    return new WebSocket(url);
});

async function startOneUser(): Promise<void> {
    const onConnect = await connectionManager.connectToRoomSocket(process.env.ROOM_ID ? process.env.ROOM_ID : '_/global/maps.workadventure.localhost/Floor0/floor0.json', 'TEST', ['male3'],
        {
            x: 783,
            y: 170
        }, {
            top: 0,
            bottom: 200,
            left: 500,
            right: 800
        },
        null,
        AvailabilityStatus.ONLINE);

    const connection = onConnect.connection;

    connection.onUserMoved(() => {
        userMovedCount++;
    })

    console.log(connection.getUserId());

    let angle = Math.random() * Math.PI * 2;

    for (let i = 0; i < 100; i++) {
        const x = Math.floor(320 + 1472/2 * (1 + Math.sin(angle)));
        const y = Math.floor(200 + 1090/2 * (1 + Math.cos(angle)));

        connection.sharePosition(x, y, 'down', true, {
            top: y - 200,
            bottom: y + 200,
            left: x - 320,
            right: x + 320
        })

        angle += 0.05;

        await sleep(200);
    }

    await sleep(10000);
    connection.closeConnection();
}

(async () => {
    connectionManager.initBenchmark();

    const promises = [];

    for (let userNo = 0; userNo < 160; userNo++) {
        const promise = startOneUser();
        promises.push(promise);
        // Wait 0.5s between adding users
        await sleep(125);
    }

    await Promise.all(promises);
    console.log('User moved count: '+userMovedCount);
})();
