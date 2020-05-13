import {GameManager} from "./Phaser/Game/GameManager";

const SocketIo = require('socket.io-client');
import Axios from "axios";
import {API_URL} from "./Enum/EnvironmentVariable";
import {getMapKeyByUrl} from "./Phaser/Login/LogincScene";
import {MessageUI} from "./Logger/MessageUI";

enum EventMessage{
    WEBRTC_SIGNAL = "webrtc-signal",
    WEBRTC_START = "webrtc-start",
    WEBRTC_JOIN_ROOM = "webrtc-join-room",
    JOIN_ROOM = "join-room",
    USER_POSITION = "user-position",
    MESSAGE_ERROR = "message-error",
    WEBRTC_DISCONNECT = "webrtc-disconect",
    GROUP_CREATE_UPDATE = "group-create-update",
    GROUP_DELETE = "group-delete",

    CONNECT_ERROR = "connect_error",
    RECONNECT = "reconnect"
}

class Message {
    userId: string;
    roomId: string;
    name: string;
    character: string;

    constructor(userId : string, roomId : string, name: string, character: string) {
        this.userId = userId;
        this.roomId = roomId;
        this.name = name;
        this.character = character;
    }

    toJson() {
        return {
            userId: this.userId,
            roomId: this.roomId,
            name: this.name,
            character: this.character
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
    name: string;
    character: string;
    position: PointInterface;
}

class MessageUserPosition extends Message implements MessageUserPositionInterface{
    position: PointInterface;

    constructor(userId : string, roomId : string, point : Point, name: string, character: string) {
        super(userId, roomId, name, character);
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
                ),
                userPosition.name,
                userPosition.character
            ));
        });
    }
}

export interface PositionInterface {
    x: number,
    y: number
}

export interface GroupCreatedUpdatedMessageInterface {
    position: PositionInterface,
    groupId: string
}

export interface ConnexionInterface {
    socket: any;
    token: string;
    email: string;
    userId: string;

    createConnexion(characterSelected: string): Promise<any>;

    loadMaps(): Promise<any>;

    joinARoom(roomId: string, character: string): void;

    sharePosition(x: number, y: number, direction: string, roomId: string, character: string): void;

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

    GameManager: GameManager;

    lastPositionShared: MessageUserPosition = null;

    constructor(email : string, GameManager: GameManager) {
        this.email = email;
        this.GameManager = GameManager;
    }

    /**
     * @param characterSelected
     */
    createConnexion(characterSelected: string): Promise<ConnexionInterface> {
        return Axios.post(`${API_URL}/login`, {email: this.email})
            .then((res) => {
                this.token = res.data.token;
                this.userId = res.data.userId;

                this.socket = SocketIo(`${API_URL}`, {
                    query: {
                        token: this.token
                    }
                });

                this.connectSocketServer();

                return res.data;
            })
            .catch((err) => {
                console.error(err);
                throw err;
            });
    }

    /**
     *
     * @param character
     */
    connectSocketServer(character : string = null){
        //if try to reconnect with last position
        if(this.lastPositionShared) {
            //join the room
            this.joinARoom(
                this.lastPositionShared.roomId,
                this.lastPositionShared.character
            );

            //share your first position
            this.sharePosition(
                this.lastPositionShared ? this.lastPositionShared.position.x : 0,
                this.lastPositionShared ? this.lastPositionShared.position.y : 0,
                this.lastPositionShared.character,
                this.lastPositionShared.roomId,
                this.lastPositionShared.position.direction
            );
        }

        //listen event
        this.positionOfAllUser();
        this.disconnectServer();
        this.errorMessage();
        this.groupUpdatedOrCreated();
        this.groupDeleted();
    }

    //TODO add middleware with access token to secure api
    loadMaps() : Promise<any> {
        return Axios.get(`${API_URL}/maps`)
            .then((res) => {
                return res.data;
            }).catch((err) => {
                console.error(err);
                throw err;
            });
    }

    /**
     *
     * @param roomId
     * @param character
     */
    joinARoom(roomId: string, character: string): void {
        let messageUserPosition = new MessageUserPosition(
            this.userId,
            roomId,
            new Point(0, 0),
            this.email,
            character
        );
        this.socket.emit(EventMessage.JOIN_ROOM, messageUserPosition.toString());
    }

    /**
     *
     * @param x
     * @param y
     * @param character
     * @param roomId
     * @param direction
     */
    sharePosition(x : number, y : number, character : string, roomId : string, direction : string = "none") : void{
        if(!this.socket){
            return;
        }
        let messageUserPosition = new MessageUserPosition(
            this.userId,
            roomId,
            new Point(x, y, direction),
            this.email,
            character
        );
        this.lastPositionShared = messageUserPosition;
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
            let UserPositions : Array<any> = Object.values(dataList);
            let listMessageUserPosition =  new ListMessageUserPosition(UserPositions[0], UserPositions[1]);
            this.GameManager.shareUserPosition(listMessageUserPosition);
        });
    }

    private groupUpdatedOrCreated(): void {
        this.socket.on(EventMessage.GROUP_CREATE_UPDATE, (groupCreateUpdateMessage: GroupCreatedUpdatedMessageInterface) => {
            //console.log('Group ', groupCreateUpdateMessage.groupId, " position :", groupCreateUpdateMessage.position.x, groupCreateUpdateMessage.position.y)
            this.GameManager.shareGroupPosition(groupCreateUpdateMessage);
        })
    }

    private groupDeleted(): void {
        this.socket.on(EventMessage.GROUP_DELETE, (groupId: string) => {
            this.GameManager.deleteGroup(groupId);
        })
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

    disconnectServer(): void {
        this.socket.on(EventMessage.CONNECT_ERROR, () => {
            MessageUI.warningMessage("Trying to connect!");
        });

        this.socket.on(EventMessage.RECONNECT, () => {
            MessageUI.removeMessage();
            this.connectSocketServer();
        });
    }

    disconnectMessage(callback: Function): void {
        this.socket.on(EventMessage.WEBRTC_DISCONNECT, callback);
    }
}
