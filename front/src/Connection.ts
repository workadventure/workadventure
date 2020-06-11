import {GameManager} from "./Phaser/Game/GameManager";
import Axios from "axios";
import {API_URL} from "./Enum/EnvironmentVariable";
import {MessageUI} from "./Logger/MessageUI";
import {SetPlayerDetailsMessage} from "./Messages/SetPlayerDetailsMessage";

const SocketIo = require('socket.io-client');
import Socket = SocketIOClient.Socket;
import {PlayerAnimationNames} from "./Phaser/Player/Animation";
import {UserSimplePeer} from "./WebRtc/SimplePeer";


enum EventMessage{
    WEBRTC_SIGNAL = "webrtc-signal",
    WEBRTC_START = "webrtc-start",
    WEBRTC_JOIN_ROOM = "webrtc-join-room",
    JOIN_ROOM = "join-room", // bi-directional
    USER_POSITION = "user-position", // bi-directional
    USER_MOVED = "user-moved", // From server to client
    USER_LEFT = "user-left", // From server to client
    MESSAGE_ERROR = "message-error",
    WEBRTC_DISCONNECT = "webrtc-disconect",
    GROUP_CREATE_UPDATE = "group-create-update",
    GROUP_DELETE = "group-delete",

    CONNECT_ERROR = "connect_error",
    RECONNECT = "reconnect",
    SET_PLAYER_DETAILS = "set-player-details" // Send the name and character to the server (on connect), receive back the id.
}

class Message {
    userId: string;
    name: string;
    character: string;

    constructor(userId : string, name: string, character: string) {
        this.userId = userId;
        this.name = name;
        this.character = character;
    }
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
    userId: string;
    name: string;
    character: string;
    position: PointInterface;
}

export interface MessageUserMovedInterface {
    userId: string;
    position: PointInterface;
}

class MessageUserPosition extends Message implements MessageUserPositionInterface{
    position: PointInterface;

    constructor(userId : string, point : Point, name: string, character: string) {
        super(userId, name, character);
        this.position = point;
    }
}

export interface MessageUserJoined {
    userId: string;
    name: string;
    character: string;
    position: PointInterface
}

export interface ListMessageUserPositionInterface {
    roomId: string;
    listUsersPosition: Array<MessageUserPosition>;
}

export interface PositionInterface {
    x: number,
    y: number
}

export interface GroupCreatedUpdatedMessageInterface {
    position: PositionInterface,
    groupId: string
}

export interface WebRtcStartMessageInterface {
    roomId: string,
    clients: UserSimplePeer[]
}

export interface WebRtcDisconnectMessageInterface {
    userId: string
}

export interface ConnectionInterface {
    socket: Socket|null;
    token: string|null;
    name: string|null;
    userId: string|null;

    createConnection(name: string, characterSelected: string): Promise<any>;

    loadStartMap(): Promise<any>;

    joinARoom(roomId: string, startX: number, startY: number, direction: string, moving: boolean): void;

    sharePosition(x: number, y: number, direction: string, moving: boolean): void;

    /*webrtc*/
    sendWebrtcSignal(signal: any, roomId: string, userId?: string|null, receiverId?: string): void;

    receiveWebrtcSignal(callBack: Function): void;

    receiveWebrtcStart(callBack: (message: WebRtcStartMessageInterface) => void): void;

    disconnectMessage(callBack: (message: WebRtcDisconnectMessageInterface) => void): void;
}

export class Connection implements ConnectionInterface {
    socket: Socket|null = null;
    token: string|null = null;
    name: string|null = null; // TODO: drop "name" storage here
    character: string|null = null;
    userId: string|null = null;

    GameManager: GameManager;

    lastPositionShared: PointInterface|null = null;
    lastRoom: string|null = null;

    constructor(GameManager: GameManager) {
        this.GameManager = GameManager;
    }

    createConnection(name: string, characterSelected: string): Promise<ConnectionInterface> {
        this.name = name;
        this.character = characterSelected;
        return Axios.post(`${API_URL}/login`, {name: name})
            .then((res) => {
                this.token = res.data.token;
                this.socket = SocketIo(`${API_URL}`, {
                    query: {
                        token: this.token
                    }
                });
                return this.connectSocketServer();
            })
            .catch((err) => {
                console.error(err);
                throw err;
            });
    }

    private getSocket(): Socket {
        if (this.socket === null) {
            throw new Error('Socket not initialized while using Connection')
        }
        return this.socket;
    }

    /**
     *
     * @param character
     */
    connectSocketServer(): Promise<ConnectionInterface>{
        //listen event
        this.disconnectServer();
        this.errorMessage();
        this.groupUpdatedOrCreated();
        this.groupDeleted();
        this.onUserJoins();
        this.onUserMoved();
        this.onUserLeft();

        return new Promise<ConnectionInterface>((resolve, reject) => {
            this.getSocket().emit(EventMessage.SET_PLAYER_DETAILS, {
                name: this.name,
                character: this.character
            } as SetPlayerDetailsMessage, (id: string) => {
                this.userId = id;
            });

            //if try to reconnect with last position
            /*if(this.lastRoom) {
                //join the room
                this.joinARoom(this.lastRoom,
                    this.lastPositionShared ? this.lastPositionShared.x : 0,
                    this.lastPositionShared ? this.lastPositionShared.y : 0,
                    this.lastPositionShared ? this.lastPositionShared.direction : PlayerAnimationNames.WalkDown,
                    this.lastPositionShared ? this.lastPositionShared.moving : false);
            }*/

            /*if(this.lastPositionShared) {

                //share your first position
                this.sharePosition(
                    this.lastPositionShared ? this.lastPositionShared.x : 0,
                    this.lastPositionShared ? this.lastPositionShared.y : 0,
                    this.lastPositionShared.direction,
                    this.lastPositionShared.moving
                );
            }*/

            resolve(this);
        });
    }

    //TODO add middleware with access token to secure api
    loadStartMap() : Promise<any> {
        return Axios.get(`${API_URL}/start-map`)
            .then((res) => {
                return res.data;
            }).catch((err) => {
                console.error(err);
                throw err;
            });
    }

    joinARoom(roomId: string, startX: number, startY: number, direction: string, moving: boolean): void {
        let point = new Point(startX, startY, direction, moving);
        this.lastPositionShared = point;
        this.getSocket().emit(EventMessage.JOIN_ROOM, { roomId, position: {x: startX, y: startY, direction, moving }}, (userPositions: MessageUserPositionInterface[]) => {
            this.GameManager.initUsersPosition(userPositions);
        });
        this.lastRoom = roomId;
    }

    sharePosition(x : number, y : number, direction : string, moving: boolean) : void{
        if(!this.socket){
            return;
        }
        let point = new Point(x, y, direction, moving);
        this.lastPositionShared = point;
        this.getSocket().emit(EventMessage.USER_POSITION, point);
    }

    private onUserJoins(): void {
        this.getSocket().on(EventMessage.JOIN_ROOM, (message: MessageUserJoined) => {
            this.GameManager.onUserJoins(message);
        });
    }

    private onUserMoved(): void {
        this.getSocket().on(EventMessage.USER_MOVED, (message: MessageUserMovedInterface) => {
            this.GameManager.onUserMoved(message);
        });
    }

    private onUserLeft(): void {
        this.getSocket().on(EventMessage.USER_LEFT, (userId: string) => {
            this.GameManager.onUserLeft(userId);
        });
    }

    private groupUpdatedOrCreated(): void {
        this.getSocket().on(EventMessage.GROUP_CREATE_UPDATE, (groupCreateUpdateMessage: GroupCreatedUpdatedMessageInterface) => {
            //console.log('Group ', groupCreateUpdateMessage.groupId, " position :", groupCreateUpdateMessage.position.x, groupCreateUpdateMessage.position.y)
            this.GameManager.shareGroupPosition(groupCreateUpdateMessage);
        })
    }

    private groupDeleted(): void {
        this.getSocket().on(EventMessage.GROUP_DELETE, (groupId: string) => {
            this.GameManager.deleteGroup(groupId);
        })
    }

    sendWebrtcSignal(signal: any, roomId: string, userId? : string|null, receiverId? : string) {
        return this.getSocket().emit(EventMessage.WEBRTC_SIGNAL, {
            userId: userId ? userId : this.userId,
            receiverId: receiverId ? receiverId : this.userId,
            roomId: roomId,
            signal: signal
        });
    }

    receiveWebrtcStart(callback: (message: WebRtcStartMessageInterface) => void) {
        this.getSocket().on(EventMessage.WEBRTC_START, callback);
    }

    receiveWebrtcSignal(callback: Function) {
        return this.getSocket().on(EventMessage.WEBRTC_SIGNAL, callback);
    }

    private errorMessage(): void {
        this.getSocket().on(EventMessage.MESSAGE_ERROR, (message: string) => {
            console.error(EventMessage.MESSAGE_ERROR, message);
        })
    }

    private disconnectServer(): void {
        this.getSocket().on(EventMessage.CONNECT_ERROR, () => {
            this.GameManager.switchToDisconnectedScene();
        });

        this.getSocket().on(EventMessage.RECONNECT, () => {
            this.connectSocketServer();
            if (this.lastPositionShared === null) {
                throw new Error('No last position shared found while reconnecting');
            }
            this.GameManager.reconnectToGameScene(this.lastPositionShared);
        });
    }

    disconnectMessage(callback: (message: WebRtcDisconnectMessageInterface) => void): void {
        this.getSocket().on(EventMessage.WEBRTC_DISCONNECT, callback);
    }
}
