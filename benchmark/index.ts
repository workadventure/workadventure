declare global {
    var env: FrontConfigurationInterface;
}

globalThis.env = {
    ADMIN_URL: undefined,
    CHAT_URL: "http://chat.workadventure.localhost",
    CONTACT_URL: undefined,
    DEBUG_MODE: false,
    DISABLE_ANONYMOUS: false,
    DISABLE_NOTIFICATIONS: false,
    ENABLE_CHAT_UPLOAD: false,
    ENABLE_FEATURE_MAP_EDITOR: false,
    ENABLE_OPENID: false,
    FALLBACK_LOCALE: undefined,
    ICON_URL: "http://icon.workadventure.localhost",
    JITSI_PRIVATE_MODE: false,
    JITSI_URL: undefined,
    MAX_PER_GROUP: 0,
    MAX_USERNAME_LENGTH: 0,
    NODE_ENV: "prod",
    OPID_LOGOUT_REDIRECT_URL: undefined,
    OPID_PROFILE_SCREEN_PROVIDER: undefined,
    OPID_WOKA_NAME_POLICY: undefined,
    POSTHOG_API_KEY: undefined,
    POSTHOG_URL: undefined,
    PUSHER_URL: "http://pusher.workadventure.localhost",
    SKIP_RENDER_OPTIMIZATIONS: false,
    STUN_SERVER: undefined,
    TURN_PASSWORD: undefined,
    TURN_SERVER: undefined,
    TURN_USER: undefined,
    UPLOADER_URL: "http://uploader.workadventure.localhost"
};

import { JSDOM } from "jsdom"
const dom = new JSDOM(``, {
    url: "https://play.workadventure.test/",
    //referrer: "https://example.com/",
    contentType: "text/html",
    includeNodeLocations: true,
    storageQuota: 10000000,
    userAgent: "Mozilla/5.0 (X11; Linux i686; rv:107.0) Gecko/20100101 Firefox/107.0",
});
globalThis.document = dom.window.document
globalThis.localStorage = dom.window.localStorage;
//@ts-ignore
globalThis.window = dom.window

import {RoomConnection} from "../play/src/front/Connexion/RoomConnection";
import {connectionManager} from "../play/src/front/Connexion/ConnectionManager";
import WebSocket from "ws"
import {AvailabilityStatus} from "../libs/messages";
import {PositionMessage_Direction} from "../libs/messages";
import {FrontConfigurationInterface} from "../play/src/common/FrontConfigurationInterface";





let userMovedCount = 0;

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

RoomConnection.setWebsocketFactory((url: string) => {
    return new WebSocket(url);
});

async function startOneUser(): Promise<void> {
    const onConnect = await connectionManager.connectToRoomSocket(process.env.ROOM_ID ? process.env.ROOM_ID : '_/global/maps.workadventure.localhost/starter/map.json', 'TEST', ['male3'],
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

    connection.userMovedMessageStream.subscribe(() => {
        userMovedCount++;
    })

    console.log(connection.getUserId());

    let angle = Math.random() * Math.PI * 2;

    for (let i = 0; i < 100; i++) {
        const x = Math.floor(320 + 1472/2 * (1 + Math.sin(angle)));
        const y = Math.floor(200 + 1090/2 * (1 + Math.cos(angle)));

        connection.sharePosition(x, y, PositionMessage_Direction.DOWN, true, {
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
