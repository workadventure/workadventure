import { asError } from "catch-unknown";

export class TexturesHelper {
    public static async getSnapshot(
        scene: Phaser.Scene,
        ...sprites: { sprite: Phaser.GameObjects.Sprite; frame?: string | number }[]
    ): Promise<string> {
        if (!scene.game.renderer) {
            // In headless mode, we cannot take snapshots.
            // TODO: send a correct PNG????
            // TODO: send a correct PNG????
            // TODO: send a correct PNG????
            // TODO: send a correct PNG????
            // TODO: send a correct PNG????
            // TODO: send a correct PNG????
            return "";
        }
        const rt = scene.make.renderTexture({}, false);
        try {
            for (const { sprite, frame } of sprites) {
                if (frame) {
                    sprite.setFrame(frame);
                }
                rt.draw(sprite, sprite.displayWidth * 0.5, sprite.displayHeight * 0.5);
            }
            return new Promise<string>((resolve, reject) => {
                try {
                    rt.snapshot(
                        (url) => {
                            if (url instanceof HTMLImageElement) {
                                resolve(url.src);
                            } else {
                                console.error("Unexpected color object received for snapshot", url);
                                resolve("");
                            }
                            rt.destroy();
                        },
                        "image/png",
                        1
                    );
                } catch (error) {
                    rt.destroy();
                    reject(asError(error));
                }
            });
        } catch (error) {
            rt.destroy();
            throw new Error("Could not get the snapshot: " + error);
        }
    }

    public static createFloorRectangleTexture(
        scene: Phaser.Scene,
        newTextureKey: string,
        width: number,
        height: number,
        sourceTextureKey: string,
        sourceTextureFrame?: number | string,
        sourceTextureWidth = 32,
        sourceTextureHeight = 32
    ): void {
        const rt = scene.make.renderTexture({ x: 0, y: 0, width, height }, false);
        const widthTiles = Math.ceil(width / sourceTextureWidth);
        const heightTiles = Math.ceil(height / sourceTextureHeight);

        for (let x = 0; x < widthTiles; x += 1) {
            for (let y = 0; y < heightTiles; y += 1) {
                rt.drawFrame(sourceTextureKey, sourceTextureFrame, x * 32, y * 32);
            }
        }

        rt.saveTexture(newTextureKey);
        rt.destroy();
    }

    public static createRectangleTexture(
        scene: Phaser.Scene,
        textureKey: string,
        width: number,
        height: number,
        color: number
    ): void {
        const rectangleTexture = scene.add.graphics().fillStyle(color, 1).fillRect(0, 0, width, height);
        rectangleTexture.generateTexture(textureKey, width, height);
        rectangleTexture.destroy();
    }

    public static createCircleTexture(
        scene: Phaser.Scene,
        textureKey: string,
        radius: number,
        color: number,
        outlineColor?: number,
        outlineThickness?: number
    ): void {
        const circleTexture = scene.add.graphics().fillStyle(color, 1).fillCircle(radius, radius, radius);
        if (outlineColor) {
            circleTexture.lineStyle(outlineThickness ?? 1, outlineColor).strokeCircle(radius, radius, radius);
        }
        circleTexture.generateTexture(textureKey, radius * 2, radius * 2);
        circleTexture.destroy();
    }

    public static async loadEntityImage(scene: Phaser.Scene, key: string, url: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (scene.textures.exists(key)) {
                resolve();
            }
            scene.load.once(`filecomplete-image-${key}`, () => {
                resolve();
            });
            scene.load.image(key, url);
            scene.load.start();
        });
    }
}
