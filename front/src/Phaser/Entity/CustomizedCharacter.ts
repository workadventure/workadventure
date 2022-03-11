import Container = Phaser.GameObjects.Container;
import type { Scene } from "phaser";
import Sprite = Phaser.GameObjects.Sprite;
import { getPlayerAnimations, PlayerAnimationDirections, PlayerAnimationTypes } from "../Player/Animation";

/**
 * A sprite of a customized character (used in the Customize Scene only)
 */
export class CustomizedCharacter extends Container {
    private sprites: Phaser.GameObjects.Sprite[];

    public constructor(scene: Scene, x: number, y: number, layers: string[]) {
        super(scene, x, y);
        this.sprites = [];
        this.updateSprites(layers);
    }

    public updateSprites(layers: string[]): void {
        this.sprites = [];
        this.removeAll(true);
        for (const texture of layers) {
            const newSprite = new Sprite(this.scene, 0, 0, texture);
            this.sprites.push(newSprite);
        }
        this.add(this.sprites);
    }
}
