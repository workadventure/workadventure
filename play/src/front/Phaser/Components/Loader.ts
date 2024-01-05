import type CancelablePromise from "cancelable-promise";
import { gameManager } from "../Game/GameManager";
import { SuperLoaderPlugin } from "../Services/SuperLoaderPlugin";
import Texture = Phaser.Textures.Texture;

const TextName = "Loading...";

const loadingBarHeight = 16;
const padding = 5;

export class Loader {
    private progressContainer!: Phaser.GameObjects.Graphics;
    private progress!: Phaser.GameObjects.Graphics;
    private progressAmount = 0;
    private logo: Phaser.GameObjects.Image | undefined;
    private poweredByLogo: Phaser.GameObjects.Image | undefined;
    private loadingText: Phaser.GameObjects.Text | null = null;
    private logoNameIndex!: string;
    private superLoad: SuperLoaderPlugin;
    private logoPromise: CancelablePromise<Texture> | undefined;
    private poweredByLogoPromise: CancelablePromise<Texture> | undefined;
    private resizeFunction: (() => void) | undefined;

    public constructor(private scene: Phaser.Scene) {
        this.superLoad = new SuperLoaderPlugin(scene);
    }

    public addLoader(): void {
        if (!this.scene.game.renderer) {
            // No need to add a loader if the game is in headless mode
            return;
        }

        // If there is nothing to load, do not display the loader.
        if (this.scene.load.list.entries.length === 0) {
            return;
        }

        const logoResource = gameManager.currentStartedRoom.loadingLogo ?? "static/images/logo.png";
        this.logoNameIndex = "logoLoading" + logoResource;

        //add loading if logo image until logo image is ready
        this.loadingText = this.scene.add.text(
            this.scene.game.renderer.width / 2,
            this.scene.game.renderer.height / 2 - 50,
            TextName
        );

        this.logoPromise = this.superLoad.image(this.logoNameIndex, logoResource);
        this.logoPromise
            .then((texture) => {
                this.logo = this.scene.add.image(
                    this.scene.game.renderer.width / 2,
                    this.scene.game.renderer.height / 2 - 150,
                    texture
                );

                this.loadingText?.destroy();
            })
            .catch((e) => console.warn("Could not load logo: ", logoResource, e));

        if (gameManager.currentStartedRoom.loadingLogo && gameManager.currentStartedRoom.showPoweredBy !== false) {
            this.poweredByLogoPromise = this.superLoad.image(
                "poweredByLogo",
                "static/images/Powered_By_WorkAdventure_Small.png"
            );
            this.poweredByLogoPromise
                .then((texture) => {
                    this.poweredByLogo = this.scene.add.image(
                        this.scene.game.renderer.width / 2,
                        this.scene.game.renderer.height - 50,
                        texture
                    );
                })
                .catch((e) =>
                    console.warn('Could not load image "static/images/Powered_By_WorkAdventure_Small.png"', e)
                );
        }

        this.progressContainer = this.scene.add.graphics();
        this.progressContainer.fillStyle(0x444444, 0.8);
        this.progress = this.scene.add.graphics();

        this.resize();

        this.scene.load.on("progress", (value: number) => {
            this.progressAmount = value;
            this.drawProgress();
        });

        this.resizeFunction = this.resize.bind(this);
        this.scene.scale.on(Phaser.Scale.Events.RESIZE, this.resizeFunction);

        if (gameManager.currentStartedRoom && gameManager.currentStartedRoom.backgroundColor != undefined) {
            this.scene.cameras.main.setBackgroundColor(gameManager.currentStartedRoom.backgroundColor);
        }
    }

    public hideLoader(): void {
        if (this.loadingText) {
            this.loadingText.destroy();
        }
        this.logoPromise?.cancel();
        this.poweredByLogoPromise?.cancel();

        this.logo?.destroy();
        this.poweredByLogo?.destroy();

        this.progress.destroy();
        this.progressContainer.destroy();
        if (this.resizeFunction) {
            this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.resizeFunction);
        }
    }

    /*public removeLoader(): void {
        if (this.scene.load.textureManager.exists(this.logoNameIndex)) {
            this.scene.load.textureManager.remove(this.logoNameIndex);
        }
        if (this.scene.load.textureManager.exists("poweredByLogo")) {
            this.scene.load.textureManager.remove("poweredByLogo");
        }
    }*/

    public resize(): void {
        const loadingBarWidth: number = Math.floor(this.scene.game.renderer.width / 3);

        this.progressContainer.clear();
        this.progressContainer.fillStyle(0x444444, 0.8);
        this.progressContainer.fillRect(
            (this.scene.game.renderer.width - loadingBarWidth) / 2 - padding,
            this.scene.game.renderer.height / 2 + 50 - padding,
            loadingBarWidth + padding * 2,
            loadingBarHeight + padding * 2
        );

        this.drawProgress();

        if (this.loadingText) {
            this.loadingText.x = this.scene.game.renderer.width / 2;
            this.loadingText.y = this.scene.game.renderer.height / 2 - 50;
        }

        if (this.logo) {
            this.logo.x = this.scene.game.renderer.width / 2;
            this.logo.y = this.scene.game.renderer.height / 2 - 150;
        }

        if (this.poweredByLogo) {
            this.poweredByLogo.x = this.scene.game.renderer.width / 2;
            this.poweredByLogo.y = this.scene.game.renderer.height - 40;
        }
    }

    private drawProgress() {
        const loadingBarWidth: number = Math.floor(this.scene.game.renderer.width / 3);

        this.progress.clear();
        this.progress.fillStyle(0xbbbbbb, 1);
        this.progress.fillRect(
            (this.scene.game.renderer.width - loadingBarWidth) / 2,
            this.scene.game.renderer.height / 2 + 50,
            loadingBarWidth * this.progressAmount,
            loadingBarHeight
        );
    }
}
