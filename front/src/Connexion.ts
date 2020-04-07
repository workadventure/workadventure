import {GameManagerInterface} from "./Phaser/Game/GameManager";

const SocketIo = require('socket.io-client');
import Axios from "axios";
import {API_URL} from "./Enum/EnvironmentVariable";

export interface PointInterface {
    x: number;
    y: number;
    toJson() : object;
}

export class Message {
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

export class Point implements PointInterface{
    x: number;
    y: number;

    constructor(x : number, y : number) {
        if(x  === null || y === null){
            throw Error("position x and y cannot be null");
        }
        this.x = x;
        this.y = y;
    }

    toJson(){
        return {
            x : this.x,
            y: this.y
        }
    }
}

export class MessageUserPosition extends Message{
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

export class Connexion {
    socket : any;
    token : string;
    email : string;
    startedRoom : string;

    GameManager: GameManagerInterface;

    constructor(email : string, GameManager: GameManagerInterface) {
        this.email = email;
        this.GameManager = GameManager;
        Axios.post(`${API_URL}/login`, {email: email})
            .then((res) => {
                this.token = res.data.token;
                this.startedRoom = res.data.roomId;

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
        let messageUserPosition = new MessageUserPosition(this.email, this.startedRoom, new Point(0, 0));
        this.socket.emit('join-room', messageUserPosition.toString());
    }

    /**
     * Permit to share your position in map
     * @param x
     * @param y
     */
    sharePosition(roomId : string, x : number, y : number){
        let messageUserPosition = new MessageUserPosition(this.email, roomId, new Point(x, y));
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
     *           y : <number>
     *       }
     *     },
     * ...
     * ]
     **/
    positionOfAllUser(){
        this.socket.on("user-position", (message : string) => {
            let data = JSON.parse(message);
            data.forEach((UserPositions : any) => {
                this.GameManager.sharedUserPosition(UserPositions);
            });
        });
    }

    errorMessage(){
        this.socket.on('message-error', (message : string) => {
            console.error("message-error", message);
        })
    }
}