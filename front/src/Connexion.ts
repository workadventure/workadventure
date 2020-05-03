import {GameManager} from "./Phaser/Game/GameManager";

const SocketIo = require('socket.io-client');
import Axios from "axios";
import {API_URL, ROOM} from "./Enum/EnvironmentVariable";

enum EventMessage{
    WEBRTC_SIGNAL = "webrtc-signal",
    WEBRTC_START = "webrtc-start",
    WEBRTC_JOIN_ROOM = "webrtc-join-room",
    JOIN_ROOM = "join-room",
    USER_POSITION = "user-position",
    MESSAGE_ERROR = "message-error",
    WEBRTC_DISCONNECT = "webrtc-disconect"
}

class Message {
    userId: string;
    roomId: string;

    constructor(userId : string, roomId : string) {
        this.userId = userId;
        this.roomId = roomId;
    }

    toJson() {
        return {
            userId: this.userId,
            roomId: this.roomId,
        }
    }
}

export interface PointInterface {
    x: number;
    y: number;
    direction : string;
    toJson() : object;
}

class Point implements PointInterface{
    x: number;
    y: number;
    direction : string;

    constructor(x : number, y : number, direction : string = "none") {
        if(x  === null || y === null){
            throw Error("position x and y cannot be null");
        }
        this.x = x;
        this.y = y;
        this.direction = direction;
    }

    toJson(){
        return {
            x : this.x,
            y: this.y,
            direction: this.direction
        }
    }
}

export interface MessageUserPositionInterface {
    userId: string;
    roomId: string;
    position: PointInterface;
}

class MessageUserPosition extends Message implements MessageUserPositionInterface{
    position: PointInterface;

    constructor(userId : string, roomId : string, point : Point) {
        super(userId, roomId);
        this.position = point;
    }

    toString() {
        return JSON.stringify(
            Object.assign(
                super.toJson(),
                {
                    position: this.position.toJson()
                })
        );
    }
}

export interface ListMessageUserPositionInterface {
    roomId: string;
    listUsersPosition: Array<MessageUserPosition>;
}

class ListMessageUserPosition {
    roomId: string;
    listUsersPosition: Array<MessageUserPosition>;

    constructor(roomId: string, data: any) {
        this.roomId = roomId;
        this.listUsersPosition = new Array<MessageUserPosition>();
        data.forEach((userPosition: any) => {
            this.listUsersPosition.push(new MessageUserPosition(
                userPosition.userId,
                userPosition.roomId,
                new Point(
                    userPosition.position.x,
                    userPosition.position.y,
                    userPosition.position.direction
                )
            ));
        });
    }
}

export interface ConnexionInterface {
    socket: any;
    token: string;
    email: string;
    userId: string;
    startedRoom: string;

    createConnexion(): Promise<any>;

    joinARoom(roomId: string): void;

    sharePosition(x: number, y: number, direction: string): void;

    positionOfAllUser(): void;

    /*webrtc*/
    sendWebrtcSignal(signal: any, roomId: string, userId?: string, receiverId?: string): void;

    receiveWebrtcSignal(callBack: Function): void;

    receiveWebrtcStart(callBack: Function): void;

    disconnectMessage(callBack: Function): void;
}

export class Connexion implements ConnexionInterface {
    socket: any;
    token: string;
    email: string;
    userId: string;
    startedRoom: string;

    GameManager: GameManager;

    constructor(email : string, GameManager: GameManager) {
        this.email = email;
        this.GameManager = GameManager;
    }

    createConnexion(): Promise<ConnexionInterface> {
        return Axios.post(`${API_URL}/login`, {email: this.email})
            .then((res) => {
                this.token = res.data.token;
                this.startedRoom = res.data.roomId;
                this.userId = res.data.userId;

                this.socket = SocketIo(`${API_URL}`, {
                    query: {
                        token: this.token
                    }
                });

                //join the room
                this.joinARoom(this.startedRoom);

                //share your first position
                this.sharePosition(0, 0);

                this.positionOfAllUser();

                this.errorMessage();

                return this;
            })
            .catch((err) => {
                console.error(err);
                throw err;
            });
    }

    /**
     * Permit to join a room
     * @param roomId
     */
    joinARoom(roomId: string): void {
        let messageUserPosition = new MessageUserPosition(this.userId, this.startedRoom, new Point(0, 0));
        this.socket.emit(EventMessage.JOIN_ROOM, messageUserPosition.toString());
    }

    /**
     *
     * @param x
     * @param y
     * @param direction
     */
    sharePosition(x : number, y : number, direction : string = "none") : void{
        if(!this.socket){
            return;
        }
        let messageUserPosition = new MessageUserPosition(this.userId, ROOM[0], new Point(x, y, direction));
        this.socket.emit(EventMessage.USER_POSITION, messageUserPosition.toString());
    }

    /**
     * The data sent is an array with information for each user :
     * [
     * {
     *       userId: <string>,
     *       roomId: <string>,
     *       position: {
     *           x : <number>,
     *           y : <number>,
     *           direction: <string>
     *       }
     *     },
     * ...
     * ]
     **/
    positionOfAllUser(): void {
        this.socket.on(EventMessage.USER_POSITION, (message: string) => {
            let dataList = JSON.parse(message);
            dataList.forEach((UserPositions: any) => {
                let listMessageUserPosition = new ListMessageUserPosition(UserPositions[0], UserPositions[1]);
                this.GameManager.shareUserPosition(listMessageUserPosition);
            });
        });
    }

    sendWebrtcSignal(signal: any, roomId: string, userId? : string, receiverId? : string) {
        return this.socket.emit(EventMessage.WEBRTC_SIGNAL, JSON.stringify({
            userId: userId ? userId : this.userId,
            receiverId: receiverId ? receiverId : this.userId,
            roomId: roomId,
            signal: signal
        }));
    }

    receiveWebrtcStart(callback: Function) {
        this.socket.on(EventMessage.WEBRTC_START, callback);
    }

    receiveWebrtcSignal(callback: Function) {
        return this.socket.on(EventMessage.WEBRTC_SIGNAL, callback);
    }

    errorMessage(): void {
        this.socket.on(EventMessage.MESSAGE_ERROR, (message: string) => {
            console.error(EventMessage.MESSAGE_ERROR, message);
        })
    }

    disconnectMessage(callback: Function): void {
        this.socket.on(EventMessage.WEBRTC_DISCONNECT, callback);
    }
}