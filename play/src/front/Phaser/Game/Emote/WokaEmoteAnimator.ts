import * as Phaser from "phaser";
import type { WokaEmoteDefinition } from "./WokaEmoteCatalog";
import { sampleWokaEmote } from "./WokaEmoteCatalog";
import { feetAnchoredOffset } from "./WokaEmoteGeometry";

import Sprite = Phaser.GameObjects.Sprite;

/**
 * Plays one animated Woka emote by transforming the character's layer sprites every tick.
 *
 * The layers are transformed, never the Character container itself: the container's position is the
 * player's actual position in the world, and moving it would drag the name tag, the speech bubble
 * and the physics body along with it.
 */
export class WokaEmoteAnimator {
    private elapsed = 0;
    private finished = false;
    private readonly onSceneUpdate: (time: number, delta: number) => void;

    constructor(
        private readonly scene: Phaser.Scene & { markDirty: () => void },
        private readonly sprites: Map<string, Sprite>,
        public readonly definition: WokaEmoteDefinition,
        private readonly onComplete: () => void,
    ) {
        this.onSceneUpdate = (_time: number, delta: number) => this.step(delta);
    }

    public start(): void {
        // The walk/idle animation would keep rewriting the frame we are about to set.
        for (const sprite of this.sprites.values()) {
            sprite.anims.stop();
        }
        this.step(0);
        this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.onSceneUpdate);
    }

    private step(delta: number): void {
        if (this.finished) {
            return;
        }
        this.elapsed += delta;
        const state = sampleWokaEmote(this.definition, this.elapsed);
        const offset = feetAnchoredOffset(state);

        for (const sprite of this.sprites.values()) {
            sprite.setFrame(state.frame);
            sprite.setPosition(offset.x, offset.y);
            sprite.setScale(state.scaleX, state.scaleY);
            sprite.setAngle(state.angle);
        }
        // The scene only renders when something marked it dirty, and it does not track animations
        // of sprites living inside a container.
        this.scene.markDirty();

        if (this.elapsed >= this.definition.duration) {
            this.finished = true;
            this.onComplete();
        }
    }

    /** Removes the tick handler and puts the layer sprites back where the walk animation expects them. */
    public destroy(): void {
        this.finished = true;
        this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.onSceneUpdate);
        for (const sprite of this.sprites.values()) {
            sprite.setPosition(0, 0);
            sprite.setScale(1, 1);
            sprite.setAngle(0);
        }
        this.scene.markDirty();
    }
}
