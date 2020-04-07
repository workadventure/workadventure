import {GameSceneInterface, GameScene} from "./GameScene";
import {ROOM} from "../../Enum/EnvironmentVariable"
import {Connexion} from "../../Connexion";

export let ConnexionInstance : Connexion;

export interface GameManagerInterface {
    GameScenes: Array<GameSceneInterface>;

    sharedUserPosition(UserPositions: any): void;
}
export class GameManager implements GameManagerInterface {
    GameScenes: Array<GameSceneInterface> = [];

    constructor() {
        this.configureGame();
        ConnexionInstance = new Connexion("test@gmail.com", this);
    }

    configureGame() {
        ROOM.forEach((roomId) => {
            let newGame = new GameScene(roomId, this);
            this.GameScenes.push(newGame);
        });
    }

    sharedUserPosition(UserPositions: any) {
        let Game: GameSceneInterface = this.GameScenes.find((Game: GameSceneInterface) => Game.RoomId === UserPositions.roomId);
        Game.sharedUserPosition(UserPositions)
    }
}