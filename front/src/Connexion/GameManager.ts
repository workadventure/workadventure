import {ConnectedUser} from "./ConnectedUser";
import {BehaviorSubject} from "rxjs";
import {connexionManager} from "./ConnexionManager";

export enum StatusGameManagerEnum {
    IN_PROGRESS = 1,
    CURRENT_USER_CREATED = 2
}

interface Position{
    x: number;
    y: number;
}

class ConnectedUserPositionData{
    userId: string;
    position: Position;
    
    constructor(userId: string, position: Position) {
        this.userId = userId;
        this.position = position;
    }
}

export interface UserPositionChangeEvent {
    userId: string;
    x: number;
    y: number;
    deleted: boolean
    added: boolean
}

export class GameManager {
    status: StatusGameManagerEnum;
    private connectedUser: ConnectedUser;
    private socket: any;
    private connectedUserPosition = new BehaviorSubject({x: 0, y: 0});
    public otherUserPositionsChange: BehaviorSubject<UserPositionChangeEvent[]> = new BehaviorSubject([]);
    
    constructor() {
        this.status = StatusGameManagerEnum.IN_PROGRESS;
    }
    
    
    async login(email:string) {
        let response = await connexionManager.createConnexion(email);
        this.connectedUser = response.connectedUser;
        this.socket = response.socket;

        this.socket.on('message-error', (message : string) => {
            console.error("message-error", message);
        });

        
        this.socket.on("user-position", (message: string) => {
            let eventList = JSON.parse(message);
           this.otherUserPositionsChange.next(eventList);
        });
        
        this.connectedUserPosition.subscribe(position => {
            let data = new ConnectedUserPositionData(this.connectedUser.id, position);
            this.socket.emit('user-position', JSON.stringify(data));
        })
        
        
    }
    
    updateConnectedUserPosition(x: number, y: number) {
        this.connectedUserPosition.next({x, y});
    }
}

export const gameManager = new GameManager();