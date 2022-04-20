import { gameManager } from "../Game/GameManager";
import { Scene } from "phaser";
import { ErrorScene } from "../Reconnecting/ErrorScene";
import { waScaleManager } from "../Services/WaScaleManager";
import { ReconnectingTextures } from "../Reconnecting/ReconnectingScene";
import { localeDetector } from "../../i18n/locales";
import { errorScreenStore } from "../../Stores/ErrorScreenStore";
import {isErrorApiData} from "../../Messages/JsonMessages/ErrorApiData";
import {connectionManager} from "../../Connexion/ConnectionManager";

export const EntrySceneName = "EntryScene";

/**
 * The EntryScene is not a real scene. It is the first scene loaded and is only used to initialize the gameManager
 * and to route to the next correct scene.
 */
export class EntryScene extends Scene {
    private localeLoaded: boolean = false;

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
        this.loadLocale();
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
                        const errorType = isErrorApiData.safeParse(err?.response?.data);
                        if (errorType.success) {
                            // If error from API and urlToRedirect is specified but not buttonTitle => redirect directly
                            if (!errorType.data.buttonTitle && errorType.data.urlToRedirect){
                                if (errorType.data.urlToRedirect === "/login") void connectionManager.logout();
                                else window.location.assign(errorType.data.urlToRedirect);
                            } else errorScreenStore.setError(err.response.data);
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
