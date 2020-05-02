import {GameScene} from "./GameScene";
import {ROOM} from "../../Enum/EnvironmentVariable"
import {Connexion, ConnexionInterface, ListMessageUserPositionInterface} from "../../Connexion";
import {SimplePeerInterface, SimplePeer} from "../../WebRtc/SimplePeer";
import {LogincScene} from "../Login/LogincScene";

export enum StatusGameManagerEnum {
    IN_PROGRESS = 1,
    CURRENT_USER_CREATED = 2
}

export interface HasMovedEvent {
    direction: string;
    x: number;
    y: number;
}

export class GameManager {
    status: number;
    private ConnexionInstance: Connexion;
    private currentGameScene: GameScene;
    SimplePeer : SimplePeerInterface;

    constructor() {
        this.status = StatusGameManagerEnum.IN_PROGRESS;
    }
    
    connect(email:string) {
        this.ConnexionInstance = new Connexion(email, this);
        return this.ConnexionInstance.createConnexion().then(() => {
            this.SimplePeer = new SimplePeer(this.ConnexionInstance);
        });
    }

    setCurrentGameScene(gameScene: GameScene) {
        this.currentGameScene = gameScene;
    }


    /**
     * Permit to create player in started room
     */
    createCurrentPlayer(): void {
        //Get started room send by the backend
        this.currentGameScene.createCurrentPlayer(this.ConnexionInstance.userId);
        this.status = StatusGameManagerEnum.CURRENT_USER_CREATED;
    }

    /**
     * Share position in game
     * @param ListMessageUserPosition
     */
    shareUserPosition(ListMessageUserPosition: ListMessageUserPositionInterface): void {
        if (this.status === StatusGameManagerEnum.IN_PROGRESS) {
            return;
        }
        try {
            this.currentGameScene.shareUserPosition(ListMessageUserPosition.listUsersPosition)
        } catch (e) {
            console.error(e);
        }
    }

    pushPlayerPosition(event: HasMovedEvent) {
        this.ConnexionInstance.sharePosition(event.x, event.y, event.direction);
    }
}

export const gameManager = new GameManager();