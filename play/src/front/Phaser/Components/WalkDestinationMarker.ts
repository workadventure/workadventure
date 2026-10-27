import * as Phaser from "phaser";
import type { GameScene } from "../Game/GameScene";

const COLOR = 0x3d5afe;
const OUTLINE = 0xffffff;
/** Ring width on screen, in CSS pixels: zoomed out, the marker keeps that size so it stays visible. */
const RING_WIDTH = 36;
/** Zoomed in, the ring never gets narrower than a 32 px map object (one tile). */
const MIN_RING_WIDTH_IN_MAP_PIXELS = 32;

/**
 * Ripples on the floor where the local player's avatar is walking to. Other players don't see it.
 */
export class WalkDestinationMarker {
    private readonly container: Phaser.GameObjects.Container;
    private readonly ripples: Phaser.Tweens.Tween[];
    private walk = 0;

    constructor(private readonly scene: GameScene) {
        const ring = () =>
            scene.add
                .graphics()
                .lineStyle(4.5, OUTLINE)
                .strokeEllipse(0, 0, RING_WIDTH, RING_WIDTH / 2)
                .lineStyle(2.5, COLOR)
                .strokeEllipse(0, 0, RING_WIDTH, RING_WIDTH / 2);
        const rings = [ring(), ring()];
        const dot = scene.add
            .graphics()
            .fillStyle(COLOR)
            .fillEllipse(0, 0, 8, 4)
            .lineStyle(1, OUTLINE)
            .strokeEllipse(0, 0, 8, 4);
        // On the floor: above the ground tile layers (depth -2), below avatars and furniture (sorted by y from 0).
        this.container = scene.add
            .container(0, 0, [...rings, dot])
            .setDepth(-1)
            .setVisible(false);
        this.ripples = rings.map((target, index) =>
            scene.tweens.add({
                targets: target,
                scale: { from: 0.25, to: 1.5 },
                alpha: { from: 1, to: 0 },
                duration: 1400,
                delay: index * 700,
                ease: "Cubic.easeOut",
                repeat: -1,
                paused: true,
            }),
        );
    }

    /** Shows the marker at the end of a new walk, and returns that walk's id for hide(). */
    public show(destination: { x: number; y: number }): number {
        this.walk += 1;
        this.container.setPosition(destination.x, destination.y);
        if (!this.container.visible) {
            this.container.setVisible(true);
            this.ripples.forEach((ripple) => ripple.restart());
            this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.onUpdate);
        }
        return this.walk;
    }

    /** Hides the marker when a walk ends, unless a later walk has taken it over. */
    public hide(walk: number): void {
        if (walk !== this.walk || !this.container.visible) return;
        this.container.setVisible(false);
        this.ripples.forEach((ripple) => ripple.pause());
        this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.onUpdate);
        this.scene.markDirty();
    }

    public destroy(): void {
        this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.onUpdate);
        this.ripples.forEach((ripple) => ripple.remove());
        this.container.destroy();
    }

    private readonly onUpdate = (): void => {
        // Map pixels per CSS pixel on screen: scaling by it keeps the marker's size on screen.
        const mapPixelsPerCssPixel = this.scene.scale.displayScale.x / this.scene.cameras.main.zoom;
        this.container.setScale(Math.max(mapPixelsPerCssPixel, MIN_RING_WIDTH_IN_MAP_PIXELS / RING_WIDTH));
        // The scene only redraws when something marks it dirty, and the rings move every frame.
        this.scene.markDirty();
    };
}
