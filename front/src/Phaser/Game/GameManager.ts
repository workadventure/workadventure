import {GameSceneInterface, GameScene} from "./GameScene";
import {ROOM} from "../../Enum/EnvironmentVariable"
import {Connexion, ListMessageUserPositionInterface} from "../../Connexion";

export enum StatusGameManagerEnum {
    IN_PROGRESS = 1,
    CURRENT_USER_CREATED = 2
}

export let ConnexionInstance : Connexion;

export interface GameManagerInterface {
    GameScenes: Array<GameSceneInterface>;
    status : number;
    createCurrentPlayer() : void;
    shareUserPosition(ListMessageUserPosition : ListMessageUserPositionInterface): void;
}
export class GameManager implements GameManagerInterface {
    GameScenes: Array<GameSceneInterface> = [];
    status: number;

    constructor() {
        this.status = StatusGameManagerEnum.IN_PROGRESS;
        ConnexionInstance = new Connexion("test@gmail.com", this);
    }

    createGame(){
        return ConnexionInstance.createConnexion().then((data: any) => {
            this.configureGame();
            /** TODO add loader in the page **/
        }).catch((err) => {
            console.error(err);
            throw err;
        });
    }

    /**
     * permit to config rooms
     */
    configureGame() {
        ROOM.forEach((roomId) => {
            let newGame = new GameScene(roomId, this);
            this.GameScenes.push((newGame as GameSceneInterface));
        });
    }

    /**
     * Permit to create player in started room
     * @param RoomId
     * @param UserId
     */
    createCurrentPlayer(): void {
        let game: GameSceneInterface = this.GameScenes.find((Game: GameSceneInterface) => Game.RoomId === ConnexionInstance.startedRoom);
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