import { PUSHER_URL } from "../Enum/EnvironmentVariable";
import { apiVersionHash } from "../Messages/JsonMessages/ApiVersion";
import { BehaviorSubject, Subject } from "rxjs";
import ElementExt from "../Xmpp/Lib/ElementExt";
import {
    PingMessage as PingMessageTsProto,
    PusherToIframeMessage,
    XmppSettingsMessage,
    XmppConnectionStatusChangeMessage_Status,
    IframeToPusherMessage,
    XmppConnectionNotAuthorizedMessage,
} from "../Messages/ts-proto-generated/protos/messages";
import { XmppClient } from "../Xmpp/XmppClient";
import { Parser } from "@xmpp/xml";
import { userStore } from "../Stores/LocalUserStore";
import { connectionNotAuthorized } from "../Stores/ChatStore";

const manualPingDelay = 20000;

export class ChatConnection implements ChatConnection {
    private readonly socket: WebSocket;
    private userId: number | null = null;
    private closed: boolean = false;
    private xmppClient: XmppClient | null = null;

    private readonly _connectionErrorStream = new Subject<CloseEvent>();
    public readonly connectionErrorStream = this._connectionErrorStream.asObservable();

    // We use a BehaviorSubject for this stream. This will be re-emited to new subscribers in case the connection is established before the settings are listened to.
    private readonly _xmppSettingsMessageStream = new BehaviorSubject<XmppSettingsMessage | undefined>(undefined);
    public readonly xmppSettingsMessageStream = this._xmppSettingsMessageStream.asObservable();

    private readonly _xmppMessageStream = new Subject<ElementExt>();
    public readonly xmppMessageStream = this._xmppMessageStream.asObservable();

    // Question: should this not be a BehaviorSubject?
    private readonly _xmppConnectionStatusChangeMessageStream = new Subject<XmppConnectionStatusChangeMessage_Status>();
    public readonly xmppConnectionStatusChangeMessageStream =
        this._xmppConnectionStatusChangeMessageStream.asObservable();

    private readonly _xmppConnectionNotAuthorizedStream = new Subject<XmppConnectionNotAuthorizedMessage>();
    public readonly xmppConnectionNotAuthorizedStream = this._xmppConnectionNotAuthorizedStream.asObservable();

    public constructor(token: string | null, roomUrl: string, uuid: string) {
        let url = new URL(PUSHER_URL, window.location.toString()).toString();
        url = url.replace("http://", "ws://").replace("https://", "wss://");
        if (!url.endsWith("/")) {
            url += "/";
        }
        url += "chat";
        url += "?playUri=" + encodeURIComponent(roomUrl);
        url += "&token=" + (token ? encodeURIComponent(token) : "");
        url += "&uuid=" + encodeURIComponent(uuid);
        //url += "&name=" + encodeURIComponent(name);
        url += "&version=" + apiVersionHash;

        try {
            this.socket = new WebSocket(url);

            this.socket.binaryType = "arraybuffer";

            let interval: ReturnType<typeof setInterval> | undefined = undefined;

            this.socket.onopen = () => {
                //we manually ping every 20s to not be logged out by the server, even when the game is in background.
                const pingMessage = PingMessageTsProto.encode({}).finish();
                interval = setInterval(() => this.socket.send(pingMessage), manualPingDelay);
            };

            this.socket.addEventListener("open", () => {
                this.xmppClient = new XmppClient(this);
            });

            this.socket.addEventListener("close", (event) => {
                if (interval) {
                    clearInterval(interval);
                }

                // If we are not connected yet (if a JoinRoomMessage was not sent), we need to retry.
                if (this.userId === null && !this.closed) {
                    this._connectionErrorStream.next(event);
                }
            });

            this.socket.onmessage = (messageEvent) => {
                const arrayBuffer: ArrayBuffer = messageEvent.data;

                const pusherToIframeMessage = PusherToIframeMessage.decode(new Uint8Array(arrayBuffer));

                const message = pusherToIframeMessage.message;
                if (message === undefined) {
                    return;
                }

                switch (message.$case) {
                    case "xmppSettingsMessage": {
                        this._xmppSettingsMessageStream.next(message.xmppSettingsMessage);
                        break;
                    }
                    case "xmppConnectionStatusChangeMessage": {
                        this._xmppConnectionStatusChangeMessageStream.next(
                            message.xmppConnectionStatusChangeMessage.status
                        );
                        break;
                    }
                    case "xmppMessage": {
                        const elementExtParsed = parse(message.xmppMessage.stanza);

                        if (elementExtParsed == undefined) {
                            console.error("xmppMessage  => data is undefined => ", elementExtParsed);
                            break;
                        }
                        this._xmppMessageStream.next(elementExtParsed);
                        break;
                    }
                    case "xmppConnectionNotAuthorized": {
                        this._xmppConnectionNotAuthorizedStream.next(message.xmppConnectionNotAuthorized);
                        connectionNotAuthorized.set(true);
                        break;
                    }
                    default: {
                        // Security check: if we forget a "case", the line below will catch the error at compile-time.
                        //@ts-ignore
                        //eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const _exhaustiveCheck: any = message;
                    }
                }
            };
        } catch (err) {
            console.error("ChatConnection => err =>", err);
            throw new Error(`Error: ${err}`);
        }
    }

    public emitXmlMessage(xml: ElementExt): void {
        const bytes = IframeToPusherMessage.encode({
            message: {
                $case: "xmppMessage",
                xmppMessage: {
                    stanza: xml.toString(),
                },
            },
        }).finish();

        this.socket.send(bytes);
    }

    public emitBanUserByUuid(playUri: string, uuidToBan: string, name: string, message: string) {
        const bytes = IframeToPusherMessage.encode({
            message: {
                $case: "banUserByUuidMessage",
                banUserByUuidMessage: {
                    playUri,
                    uuidToBan,
                    name,
                    message,
                    byUserEmail: userStore.get().email ?? "",
                },
            },
        }).finish();

        this.socket.send(bytes);
    }

    public getXmppClient(): XmppClient | null {
        return this.xmppClient;
    }

    public close() {
        this.socket.close();
    }

    get isClose() {
        return this.socket.readyState === WebSocket.CLOSED || this.socket.readyState === WebSocket.CLOSING;
    }
}

const parse = (data: string): ElementExt | null => {
    const p = new Parser();

    let result: ElementExt | null = null;
    let error = null;

    p.on("start", (el) => {
        result = el;
    });
    p.on("element", (el) => {
        if (!result) {
            return;
        }
        result.append(el);
    });
    p.on("error", (err) => {
        error = err;
    });

    p.write(data);
    p.end(data);

    if (error) {
        throw error;
    } else {
        return result;
    }
};
