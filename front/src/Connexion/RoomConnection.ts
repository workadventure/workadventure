import {API_URL} from "../Enum/EnvironmentVariable";
import {
    BatchMessage, GroupDeleteMessage, GroupUpdateMessage, ItemEventMessage,
    PositionMessage,
    SetPlayerDetailsMessage, UserJoinedMessage, UserLeftMessage, UserMovedMessage,
    UserMovesMessage,
    ViewportMessage
} from "../Messages/generated/messages_pb"

const SocketIo = require('socket.io-client');
import Socket = SocketIOClient.Socket;
import Direction = PositionMessage.Direction;
import {ProtobufClientUtils} from "../Network/ProtobufClientUtils";
import {
    EventMessage,
    GroupCreatedUpdatedMessageInterface, ItemEventMessageInterface,
    MessageUserJoined,
    RoomJoinedMessageInterface,
    ViewportInterface, WebRtcDisconnectMessageInterface,
    WebRtcSignalReceivedMessageInterface,
    WebRtcSignalSentMessageInterface,
    WebRtcStartMessageInterface
} from "./ConnexionModels";


export class RoomConnection implements RoomConnection {
    private readonly socket: Socket;
    private userId: number|null = null;
    private batchCallbacks: Map<string, Function[]> = new Map<string, Function[]>();

    public constructor(token: string) {

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
    
    public emitPlayerDetailsMessage(characterLayersSelected: string[]) {
        const message = new SetPlayerDetailsMessage();
        message.setName(name);
        message.setCharacterlayersList(characterLayersSelected);
        this.socket.emit(EventMessage.SET_PLAYER_DETAILS, message.serializeBinary().buffer, (id: number) => {
            this.userId = id;
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
