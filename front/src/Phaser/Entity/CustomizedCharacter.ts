import Container = Phaser.GameObjects.Container;
import Sprite = Phaser.GameObjects.Sprite;
import type { Scene } from "phaser";

/**
 * A sprite of a customized character (used in the Customize Scene only)
 */
export class CustomizedCharacter extends Container {
    public constructor(scene: Scene, x: number, y: number, layers: string[]) {
        super(scene, x, y);
        this.updateSprites(layers);
    }

    public updateSprites(layers: string[]): void {
        this.removeAll(true);
        for (const layer of layers) {
            this.add(new Sprite(this.scene, 0, 0, layer));
        }
    }
}
