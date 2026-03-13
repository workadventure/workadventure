import { Scene } from "phaser";
import { ErrorApiData } from "@workadventure/messages";
import { asError } from "catch-unknown";
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
                        this.waitPluginLoad()
                            .then(() => {
                                // Let's rescale before starting the game
                                // We can do it at this stage.
                                waScaleManager.applyNewSize();
                                this.scene.start(nextSceneName);
                            })
                            .catch((e) => {
                                throw new Error("Error while waiting plugin load!" + asError(e).message);
                            });
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
            .catch((e) => {
                throw new Error("Cannot load locale!" + asError(e).message);
            });
    }

    /**
     * In WebKit (especially in CI), we sometimes hit a startup race where the first scene starts
     * before rex global plugins are fully attached to the scene loader.
     *
     * If `rexAwait` is missing, subsequent loading code can block indefinitely and tests time out.
     * We therefore:
     * - try to attach the already-registered global plugin to this scene explicitly
     * - keep a short, bounded wait for late attachment
     * - fail fast if it never appears (instead of infinite polling)
     */
    private async waitPluginLoad(): Promise<void> {
        //eslint-disable-next-line @typescript-eslint/no-explicit-any
        const loader = this.load as any;

        if (!loader.rexAwait) {
            // Defensive self-healing for the first scene in WebKit: attach the plugin instance
            // directly to this scene loader when global auto-attachment did not happen yet.
            const awaitPlugin = this.plugins.get("rexAwaitLoader") as
                | { addToScene?: (scene: Scene) => void }
                | undefined;
            awaitPlugin?.addToScene?.(this);
        }

        return new Promise((resolve, reject) => {
            const start = Date.now();
            const timeoutMs = 3000;

            const check = () => {
                if (loader.rexAwait) {
                    resolve();
                } else if (Date.now() - start > timeoutMs) {
                    // Do not poll forever in CI; failing here makes the root issue explicit.
                    reject(new Error("rexAwait plugin was not available on scene loader"));
                } else {
                    console.info("Waiting for rex plugins to be loaded...");
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }
}
