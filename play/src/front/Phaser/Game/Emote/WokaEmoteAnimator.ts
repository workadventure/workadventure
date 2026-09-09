import * as Phaser from "phaser";
import type { WokaEmoteDefinition, WokaEmoteParticleSpec } from "./WokaEmoteCatalog";
import { sampleWokaEmote } from "./WokaEmoteCatalog";
import { FEET_OFFSET, feetAnchoredOffset } from "./WokaEmoteGeometry";
import { buildGlyphSvg } from "./WokaEmoteGlyphs";

import Sprite = Phaser.GameObjects.Sprite;
import Container = Phaser.GameObjects.Container;
import DOMElement = Phaser.GameObjects.DOMElement;
import Graphics = Phaser.GameObjects.Graphics;

interface Particle {
    element: DOMElement;
    x: number;
    y: number;
    velocityX: number;
    velocityY: number;
    gravity: number;
    age: number;
    life: number;
}

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

    private readonly particles: Particle[] = [];
    /** Cycles the confetti through the palette instead of drawing them all the same colour. */
    private spawnCount = 0;
    private readonly firedBatches = new Set<string>();
    private ground: Graphics | undefined;

    constructor(
        private readonly scene: Phaser.Scene & { markDirty: () => void },
        private readonly sprites: Map<string, Sprite>,
        private readonly container: Container,
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
        this.createGround();
        this.step(0);
        this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.onSceneUpdate);
    }

    private step(delta: number): void {
        if (this.finished) {
            return;
        }
        const previous = this.elapsed;
        this.elapsed += delta;
        this.emitParticles(previous, this.elapsed);
        this.moveParticles(delta);
        this.stepGround();
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

    /**
     * Creates the floor mark and slips it under the layer sprites. It is added at index 0 so the
     * Woka stands on it rather than behind it.
     */
    private createGround(): void {
        const spec = this.definition.ground;
        if (!spec) {
            return;
        }
        const graphics = new Graphics(this.scene);
        graphics.setPosition(0, spec.offsetY ?? FEET_OFFSET);
        this.container.addAt(graphics, 0);
        this.ground = graphics;
    }

    private stepGround(): void {
        const spec = this.definition.ground;
        if (!spec || !this.ground) {
            return;
        }
        const state = spec.sample(Math.min(Math.max(this.elapsed, 0), this.definition.duration));
        const turn = state.angle ?? 0;
        // The ring lies flat on the floor: it turns in the floor plane, and only then is squashed
        // to screen because the map is not seen from directly above. Phaser scales before it
        // rotates, so setAngle() would tilt the flattened ellipse instead of spinning it flat —
        // the turn is baked into the path and the transform is left to do the squashing alone.
        this.ground.clear();
        this.ground.lineStyle(spec.thickness ?? 1, spec.color, 1);
        for (const [from, to] of spec.arcs) {
            this.ground.beginPath();
            this.ground.arc(0, 0, spec.radius, Phaser.Math.DegToRad(from + turn), Phaser.Math.DegToRad(to + turn));
            this.ground.strokePath();
        }
        const size = state.scale ?? 1;
        this.ground.setScale(size, size * (spec.flatten ?? 0.42));
        this.ground.setAlpha(state.alpha ?? 1);
    }

    private emitParticles(from: number, to: number): void {
        for (const [index, spec] of (this.definition.particles ?? []).entries()) {
            if (spec.at) {
                for (const instant of spec.at) {
                    const key = `${index}@${instant}`;
                    if (instant >= from && instant < to && !this.firedBatches.has(key)) {
                        this.firedBatches.add(key);
                        this.spawnBatch(spec);
                    }
                }
                continue;
            }
            // Nothing is emitted that would still be floating when the body is done: the Woka would
            // stand frozen on its last frame waiting for a glyph to fade.
            if (!spec.everyMs || to + spec.life > this.definition.duration) {
                continue;
            }
            if (Math.floor(to / spec.everyMs) !== Math.floor(from / spec.everyMs)) {
                this.spawnBatch(spec);
            }
        }
    }

    private spawnBatch(spec: WokaEmoteParticleSpec): void {
        for (let i = 0; i < spec.count; i++) {
            const span = document.createElement("span");
            // The markup is built from the glyph tables alone; nothing a remote player sent reaches it.
            span.innerHTML = buildGlyphSvg(spec.glyph, this.spawnCount++);
            const element = new DOMElement(this.scene, 0, 0, span, "z-index:10;pointer-events:none;");
            this.container.add(element);
            this.particles.push({
                element,
                x: (Math.random() - 0.5) * spec.spread,
                y: -(spec.originY ?? 18),
                velocityX: (Math.random() - 0.5) * 2 * (spec.drift ?? 0),
                velocityY: spec.riseSpeed * (0.7 + Math.random() * 0.6),
                gravity: spec.gravity ?? 0,
                age: 0,
                life: spec.life,
            });
        }
    }

    private moveParticles(delta: number): void {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.age += delta;
            if (particle.age >= particle.life) {
                particle.element.destroy();
                this.particles.splice(i, 1);
                continue;
            }
            particle.velocityY += particle.gravity * delta;
            particle.x += particle.velocityX * delta;
            particle.y += particle.velocityY * delta;
            particle.element.setPosition(particle.x, particle.y);
            particle.element.setAlpha(1 - Math.pow(particle.age / particle.life, 2));
        }
    }

    /** Removes the tick handler and puts the layer sprites back where the walk animation expects them. */
    public destroy(): void {
        this.finished = true;
        this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.onSceneUpdate);
        for (const particle of this.particles) {
            particle.element.destroy();
        }
        this.particles.length = 0;
        this.ground?.destroy();
        this.ground = undefined;
        for (const sprite of this.sprites.values()) {
            sprite.setPosition(0, 0);
            sprite.setScale(1, 1);
            sprite.setAngle(0);
        }
        this.scene.markDirty();
    }
}
