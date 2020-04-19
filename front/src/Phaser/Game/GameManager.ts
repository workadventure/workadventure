import {GameSceneInterface, GameScene} from "./GameScene";
import {ROOM} from "../../Enum/EnvironmentVariable"
import {
    ConnexionInterface,
    ListMessageUserPositionInterface,
    connectionManager
} from "../../ConnexionManager";

export enum StatusGameManagerEnum {
    IN_PROGRESS = 1,
    CURRENT_USER_CREATED = 2
}

export let ConnexionInstance : ConnexionInterface;

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
    }

    /**
     * Permit to create player in started room
     */
    createCurrentPlayer(): void {
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