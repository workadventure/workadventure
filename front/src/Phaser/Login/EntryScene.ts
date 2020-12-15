import {gameManager} from "../Game/GameManager";
import {Scene} from "phaser";
import {LoginSceneName} from "./LoginScene";
import {FourOFourSceneName} from "../Reconnecting/FourOFourScene";

export const EntrySceneName = "EntryScene";

/**
 * The EntryScene is not a real scene. It is the first scene loaded and is only used to initialize the gameManager
 * and to route to the next correct scene.
 */
export class EntryScene extends Scene {
    constructor() {
        super({
            key: EntrySceneName
        });
    }

    create() {
        gameManager.init(this.scene).then((nextSceneName) => {
            this.scene.start(nextSceneName);
        }).catch((err) => {
            console.error(err)
            this.scene.start(FourOFourSceneName, {
                url: window.location.pathname.toString()
            });
        });
    }
}
