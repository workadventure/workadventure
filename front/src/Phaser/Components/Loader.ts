import ImageFrameConfig = Phaser.Types.Loader.FileTypes.ImageFrameConfig;
import { DirtyScene } from "../Game/DirtyScene";

const LogoNameIndex: string = "logoLoading";
const TextName: string = "Loading...";
const LogoResource: string = "static/images/logo.png";
const LogoFrame: ImageFrameConfig = { frameWidth: 310, frameHeight: 60 };

const loadingBarHeight: number = 16;
const padding: number = 5;

export class Loader {
    private progressContainer!: Phaser.GameObjects.Graphics;
    private progress!: Phaser.GameObjects.Graphics;
    private progressAmount: number = 0;
    private logo: Phaser.GameObjects.Image | undefined;
    private loadingText: Phaser.GameObjects.Text | null = null;

    public constructor(private scene: Phaser.Scene) {}

    public addLoader(): void {
        // If there is nothing to load, do not display the loader.
        if (this.scene.load.list.entries.length === 0) {
            return;
        }

        const loadingBarWidth: number = Math.floor(this.scene.game.renderer.width / 3);

        const promiseLoadLogoTexture = new Promise<Phaser.GameObjects.Image>((res) => {
            if (this.scene.load.textureManager.exists(LogoNameIndex)) {
                return res(
                    (this.logo = this.scene.add.image(
                        this.scene.game.renderer.width / 2,
                        this.scene.game.renderer.height / 2 - 150,
                        LogoNameIndex
                    ))
                );
            } else {
                //add loading if logo image is not ready
                this.loadingText = this.scene.add.text(
                    this.scene.game.renderer.width / 2,
                    this.scene.game.renderer.height / 2 - 50,
                    TextName
                );
            }
            this.scene.load.spritesheet(LogoNameIndex, LogoResource, LogoFrame);
            this.scene.load.once(`filecomplete-spritesheet-${LogoNameIndex}`, () => {
                if (this.loadingText) {
                    this.loadingText.destroy();
                }
                return res(
                    (this.logo = this.scene.add.image(
                        this.scene.game.renderer.width / 2,
                        this.scene.game.renderer.height / 2 - 150,
                        LogoNameIndex
                    ))
                );
            });
        });

        this.progressContainer = this.scene.add.graphics();
        this.progress = this.scene.add.graphics();
        this.progressContainer.fillStyle(0x444444, 0.8);

        this.resize();

        this.scene.load.on("progress", (value: number) => {
            this.progressAmount = value;
            this.drawProgress();
        });
        this.scene.load.on("complete", () => {
            if (this.loadingText) {
                this.loadingText.destroy();
            }
            promiseLoadLogoTexture
                .then((resLoadingImage: Phaser.GameObjects.Image) => {
                    resLoadingImage.destroy();
                })
                .catch((e) => console.error(e));
            this.progress.destroy();
            this.progressContainer.destroy();
            if (this.scene instanceof DirtyScene) {
                this.scene.markDirty();
            }
        });
    }

    public removeLoader(): void {
        if (this.scene.load.textureManager.exists(LogoNameIndex)) {
            this.scene.load.textureManager.remove(LogoNameIndex);
        }
    }

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
