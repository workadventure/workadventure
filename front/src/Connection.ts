import Axios from "axios";
import {API_URL} from "./Enum/EnvironmentVariable";
import {MessageUI} from "./Logger/MessageUI";
import {
    BatchMessage, GroupDeleteMessage, GroupUpdateMessage, ItemEventMessage,
    PositionMessage,
    SetPlayerDetailsMessage, UserJoinedMessage, UserLeftMessage, UserMovedMessage,
    UserMovesMessage,
    ViewportMessage
} from "./Messages/generated/messages_pb"

const SocketIo = require('socket.io-client');
import Socket = SocketIOClient.Socket;
import {PlayerAnimationNames} from "./Phaser/Player/Animation";
import {UserSimplePeerInterface} from "./WebRtc/SimplePeer";
import {SignalData} from "simple-peer";
import Direction = PositionMessage.Direction;
import {ProtobufClientUtils} from "./Network/ProtobufClientUtils";

enum EventMessage{
    WEBRTC_SIGNAL = "webrtc-signal",
    WEBRTC_SCREEN_SHARING_SIGNAL = "webrtc-screen-sharing-signal",
    WEBRTC_START = "webrtc-start",
    JOIN_ROOM = "join-room", // bi-directional
    USER_POSITION = "user-position", // From client to server
    USER_MOVED = "user-moved", // From server to client
    USER_LEFT = "user-left", // From server to client
    MESSAGE_ERROR = "message-error",
    WEBRTC_DISCONNECT = "webrtc-disconect",
    GROUP_CREATE_UPDATE = "group-create-update",
    GROUP_DELETE = "group-delete",
    SET_PLAYER_DETAILS = "set-player-details", // Send the name and character to the server (on connect), receive back the id.
    ITEM_EVENT = 'item-event',

    CONNECT_ERROR = "connect_error",
    SET_SILENT = "set_silent", // Set or unset the silent mode for this user.
    SET_VIEWPORT = "set-viewport",
    BATCH = "batch",
}

export interface PointInterface {
    x: number;
    y: number;
    direction : string;
    moving: boolean;
}

export class Point implements PointInterface{
    constructor(public x : number, public y : number, public direction : string = PlayerAnimationNames.WalkDown, public moving : boolean = false) {
        if(x  === null || y === null){
            throw Error("position x and y cannot be null");
        }
    }
}

export interface MessageUserPositionInterface {
    userId: number;
    name: string;
    characterLayers: string[];
    position: PointInterface;
}

export interface MessageUserMovedInterface {
    userId: number;
    position: PointInterface;
}

export interface MessageUserJoined {
    userId: number;
    name: string;
    characterLayers: string[];
    position: PointInterface
}

export interface PositionInterface {
    x: number,
    y: number
}

export interface GroupCreatedUpdatedMessageInterface {
    position: PositionInterface,
    groupId: number
}

export interface WebRtcStartMessageInterface {
    roomId: string,
    clients: UserSimplePeerInterface[]
}

export interface WebRtcDisconnectMessageInterface {
    userId: number
}

export interface WebRtcSignalSentMessageInterface {
    receiverId: number,
    signal: SignalData
}

export interface WebRtcSignalReceivedMessageInterface {
    userId: number,
    signal: SignalData
}

export interface StartMapInterface {
    mapUrlStart: string,
    startInstance: string
}

export interface ViewportInterface {
    left: number,
    top: number,
    right: number,
    bottom: number,
}

export interface BatchedMessageInterface {
    event: string,
    payload: unknown
}

export interface ItemEventMessageInterface {
    itemId: number,
    event: string,
    state: unknown,
    parameters: unknown
}

export interface RoomJoinedMessageInterface {
    users: MessageUserPositionInterface[],
    groups: GroupCreatedUpdatedMessageInterface[],
    items: { [itemId: number] : unknown }
}

export class Connection implements Connection {
    private readonly socket: Socket;
    private userId: number|null = null;
    private batchCallbacks: Map<string, Function[]> = new Map<string, Function[]>();

    private constructor(token: string) {

        this.socket = SocketIo(`${API_URL}`, {
            query: {
                token: token
            },
            reconnection: false // Reconnection is handled by the application itself
        });

        this.socket.on(EventMessage.MESSAGE_ERROR, (message: string) => {
            console.error(EventMessage.MESSAGE_ERROR, message);
        })

        /**
         * Messages inside batched messages are extracted and sent to listeners directly.
         */
        this.socket.on(EventMessage.BATCH, (batchedMessagesBinary: ArrayBuffer) => {
            const batchMessage = BatchMessage.deserializeBinary(new Uint8Array(batchedMessagesBinary));

            for (const message of batchMessage.getPayloadList()) {
                let event: string;
                let payload;
                if (message.hasUsermovedmessage()) {
                    event = EventMessage.USER_MOVED;
                    payload = message.getUsermovedmessage();
                } else if (message.hasGroupupdatemessage()) {
                    event = EventMessage.GROUP_CREATE_UPDATE;
                    payload = message.getGroupupdatemessage();
                } else if (message.hasGroupdeletemessage()) {
                    event = EventMessage.GROUP_DELETE;
                    payload = message.getGroupdeletemessage();
                } else if (message.hasUserjoinedmessage()) {
                    event = EventMessage.JOIN_ROOM;
                    payload = message.getUserjoinedmessage();
                } else if (message.hasUserleftmessage()) {
                    event = EventMessage.USER_LEFT;
                    payload = message.getUserleftmessage();
                } else if (message.hasItemeventmessage()) {
                    event = EventMessage.ITEM_EVENT;
                    payload = message.getItemeventmessage();
                } else {
                    throw new Error('Unexpected batch message type');
                }

                const listeners = this.batchCallbacks.get(event);
                if (listeners === undefined) {
                    continue;
                }
                for (const listener of listeners) {
                    listener(payload);
                }
            }
        })
    }

    public static createConnection(name: string, characterLayersSelected: string[]): Promise<Connection> {
        return Axios.post(`${API_URL}/login`, {name: name})
            .then((res) => {

                return new Promise<Connection>((resolve, reject) => {
                    const connection = new Connection(res.data.token);

                    connection.onConnectError((error: object) => {
                        console.log('An error occurred while connecting to socket server. Retrying');
                        reject(error);
                    });

                    const message = new SetPlayerDetailsMessage();
                    message.setName(name);
                    message.setCharacterlayersList(characterLayersSelected);
                    connection.socket.emit(EventMessage.SET_PLAYER_DETAILS, message.serializeBinary().buffer, (id: number) => {
                        connection.userId = id;
                    });

                    resolve(connection);
                });
            })
            .catch((err) => {
                // Let's retry in 4-6 seconds
                return new Promise<Connection>((resolve, reject) => {
                    setTimeout(() => {
                        Connection.createConnection(name, characterLayersSelected).then((connection) => resolve(connection))
                            .catch((error) => reject(error));
                    }, 4000 + Math.floor(Math.random() * 2000) );
                });
            });
    }

    public closeConnection(): void {
        this.socket?.close();
    }


    public joinARoom(roomId: string, startX: number, startY: number, direction: string, moving: boolean, viewport: ViewportInterface): Promise<RoomJoinedMessageInterface> {
        const promise = new Promise<RoomJoinedMessageInterface>((resolve, reject) => {
            this.socket.emit(EventMessage.JOIN_ROOM, {
                    roomId,
                    position: {x: startX, y: startY, direction, moving },
                    viewport,
                }, (roomJoinedMessage: RoomJoinedMessageInterface) => {
                    resolve(roomJoinedMessage);
                });
        })
        return promise;
    }

    public sharePosition(x : number, y : number, direction : string, moving: boolean, viewport: ViewportInterface) : void{
        if(!this.socket){
            return;
        }
        const positionMessage = new PositionMessage();
        positionMessage.setX(Math.floor(x));
        positionMessage.setY(Math.floor(y));
        let directionEnum: PositionMessage.DirectionMap[keyof PositionMessage.DirectionMap];
        switch (direction) {
            case 'up':
                directionEnum = Direction.UP;
                break;
            case 'down':
                directionEnum = Direction.DOWN;
                break;
            case 'left':
                directionEnum = Direction.LEFT;
                break;
            case 'right':
                directionEnum = Direction.RIGHT;
                break;
            default:
                throw new Error("Unexpected direction");
        }
        positionMessage.setDirection(directionEnum);
        positionMessage.setMoving(moving);

        const viewportMessage = new ViewportMessage();
        viewportMessage.setLeft(Math.floor(viewport.left));
        viewportMessage.setRight(Math.floor(viewport.right));
        viewportMessage.setTop(Math.floor(viewport.top));
        viewportMessage.setBottom(Math.floor(viewport.bottom));

        const userMovesMessage = new UserMovesMessage();
        userMovesMessage.setPosition(positionMessage);
        userMovesMessage.setViewport(viewportMessage);

        //console.log('Sending position ', positionMessage.getX(), positionMessage.getY());

        this.socket.emit(EventMessage.USER_POSITION, userMovesMessage.serializeBinary().buffer);
    }

    public setSilent(silent: boolean): void {
        this.socket.emit(EventMessage.SET_SILENT, silent);
    }

    public setViewport(viewport: ViewportInterface): void {
        const viewportMessage = new ViewportMessage();
        viewportMessage.setTop(Math.round(viewport.top));
        viewportMessage.setBottom(Math.round(viewport.bottom));
        viewportMessage.setLeft(Math.round(viewport.left));
        viewportMessage.setRight(Math.round(viewport.right));

        this.socket.emit(EventMessage.SET_VIEWPORT, viewportMessage.serializeBinary().buffer);
    }

    public onUserJoins(callback: (message: MessageUserJoined) => void): void {
        this.onBatchMessage(EventMessage.JOIN_ROOM, (message: UserJoinedMessage) => {
            const position = message.getPosition();
            if (position === undefined) {
                throw new Error('Invalid JOIN_ROOM message');
            }
            const messageUserJoined: MessageUserJoined = {
                userId: message.getUserid(),
                name: message.getName(),
                characterLayers: message.getCharacterlayersList(),
                position: ProtobufClientUtils.toPointInterface(position)
            }
            callback(messageUserJoined);
        });
    }

    public onUserMoved(callback: (message: UserMovedMessage) => void): void {
        this.onBatchMessage(EventMessage.USER_MOVED, callback);
        //this.socket.on(EventMessage.USER_MOVED, callback);
    }

    /**
     * Registers a listener on a message that is part of a batch
     */
    private onBatchMessage(eventName: string, callback: Function): void {
        let callbacks = this.batchCallbacks.get(eventName);
        if (callbacks === undefined) {
            callbacks = new Array<Function>();
            this.batchCallbacks.set(eventName, callbacks);
        }
        callbacks.push(callback);
    }

    public onUserLeft(callback: (userId: number) => void): void {
        this.onBatchMessage(EventMessage.USER_LEFT, (message: UserLeftMessage) => {
            callback(message.getUserid());
        });
    }

    public onGroupUpdatedOrCreated(callback: (groupCreateUpdateMessage: GroupCreatedUpdatedMessageInterface) => void): void {
        this.onBatchMessage(EventMessage.GROUP_CREATE_UPDATE, (message: GroupUpdateMessage) => {
            const position = message.getPosition();
            if (position === undefined) {
                throw new Error('Missing position in GROUP_CREATE_UPDATE');
            }

            const groupCreateUpdateMessage: GroupCreatedUpdatedMessageInterface = {
                groupId: message.getGroupid(),
                position: position.toObject()
            }

            //console.log('Group position: ', position.toObject());
            callback(groupCreateUpdateMessage);
        });
    }

    public onGroupDeleted(callback: (groupId: number) => void): void {
        this.onBatchMessage(EventMessage.GROUP_DELETE, (message: GroupDeleteMessage) => {
            callback(message.getGroupid());
        });
    }

    public onConnectError(callback: (error: object) => void): void {
        this.socket.on(EventMessage.CONNECT_ERROR, callback)
    }

    public sendWebrtcSignal(signal: unknown, receiverId: number) {
        return this.socket.emit(EventMessage.WEBRTC_SIGNAL, {
            receiverId: receiverId,
            signal: signal
        } as WebRtcSignalSentMessageInterface);
    }

    public sendWebrtcScreenSharingSignal(signal: unknown, receiverId: number) {
        return this.socket.emit(EventMessage.WEBRTC_SCREEN_SHARING_SIGNAL, {
            receiverId: receiverId,
            signal: signal
        } as WebRtcSignalSentMessageInterface);
    }

    public receiveWebrtcStart(callback: (message: WebRtcStartMessageInterface) => void) {
        this.socket.on(EventMessage.WEBRTC_START, callback);
    }

    public receiveWebrtcSignal(callback: (message: WebRtcSignalReceivedMessageInterface) => void) {
        return this.socket.on(EventMessage.WEBRTC_SIGNAL, callback);
    }

    public receiveWebrtcScreenSharingSignal(callback: (message: WebRtcSignalReceivedMessageInterface) => void) {
        return this.socket.on(EventMessage.WEBRTC_SCREEN_SHARING_SIGNAL, callback);
    }

    public onServerDisconnected(callback: (reason: string) => void): void {
        this.socket.on('disconnect', (reason: string) => {
            if (reason === 'io client disconnect') {
                // The client asks for disconnect, let's not trigger any event.
                return;
            }
            callback(reason);
        });

    }

    public getUserId(): number|null {
        return this.userId;
    }

    disconnectMessage(callback: (message: WebRtcDisconnectMessageInterface) => void): void {
        this.socket.on(EventMessage.WEBRTC_DISCONNECT, callback);
    }

    emitActionableEvent(itemId: number, event: string, state: unknown, parameters: unknown): void {
        const itemEventMessage = new ItemEventMessage();
        itemEventMessage.setItemid(itemId);
        itemEventMessage.setEvent(event);
        itemEventMessage.setStatejson(JSON.stringify(state));
        itemEventMessage.setParametersjson(JSON.stringify(parameters));

        this.socket.emit(EventMessage.ITEM_EVENT, itemEventMessage.serializeBinary().buffer);
    }

    onActionableEvent(callback: (message: ItemEventMessageInterface) => void): void {
        this.onBatchMessage(EventMessage.ITEM_EVENT, (message: ItemEventMessage) => {
            callback({
                itemId: message.getItemid(),
                event: message.getEvent(),
                parameters: JSON.parse(message.getParametersjson()),
                state: JSON.parse(message.getStatejson())
            });
        });
    }
}
