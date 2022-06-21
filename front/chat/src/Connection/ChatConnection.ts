import {
    IframeToPusherMessage as IframeToPusherMessageTsProto,
    PingMessage as PingMessageTsProto,
} from "../Messages/ts-proto-generated/protos/messages";
import { PUSHER_URL } from "../Enum/EnvironmentVariable";
import { apiVersionHash } from "../Messages/JsonMessages/ApiVersion";
import { Subject } from "rxjs";

const manualPingDelay = 20000;

export class ChatConnection implements ChatConnection {
    private readonly socket: WebSocket;
    private userId: number | null = null;
    private listeners: Map<string, Function[]> = new Map<string, Function[]>();
    private closed: boolean = false;

    private readonly _connectionErrorStream = new Subject<CloseEvent>();
    public readonly connectionErrorStream = this._connectionErrorStream.asObservable();

    public constructor(
        token: string | null,
        roomUrl: string,
    ) {
        let url = new URL(PUSHER_URL, window.location.toString()).toString();
        url = url.replace("http://", "ws://").replace("https://", "wss://");
        if (!url.endsWith("/")) {
            url += "/";
        }
        url += "chat";
        url += "?playUri=" + encodeURIComponent(roomUrl);
        url += "&token=" + (token ? encodeURIComponent(token) : "");
        url += "&version=" + apiVersionHash;

        this.socket = new WebSocket(url);

        this.socket.binaryType = "arraybuffer";

        let interval: ReturnType<typeof setInterval> | undefined = undefined;

        this.socket.onopen = () => {
            //we manually ping every 20s to not be logged out by the server, even when the game is in background.
            const pingMessage = PingMessageTsProto.encode({}).finish();
            interval = setInterval(() => this.socket.send(pingMessage), manualPingDelay);
        };

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

            const iframeToPusherMessage = IframeToPusherMessageTsProto.decode(new Uint8Array(arrayBuffer));
            //const message = ServerToClientMessage.deserializeBinary(new Uint8Array(arrayBuffer));

            const message = iframeToPusherMessage.message;
            if (message === undefined) {
                return;
            }

            switch (message.$case) {
                case "emptyMessage":
                    console.log("test", message.emptyMessage);
                    break;
                default: {
                    // Security check: if we forget a "case", the line below will catch the error at compile-time.
                    const _exhaustiveCheck: { $case: "emptyMessage"; emptyMessage: EmptyMessage; } = message;
                }
            }
        };
    }
}
