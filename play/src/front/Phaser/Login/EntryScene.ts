import { Scene } from "phaser";
import { ErrorApiData } from "@workadventure/messages";
import { gameManager } from "../Game/GameManager";
import { waScaleManager } from "../Services/WaScaleManager";
import { ReconnectingTextures } from "../Reconnecting/ReconnectingScene";
import { errorScreenStore } from "../../Stores/ErrorScreenStore";
import { localeDetector } from "../../Utils/locales";

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
        // Note: arcade.png from the Phaser 3 examples at: https://github.com/photonstorm/phaser3-examples/tree/master/public/assets/fonts/bitmap
        this.load.bitmapFont(ReconnectingTextures.mainFont, "resources/fonts/arcade.png", "resources/fonts/arcade.xml");
        this.load.spritesheet("cat", "resources/characters/pipoya/Cat 01-1.png", { frameWidth: 32, frameHeight: 32 });
    }

    create() {
        this.loadLocale();

        if (gameManager.currentStartedRoom && gameManager.currentStartedRoom.backgroundColor != undefined) {
            this.cameras.main.setBackgroundColor(gameManager.currentStartedRoom.backgroundColor);
        }
    }

    private loadLocale(): void {
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
                        // TODO: make this safer ?
                        const errorType = ErrorApiData.safeParse(err?.response?.data);
                        if (errorType.success) {
                            if (errorType.data.type === "redirect") {
                                window.location.assign(errorType.data.urlToRedirect);
                            } else errorScreenStore.setError(err?.response?.data);
                        } else {
                            errorScreenStore.setException(err);
                            //ErrorScene.showError(err, this.scene);
                        }
                    });
            })
            .catch(() => {
                throw new Error("Cannot load locale!");
            });
    }
}
