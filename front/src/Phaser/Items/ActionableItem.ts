/**
 * An actionable item represents an in-game object that can be activated using the space-bar.
 * It has coordinates and an "activation radius"
 */
import Sprite = Phaser.GameObjects.Sprite;
import {OutlinePipeline} from "../Shaders/OutlinePipeline";

export class ActionableItem {
    private readonly activationRadiusSquared : number;
    private isSelectable: boolean = false;

    public constructor(private sprite: Sprite, private activationRadius: number) {
        this.activationRadiusSquared = activationRadius * activationRadius;
    }

    /**
     * Returns the square of the distance to the object center IF we are in item action range
     * OR null if we are out of range.
     */
    public actionableDistance(x: number, y: number): number|null {
        const distanceSquared = (x - this.sprite.x)*(x - this.sprite.x) + (y - this.sprite.y)*(y - this.sprite.y);
        if (distanceSquared < this.activationRadiusSquared) {
            return distanceSquared;
        } else {
            return null;
        }
    }

    /**
     * Show the outline of the sprite.
     */
    public selectable(): void {
        if (this.isSelectable) {
            return;
        }
        this.isSelectable = true;
        this.sprite.setPipeline(OutlinePipeline.KEY);
        this.sprite.pipeline.setFloat2('uTextureSize',
            this.sprite.texture.getSourceImage().width, this.sprite.texture.getSourceImage().height);
    }

    /**
     * Hide the outline of the sprite
     */
    public notSelectable(): void {
        if (!this.isSelectable) {
            return;
        }
        this.isSelectable = false;
        this.sprite.resetPipeline();
    }

    /**
     * Triggered when the "space" key is pressed and the object is in range of being activated.
     */
    public activate(): void {

    }
}

