export class TexturesHelper {
    public static async getSnapshot(
        scene: Phaser.Scene,
        ...sprites: { sprite: Phaser.GameObjects.Sprite; frame?: string | number }[]
    ): Promise<string> {
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
                            resolve((url as HTMLImageElement).src);
                            rt.destroy();
                        },
                        "image/png",
                        1
                    );
                } catch (error) {
                    rt.destroy();
                    reject(error);
                }
            });
        } catch (error) {
            rt.destroy();
            throw new Error("Could not get the snapshot");
        }
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
}
