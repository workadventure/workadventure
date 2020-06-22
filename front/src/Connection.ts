import {gameManager, GameManager} from "./Phaser/Game/GameManager";
import Axios from "axios";
import {API_URL} from "./Enum/EnvironmentVariable";
import {MessageUI} from "./Logger/MessageUI";
import {SetPlayerDetailsMessage} from "./Messages/SetPlayerDetailsMessage";

const SocketIo = require('socket.io-client');
import Socket = SocketIOClient.Socket;
import {PlayerAnimationNames} from "./Phaser/Player/Animation";
import {UserSimplePeer} from "./WebRtc/SimplePeer";
import {SignalData} from "simple-peer";


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
    SET_PLAYER_DETAILS = "set-player-details", // Send the name and character to the server (on connect), receive back the id.

    CONNECT_ERROR = "connect_error",
    RECONNECT = "reconnect",
    RECONNECTING = "reconnecting",
    RECONNECT_ERROR = "reconnect_error",
    RECONNECT_FAILED = "reconnect_failed"
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

export interface WebRtcSignalMessageInterface {
    userId: string,
    receiverId: string,
    roomId: string,
    signal: SignalData
}

export interface StartMapInterface {
    mapUrlStart: string,
    startInstance: string
}

export class Connection implements Connection {
    socket: Socket|null = null;
    token: string|null = null;
    name: string|null = null; // TODO: drop "name" storage here
    character: string|null = null;
    userId: string|null = null;

    GameManager: GameManager;

    lastPositionShared: PointInterface|null = null;
    lastRoom: string|null = null;

    private constructor(GameManager: GameManager) {
        this.GameManager = GameManager;
    }

    public static createConnection(name: string, characterSelected: string): Promise<Connection> {
        let connection = new Connection(gameManager);
        connection.name = name;
        connection.character = characterSelected;
        return Axios.post(`${API_URL}/login`, {name: name})
            .then((res) => {
                connection.token = res.data.token;
                connection.socket = SocketIo(`${API_URL}`, {
                    query: {
                        token: connection.token
                    }
                });

                //listen event
                connection.disconnectServer();
                connection.errorMessage();

                return connection.connectSocketServer();
            })
            .catch((err) => {
                console.error(err);
                throw err;
            });
    }

    public closeConnection(): void {
        this.socket?.close();
        this.socket = null;
        this.lastPositionShared = null;
        this.lastRoom = null;

    }

    private getSocket(): Socket {
        if (this.socket === null) {
            throw new Error('Socket not initialized while using Connection')
        }
        return this.socket;
    }

    connectSocketServer(): Promise<Connection>{
        return new Promise<Connection>((resolve, reject) => {
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


    joinARoom(roomId: string, startX: number, startY: number, direction: string, moving: boolean): Promise<MessageUserPositionInterface[]> {
        const point = new Point(startX, startY, direction, moving);
        this.lastPositionShared = point;
        let promise = new Promise<MessageUserPositionInterface[]>((resolve, reject) => {
            this.getSocket().emit(EventMessage.JOIN_ROOM, { roomId, position: {x: startX, y: startY, direction, moving }}, (userPositions: MessageUserPositionInterface[]) => {
                //this.GameManager.initUsersPosition(userPositions);
                resolve(userPositions);
            });
        })
        this.lastRoom = roomId;
        return promise;
    }

    sharePosition(x : number, y : number, direction : string, moving: boolean) : void{
        if(!this.socket){
            return;
        }
        const point = new Point(x, y, direction, moving);
        this.lastPositionShared = point;
        this.getSocket().emit(EventMessage.USER_POSITION, point);
    }

    public onUserJoins(callback: (message: MessageUserJoined) => void): void {
        this.getSocket().on(EventMessage.JOIN_ROOM, callback);
    }

    public onUserMoved(callback: (message: MessageUserMovedInterface) => void): void {
        this.getSocket().on(EventMessage.USER_MOVED, callback);
    }

    public onUserLeft(callback: (userId: string) => void): void {
        this.getSocket().on(EventMessage.USER_LEFT, callback);
    }

    public onGroupUpdatedOrCreated(callback: (groupCreateUpdateMessage: GroupCreatedUpdatedMessageInterface) => void): void {
        this.getSocket().on(EventMessage.GROUP_CREATE_UPDATE, callback);
    }

    public onGroupDeleted(callback: (groupId: string) => void): void {
        this.getSocket().on(EventMessage.GROUP_DELETE, callback)
    }

    sendWebrtcSignal(signal: unknown, roomId: string, userId? : string|null, receiverId? : string) {
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

    receiveWebrtcSignal(callback: (message: WebRtcSignalMessageInterface) => void) {
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

        this.getSocket().on(EventMessage.RECONNECTING, () => {
            console.log('Trying to reconnect');
        });

        this.getSocket().on(EventMessage.RECONNECT_ERROR, () => {
            console.log('Error while trying to reconnect.');
        });

        this.getSocket().on(EventMessage.RECONNECT_FAILED, () => {
            console.error('Reconnection failed. Giving up.');
        });

        this.getSocket().on(EventMessage.RECONNECT, () => {
            console.log('Reconnect event triggered');
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
