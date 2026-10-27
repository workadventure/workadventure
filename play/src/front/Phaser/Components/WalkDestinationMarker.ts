import * as Phaser from "phaser";
import type { GameScene } from "../Game/GameScene";

/** The theme's primary colour when the room doesn't set one (same default as the loading screen). */
const DEFAULT_PRIMARY_COLOR = "#4056F6";
/** Ring width on screen, in CSS pixels: zoomed out, the marker keeps that size so it stays visible. */
const RING_WIDTH = 36;
/** Zoomed in, the ring never gets narrower than a 32 px map object (one tile). */
const MIN_RING_WIDTH_IN_MAP_PIXELS = 32;
const DASHES = 6;

/**
 * A dashed ring on the floor that spins inward and locks onto the spot the local player's avatar is walking to.
 * Other players don't see it.
 */
export class WalkDestinationMarker {
    private readonly container: Phaser.GameObjects.Container;
    private readonly lockOn: Phaser.Tweens.Tween;
    private walk = 0;

    constructor(private readonly scene: GameScene) {
        // A dashed circle, squashed to half its height below so it lies on the floor. Rotating the circle inside
        // that squash makes the dashes run around the ring (Phaser has no dashed lines: each dash is an arc).
        // No white outline: the game draws at its own pixel resolution and scales up, which turns a thin outline
        // into a speckled halo around the dashes.
        const color = Phaser.Display.Color.ValueToColor(scene.room.primaryColor ?? DEFAULT_PRIMARY_COLOR).color;
        const ring = scene.add.graphics().lineStyle(3, color);
        for (let dash = 0; dash < DASHES; dash++) {
            const start = (dash * 2 * Math.PI) / DASHES;
            ring.beginPath()
                .arc(0, 0, RING_WIDTH / 2, start, start + (0.6 * 2 * Math.PI) / DASHES)
                .strokePath();
        }
        const floor = scene.add.container(0, 0, [ring]).setScale(1, 0.5);
        const dot = scene.add.graphics().fillStyle(color).fillEllipse(0, 0, 8, 4);
        // On the floor: above the ground tile layers (depth -2), below avatars and furniture (sorted by y from 0).
        this.container = scene.add.container(0, 0, [floor, dot]).setDepth(-1).setVisible(false);
        // Each loop: fade in at twice the size and close in to the ring's size (so the resting ring keeps the minimum
        // width) around the dot, while turning a quarter turn at a steady pace.
        this.lockOn = scene.tweens.addCounter({
            from: 0,
            to: 1,
            duration: 1600,
            repeat: -1,
            paused: true,
            onUpdate: (tween) => {
                const progress = tween.getValue() ?? 0;
                const closing = Phaser.Math.Easing.Cubic.Out(Math.min(progress / 0.7, 1));
                ring.setScale(2 - closing)
                    .setRotation((progress * Math.PI) / 2)
                    .setAlpha(Math.min(progress / 0.25, 1));
            },
        });
    }

    /** Shows the marker at the end of a new walk, and returns that walk's id for hide(). */
    public show(destination: { x: number; y: number }): number {
        this.walk += 1;
        this.container.setPosition(destination.x, destination.y);
        if (!this.container.visible) {
            this.container.setVisible(true);
            this.lockOn.restart();
            this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.onUpdate);
        }
        return this.walk;
    }

    /** Hides the marker when a walk ends, unless a later walk has taken it over. */
    public hide(walk: number): void {
        if (walk !== this.walk || !this.container.visible) return;
        this.container.setVisible(false);
        this.lockOn.pause();
        this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.onUpdate);
        this.scene.markDirty();
    }

    public destroy(): void {
        this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.onUpdate);
        this.lockOn.remove();
        this.container.destroy();
    }

    private readonly onUpdate = (): void => {
        // Map pixels per CSS pixel on screen: scaling by it keeps the marker's size on screen.
        const mapPixelsPerCssPixel = this.scene.scale.displayScale.x / this.scene.cameras.main.zoom;
        this.container.setScale(Math.max(mapPixelsPerCssPixel, MIN_RING_WIDTH_IN_MAP_PIXELS / RING_WIDTH));
        // The scene only redraws when something marks it dirty, and the ring moves every frame.
        this.scene.markDirty();
    };
}
