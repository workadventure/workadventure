import Container = Phaser.GameObjects.Container;
import {Scene} from "phaser";
import GameObject = Phaser.GameObjects.GameObject;
import Rectangle = Phaser.GameObjects.Rectangle;


export class SoundMeterSprite extends Container {
    private rectangles: Rectangle[] = new Array<Rectangle>();
    private static readonly NB_BARS = 20;

    constructor(scene: Scene, x?: number, y?: number, children?: GameObject[]) {
        super(scene, x, y, children);

        for (let i = 0; i < SoundMeterSprite.NB_BARS; i++) {
            const rectangle = new Rectangle(scene, i * 13, 0, 10, 20, (Math.round(255 - i * 255 / SoundMeterSprite.NB_BARS) << 8) + (Math.round(i * 255 / SoundMeterSprite.NB_BARS) << 16));
            this.add(rectangle);
            this.rectangles.push(rectangle);
        }
    }

    /**
     * A number between 0 and 100
     *
     * @param volume
     */
    public setVolume(volume: number): void {

        const normalizedVolume = volume / 100 * SoundMeterSprite.NB_BARS;
        for (let i = 0; i < SoundMeterSprite.NB_BARS; i++) {
            if (normalizedVolume < i) {
                this.rectangles[i].alpha = 0.5;
            } else {
                this.rectangles[i].alpha = 1;
            }
        }
    }

    public getWidth(): number {
        return SoundMeterSprite.NB_BARS * 13;
    }



}
