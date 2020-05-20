import {GameManager} from "./Phaser/Game/GameManager";
import Axios from "axios";
import {API_URL} from "./Enum/EnvironmentVariable";
import {MessageUI} from "./Logger/MessageUI";
import {SetPlayerDetailsMessage} from "./Messages/SetPlayerDetailsMessage";

const SocketIo = require('socket.io-client');
import Socket = SocketIOClient.Socket;


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
}

export class Point implements PointInterface{
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
    name: string;
    userId: string;

    createConnexion(name: string, characterSelected: string): Promise<any>;

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
    socket: Socket;
    token: string;
    name: string; // TODO: drop "name" storage here
    character: string;
    userId: string;

    GameManager: GameManager;

    lastPositionShared: PointInterface = null;
    lastRoom: string|null = null;

    constructor(GameManager: GameManager) {
        this.GameManager = GameManager;
    }

    createConnexion(name: string, characterSelected: string): Promise<ConnexionInterface> {
        this.name = name;
        this.character = characterSelected;
        /*return Axios.post(`${API_URL}/login`, {email: this.email})
            .then((res) => {
                this.token = res.data.token;
                this.userId = res.data.userId;*/

                this.socket = SocketIo(`${API_URL}`, {
                    /*query: {
                        token: this.token
                    }*/
                });

                return this.connectSocketServer();

         /*       return res.data;
            })
            .catch((err) => {
                console.error(err);
                throw err;
            });*/
    }

    /**
     *
     * @param character
     */
    connectSocketServer(): Promise<ConnexionInterface>{
        //listen event
        this.positionOfAllUser();
        this.disconnectServer();
        this.errorMessage();
        this.groupUpdatedOrCreated();
        this.groupDeleted();
        this.onUserJoins();
        this.onUserMoved();
        this.onUserLeft();

        return new Promise<ConnexionInterface>((resolve, reject) => {
            this.socket.emit(EventMessage.SET_PLAYER_DETAILS, {
                name: this.name,
                character: this.character
            } as SetPlayerDetailsMessage, (id: string) => {
                this.userId = id;
            });

            //if try to reconnect with last position
            if(this.lastRoom) {
                //join the room
                this.joinARoom(
                    this.lastRoom
                );
            }

            if(this.lastPositionShared) {

                //share your first position
                this.sharePosition(
                    this.lastPositionShared ? this.lastPositionShared.x : 0,
                    this.lastPositionShared ? this.lastPositionShared.y : 0,
                    this.lastPositionShared.direction
                );
            }

            resolve(this);
        });
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
    joinARoom(roomId: string): void {
        this.socket.emit(EventMessage.JOIN_ROOM, roomId, (userPositions: MessageUserPositionInterface[]) => {
            this.GameManager.initUsersPosition(userPositions);
        });
        this.lastRoom = roomId;
    }

    /**
     *
     * @param x
     * @param y
     * @param character
     * @param roomId
     * @param direction
     */
    sharePosition(x : number, y : number, direction : string = "none") : void{
        if(!this.socket){
            return;
        }
        let point = new Point(x, y, direction);
        this.lastPositionShared = point;
        this.socket.emit(EventMessage.USER_POSITION, point);
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
            let dataList = message;
            let UserPositions : Array<any> = Object.values(dataList);
            let listMessageUserPosition =  new ListMessageUserPosition(UserPositions[0], UserPositions[1]);
            this.GameManager.shareUserPosition(listMessageUserPosition);
        });
    }

    onUserJoins(): void {
        this.socket.on(EventMessage.JOIN_ROOM, (message: MessageUserJoined) => {
            this.GameManager.onUserJoins(message);
        });
    }

    onUserMoved(): void {
        this.socket.on(EventMessage.USER_MOVED, (message: MessageUserMovedInterface) => {
            this.GameManager.onUserMoved(message);
        });
    }

    onUserLeft(): void {
        this.socket.on(EventMessage.USER_LEFT, (userId: string) => {
            this.GameManager.onUserLeft(userId);
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
        return this.socket.emit(EventMessage.WEBRTC_SIGNAL, {
            userId: userId ? userId : this.userId,
            receiverId: receiverId ? receiverId : this.userId,
            roomId: roomId,
            signal: signal
        });
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
