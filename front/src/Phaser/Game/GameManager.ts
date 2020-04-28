import {GameSceneInterface, GameScene} from "./GameScene";
import {ROOM} from "../../Enum/EnvironmentVariable"
import {Connexion, ConnexionInterface, ListMessageUserPositionInterface} from "../../Connexion";
import {SimplePeerInterface, SimplePeer} from "../../WebRtc/SimplePeer";
import {LogincScene} from "../Login/LogincScene";

export enum StatusGameManagerEnum {
    IN_PROGRESS = 1,
    CURRENT_USER_CREATED = 2
}

export let ConnexionInstance : ConnexionInterface;

export interface GameManagerInterface {
    GameScenes: Array<GameSceneInterface>;
    status : number;
    SimplePeer: SimplePeerInterface;
    createCurrentPlayer() : void;
    shareUserPosition(ListMessageUserPosition : ListMessageUserPositionInterface): void;
    connect(email : string) : Promise<any>;
}
export class GameManager implements GameManagerInterface {
    GameScenes: Array<GameSceneInterface> = [];
    status: number;
    SimplePeer : SimplePeerInterface;

    constructor() {
        this.status = StatusGameManagerEnum.IN_PROGRESS;
        this.configureGame();
    }

    /**
     *
     * @param email
     */
    connect(email : string) : Promise<any> {
        ConnexionInstance = new Connexion(email, this);
        return ConnexionInstance.createConnexion().then(() => {
            this.SimplePeer = new SimplePeer(ConnexionInstance);
        });
    }

    /**
     * permit to config rooms
     */
    configureGame() {
        //create login scene
        let LoginScene = new LogincScene();
        this.GameScenes.push(LoginScene)

        //create scene
        ROOM.forEach((roomId) => {
            let newGame = new GameScene(roomId, this);
            this.GameScenes.push((newGame as GameSceneInterface));
        });
    }

    /**
     *
     */
    createCurrentPlayer(): void {
        //Get started room send by the backend
        let game: GameSceneInterface = this.GameScenes.find((Game: GameSceneInterface) => Game.RoomId === ConnexionInstance.startedRoom);
        if(!game){
            return;
        }
        game.createCurrentPlayer(ConnexionInstance.userId);
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
            let Game: GameSceneInterface = this.GameScenes.find((Game: GameSceneInterface) => Game.RoomId === ListMessageUserPosition.roomId);
            if (!Game) {
                return;
            }
            Game.shareUserPosition(ListMessageUserPosition.listUsersPosition)
        } catch (e) {
            console.error(e);
        }
    }
}

export const gameManager = new GameManager();