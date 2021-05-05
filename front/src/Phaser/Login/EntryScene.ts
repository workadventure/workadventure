import {gameManager} from "../Game/GameManager";
import {Scene} from "phaser";
import {ErrorScene} from "../Reconnecting/ErrorScene";
import {WAError} from "../Reconnecting/WAError";
import {waScaleManager} from "../Services/WaScaleManager";

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
            // Let's rescale before starting the game
            // We can do it at this stage.
            waScaleManager.applyNewSize();
            this.scene.start(nextSceneName);
        }).catch((err) => {
            if (err.response && err.response.status == 404) {
                ErrorScene.showError(new WAError('Page Not Found', 'Could not find map', window.location.pathname), this.scene);
            } else {
                ErrorScene.showError(err, this.scene);
            }
        });
    }
}
