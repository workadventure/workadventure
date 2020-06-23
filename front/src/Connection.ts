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

export interface MessageUserJoined {
    userId: string;
    name: string;
    character: string;
    position: PointInterface
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
    private readonly socket: Socket;
    private userId: string|null = null;

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
    }

    public static createConnection(name: string, characterSelected: string): Promise<Connection> {
        return Axios.post(`${API_URL}/login`, {name: name})
            .then((res) => {

                return new Promise<Connection>((resolve, reject) => {
                    const connection = new Connection(res.data.token);

                    connection.onConnectError((error: object) => {
                        console.log('An error occurred while connecting to socket server. Retrying');
                        reject(error);
                    });

                    connection.socket.emit(EventMessage.SET_PLAYER_DETAILS, {
                        name: name,
                        character: characterSelected
                    } as SetPlayerDetailsMessage, (id: string) => {
                        connection.userId = id;
                    });

                    resolve(connection);
                });
            })
            .catch((err) => {
                // Let's retry in 4-6 seconds
                return new Promise<Connection>((resolve, reject) => {
                    setTimeout(() => {
                        Connection.createConnection(name, characterSelected).then((connection) => resolve(connection))
                            .catch((error) => reject(error));
                    }, 4000 + Math.floor(Math.random() * 2000) );
                });
            });
    }

    public closeConnection(): void {
        this.socket?.close();
    }


    public joinARoom(roomId: string, startX: number, startY: number, direction: string, moving: boolean): Promise<MessageUserPositionInterface[]> {
        const promise = new Promise<MessageUserPositionInterface[]>((resolve, reject) => {
            this.socket.emit(EventMessage.JOIN_ROOM, { roomId, position: {x: startX, y: startY, direction, moving }}, (userPositions: MessageUserPositionInterface[]) => {
                resolve(userPositions);
            });
        })
        return promise;
    }

    public sharePosition(x : number, y : number, direction : string, moving: boolean) : void{
        if(!this.socket){
            return;
        }
        const point = new Point(x, y, direction, moving);
        this.socket.emit(EventMessage.USER_POSITION, point);
    }

    public onUserJoins(callback: (message: MessageUserJoined) => void): void {
        this.socket.on(EventMessage.JOIN_ROOM, callback);
    }

    public onUserMoved(callback: (message: MessageUserMovedInterface) => void): void {
        this.socket.on(EventMessage.USER_MOVED, callback);
    }

    public onUserLeft(callback: (userId: string) => void): void {
        this.socket.on(EventMessage.USER_LEFT, callback);
    }

    public onGroupUpdatedOrCreated(callback: (groupCreateUpdateMessage: GroupCreatedUpdatedMessageInterface) => void): void {
        this.socket.on(EventMessage.GROUP_CREATE_UPDATE, callback);
    }

    public onGroupDeleted(callback: (groupId: string) => void): void {
        this.socket.on(EventMessage.GROUP_DELETE, callback)
    }

    public onConnectError(callback: (error: object) => void): void {
        this.socket.on(EventMessage.CONNECT_ERROR, callback)
    }

    public sendWebrtcSignal(signal: unknown, roomId: string, userId? : string|null, receiverId? : string) {
        return this.socket.emit(EventMessage.WEBRTC_SIGNAL, {
            userId: userId ? userId : this.userId,
            receiverId: receiverId ? receiverId : this.userId,
            roomId: roomId,
            signal: signal
        });
    }

    public receiveWebrtcStart(callback: (message: WebRtcStartMessageInterface) => void) {
        this.socket.on(EventMessage.WEBRTC_START, callback);
    }

    public receiveWebrtcSignal(callback: (message: WebRtcSignalMessageInterface) => void) {
        return this.socket.on(EventMessage.WEBRTC_SIGNAL, callback);
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

    public getUserId(): string|null {
        return this.userId;
    }

    disconnectMessage(callback: (message: WebRtcDisconnectMessageInterface) => void): void {
        this.socket.on(EventMessage.WEBRTC_DISCONNECT, callback);
    }
}
