import {RoomConnection} from "../front/src/Connexion/RoomConnection";
import {connectionManager} from "../front/src/Connexion/ConnectionManager";
import * as WebSocket from "ws"

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

RoomConnection.setWebsocketFactory((url: string) => {
    return new WebSocket(url);
});

async function startOneUser(): Promise<void> {
    const connection = await connectionManager.connectToRoomSocket();
    connection.emitPlayerDetailsMessage('foo', ['male3']);

    await connection.joinARoom('global__maps.workadventure.localhost/Floor0/floor0', 783, 170, 'down', false, {
        top: 0,
        bottom: 200,
        left: 500,
        right: 800
    });
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


    for (let userNo = 0; userNo < 40; userNo++) {
        startOneUser();
        // Wait 0.5s between adding users
        await sleep(500);
    }
})();
