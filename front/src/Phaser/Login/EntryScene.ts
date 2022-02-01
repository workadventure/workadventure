import { gameManager } from "../Game/GameManager";
import { Scene } from "phaser";
import { ErrorScene, ErrorSceneName } from "../Reconnecting/ErrorScene";
import { WAError } from "../Reconnecting/WAError";
import { waScaleManager } from "../Services/WaScaleManager";
import { ReconnectingTextures } from "../Reconnecting/ReconnectingScene";
import LL from "../../i18n/i18n-svelte";
import { get } from "svelte/store";
import { localeDetector } from "../../i18n/locales";

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
    }

    create() {
        localeDetector()
            .then(() => {
                gameManager
                    .init(this.scene)
                    .then((nextSceneName) => {
                        // Let's rescale before starting the game
                        // We can do it at this stage.
                        waScaleManager.applyNewSize();
                        this.scene.start(nextSceneName);
                    })
                    .catch((err) => {
                        const $LL = get(LL);
                        if (err.response && err.response.status == 404) {
                            ErrorScene.showError(
                                new WAError(
                                    $LL.error.accessLink.title(),
                                    $LL.error.accessLink.subTitle(),
                                    $LL.error.accessLink.details()
                                ),
                                this.scene
                            );
                        } else if (err.response && err.response.status == 403) {
                            ErrorScene.showError(
                                new WAError(
                                    $LL.error.connectionRejected.title(),
                                    $LL.error.connectionRejected.subTitle({
                                        error: err.response.data ? ". \n\r \n\r" + `${err.response.data}` : "",
                                    }),
                                    $LL.error.connectionRejected.details()
                                ),
                                this.scene
                            );
                        } else {
                            ErrorScene.showError(err, this.scene);
                        }
                    });
            })
            .catch(() => {
                throw new Error("Cannot load locale!");
            });
    }
}
