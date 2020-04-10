import {GameManagerInterface} from "./Phaser/Game/GameManager";

const SocketIo = require('socket.io-client');
import Axios from "axios";
import {API_URL} from "./Enum/EnvironmentVariable";

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
    roomId : string;
    listUsersPosition: Array<MessageUserPosition>;
}
class ListMessageUserPosition{
    roomId : string;
    listUsersPosition: Array<MessageUserPosition>;

    constructor(roomId : string, data : any) {
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

export class Connexion {
    socket : any;
    token : string;
    email : string;
    userId: string;
    startedRoom : string;

    GameManager: GameManagerInterface;

    constructor(email : string, GameManager: GameManagerInterface) {
        this.email = email;
        this.GameManager = GameManager;
    }

    createConnexion(){
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
                this.sharePosition(this.startedRoom, 0, 0);

                this.positionOfAllUser();

                this.errorMessage();

                return{
                    userId: this.userId,
                    roomId: this.startedRoom
                }
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
    joinARoom(roomId : string){
        let messageUserPosition = new MessageUserPosition(this.userId, this.startedRoom, new Point(0, 0));
        this.socket.emit('join-room', messageUserPosition.toString());
    }

    /**
     *
     * @param roomId
     * @param x
     * @param y
     * @param direction
     */
    sharePosition(roomId : string, x : number, y : number, direction : string = "none"){
        if(!this.socket){
            return;
        }
        let messageUserPosition = new MessageUserPosition(this.userId, roomId, new Point(x, y, direction));
        this.socket.emit('user-position', messageUserPosition.toString());
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
    positionOfAllUser() {
        this.socket.on("user-position", (message: string) => {
            let dataList = JSON.parse(message);
            dataList.forEach((UserPositions: any) => {
                let listMessageUserPosition = new ListMessageUserPosition(UserPositions[0], UserPositions[1]);
                this.GameManager.shareUserPosition(listMessageUserPosition);
            });
        });
    }

    errorMessage(){
        this.socket.on('message-error', (message : string) => {
            console.error("message-error", message);
        })
    }
}