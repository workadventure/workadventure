import * as Stanza from "stanza";
//import {EJABBERD_JWT_SECRET} from "../play/src/pusher/enums/EnvironmentVariable";
import Jwt from "jsonwebtoken";
import WaCustomPlugin, {WaReceivedReactions} from "../chat/src/Xmpp/Lib/Plugin";
import {mucRoomsStore, xmppServerConnectionStatusStore} from "../chat/src/Stores/MucRoomsStore";
import {userStore} from "../chat/src/Stores/LocalUserStore";
import {availabilityStatusStore} from "../chat/src/Stores/ChatStore";
import {uuid} from "stanza/Utils";
import {Agent, JID} from "stanza";
import {ReceivedPresence} from "stanza/protocol";

const start = performance.now();

const wait = async (time: number) => {
    return new Promise<void>((res, rej) => {
        setTimeout(() => {
            res();
        }, time)
    });
}

(async () => {
    for (let i = 0; i < 5000; i++) {
        connect('foo'+i).catch(e => console.error(e));
        await wait(100);
    }
})().catch(e => console.error(e));

export const defaultWoka =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABcAAAAdCAYAAABBsffGAAAB/ElEQVRIia1WMW7CQBC8EAoqFy74AD1FqNzkAUi09DROwwN4Ag+gMQ09dcQXXNHQIucBPAJFc2Iue+dd40QZycLc7c7N7d7u+cU9wXw+ryyL0+n00eU9tCZIOp1O/f/ZbBbmzuczX6uuRVTlIAYpCSeTScumaZqw0OVyURd47SIGaZ7n6s4wjmc0Grn7/e6yLFtcr9dPaaOGhcTEeDxu2dxut2hXUJ9ioKmW0IidMg6/NPmD1EmqtojTBWAvE26SW8r+YhfIu87zbyB5BiRerVYtikXxXuLRuK058HABMyz/AX8UHwXgV0NRaEXzDKzaw+EQCioo1yrsLfvyjwZrTvK0yp/xh/o+JwbFhFYgFRNqzGEIB1ZhH2INkXJZoShn2WNSgJRNS/qoYSHxer1+qkhChnC320ULRI1LEsNhv99HISBkLmhP/7L8OfqhiKC6SzEJtSTLHMkGFhK6XC79L89rmtC6rv0YfjXV9COPDwtVQxEc2ZflIu7R+WADQrkA7eCH5BdFwQRXQ8bKxXejeWFoYZGCQM7Yh7BAkcw0DEnEEPHhbjBPQfCDvwzlEINlWZq3OAiOx2O0KwAKU8gehXfzu2Wz2VQMTXqCeLZZSNvtVv20MFsu48gQpDvjuHYxE+ZHESBPSJ/x3sqBvhe0hc5vRXkfypBY4xGcc9+lcFxartG6LgAAAABJRU5ErkJggg==";


async function connect(username: string): Promise<Agent> {
    const startTime = performance.now();
    const resource = uuid();
    const myJid = username+"@ejabberd";

    const jabberPassword = Jwt.sign({ jid: myJid }, process.env.EJABBERD_JWT_SECRET as string, {
        expiresIn: "1d",
        algorithm: "HS256",
    });

    const client = Stanza.createClient({
        credentials: {
            // Bypass the no-escape function implemented in stanza ParseJID.local
            username: username,
            password: jabberPassword,
        },
        resource: resource,
        server: "ejabberd",
        transports: {
            websocket: "ws://xmpp.workadventure.localhost:5443/ws" /*EJABBERD_WS_URI*/,
        },
    });

    console.log(`[${Math.trunc((startTime - start)/1000)}s][${username}][0ms] Creating ...`);

    client.use(WaCustomPlugin);

    client.on("connected", () => {
        const endTime = performance.now();
        console.log(`[${Math.trunc((endTime - start)/1000)}s][${username}][${Math.trunc(endTime - startTime)}ms] Connected.`);
    });
    client.on("disconnected", () => {
        console.log("disconnected");
    });
    client.on("auth:success", () => {
        const endTime = performance.now();
        console.log(`[${Math.trunc((endTime - start)/1000)}s][${username}][${Math.trunc(endTime - startTime)}ms] Auth success.`);
    });

    client.on("--transport-disconnected", () => {
        console.error("--transport-disconnected");
    });

    client.on("session:started", async () => {
        const endTime = performance.now();
        console.log(`[${Math.trunc((endTime - start) / 1000)}s][${username}][${Math.trunc(endTime - startTime)}ms] Session started, sending presence.`);

        const recipient = JID.create({
            //local: "http\\3a\\2f\\2fplay.workadventure.localhost\\2f_\\2fglobal\\2fmaps.workadventure.localhost\\2fstarter\\2fmap.json",
            local: "http://play.workadventure.localhost/_/global/maps.workadventure.localhost/starter/map.json",
            domain: "conference.ejabberd",
            resource: resource,
        });

        //console.log(await client.joinRoom(recipient, username));
        //return;

        const presenceId = uuid();

        client.sendUserInfo(recipient, presenceId, {
            jid: myJid,
            roomPlayUri: "http://play.workadventure.localhost/_/global/maps.workadventure.localhost/starter/map.json",
            roomName: "This room",
            userUuid: username,
            userColor: "#aa33aa",
            userWoka: defaultWoka,
            name: username,
            // If you can subscribe to the default muc room, this is that you are a member
            userIsMember: false,
            userAvailabilityStatus: 1,
            userVisitCardUrl: "",
        });

        await wait(100_000_000);
        
        client.disconnect();
    });

    client.on("subscribe", (message) => {
        console.log(message);
    });

    // @ts-ignore
    client.on("chat:reactions", (message: WaReceivedReactions) => {
        //this.forwardToRoom("reactions", message.from, message);
    });
    /*client.on("chat:state", (state: ChatStateMessage) => {
        //this.forwardToRoom("chatState", state.from, state);
    });*/

    client.on("auth:failed", () => {
        console.error("auth:failed");
    });
    client.on("stream:error", (error) => {
        console.error(error);
    });
    client.on("presence:error", (error) => {
        console.error(error);
    });
    client.on("muc:error", (error) => {
        console.error(error);
    });
    client.on("message:error", (error) => {
        console.error(error);
    });

    client.connect();

    return client;
}
