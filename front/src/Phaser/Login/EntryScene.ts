import { gameManager } from "../Game/GameManager";
import { Scene } from "phaser";
import { ErrorScene, ErrorSceneName } from "../Reconnecting/ErrorScene";
import { WAError } from "../Reconnecting/WAError";
import { waScaleManager } from "../Services/WaScaleManager";
import { ReconnectingTextures } from "../Reconnecting/ReconnectingScene";
import { translator } from "../../Translator/Translator";

export const EntrySceneName = "EntryScene";

/**
 * The EntryScene is not a real scene. It is the first scene loaded and is only used to initialize the gameManager
 * and to route to the next correct scene.
 */
export class EntryScene extends Scene {

    constructor() {
        super({
            key: EntrySceneName,
        });
    }

    // From the very start, let's preload images used in the ReconnectingScene.
    preload() {
        this.load.image(ReconnectingTextures.icon, "static/images/favicons/favicon-32x32.png");
        // Note: arcade.png from the Phaser 3 examples at: https://github.com/photonstorm/phaser3-examples/tree/master/public/assets/fonts/bitmap
        this.load.bitmapFont(ReconnectingTextures.mainFont, "resources/fonts/arcade.png", "resources/fonts/arcade.xml");
        this.load.spritesheet("cat", "resources/characters/pipoya/Cat 01-1.png", { frameWidth: 32, frameHeight: 32 });
        translator.loadCurrentLanguageFile(this.load);
    }

    create() {
        translator
            .loadCurrentLanguageObject(this.cache)
            .catch((e: unknown) => {
                console.error("Error during language loading!", e);
                throw e;
            })
            .finally(() => {
                gameManager
                    .init(this.scene)
                    .then((nextSceneName) => {
                        // Let's rescale before starting the game
                        // We can do it at this stage.
                        waScaleManager.applyNewSize();
                        this.scene.start(nextSceneName);
                    })
                    .catch((err) => {
                        if (err.response && err.response.status == 404) {
                            ErrorScene.showError(
                                new WAError(
                                    "Access link incorrect",
                                    "Could not find map. Please check your access link.",
                                    "If you want more information, you may contact administrator or contact us at: hello@workadventu.re"
                                ),
                                this.scene
                            );
                        } else if (err.response && err.response.status == 403) {
                            ErrorScene.showError(
                                new WAError(
                                    "Connection rejected",
                                    "You cannot join the World. Try again later" +
                                        (err.response.data ? ". \n\r \n\r" + `${err.response.data}` : "") +
                                        ".",
                                    "If you want more information, you may contact administrator or contact us at: hello@workadventu.re"
                                ),
                                this.scene
                            );
                        } else {
                            ErrorScene.showError(err, this.scene);
                        }
                    });
            });
    }
}
