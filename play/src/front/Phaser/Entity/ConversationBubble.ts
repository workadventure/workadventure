import * as Phaser from "phaser";
import type { GameScene } from "../Game/GameScene";
import { DEPTH_CONVERSATION_BUBBLE_INDEX } from "../Game/DepthIndexes";
import { MINIMUM_DISTANCE } from "../../Enum/EnvironmentVariable";
import type { Character } from "./Character";
import { RemotePlayer } from "./RemotePlayer";

import Graphics = Phaser.GameObjects.Graphics;
import Vector2 = Phaser.Math.Vector2;
import Linear = Phaser.Math.Linear;
import Spline = Phaser.Curves.Spline;

/** A very small interface for whatever "player" object you use.
 *  Adapt or extend as needed. */
export interface Avatar {
    x: number; // world X
    y: number; // world Y
    inside: boolean; // true ⇢ avatar is already in the conversation
}

/** Jelly-like circle that bulges / dimples toward or away from avatars. */
export class ConversationBubble extends Graphics {
    // ==== Tunables =========================================================
    private readonly R0 = MINIMUM_DISTANCE; // resting radius (px)
    private readonly lambda = 40; // fall-off distance for influence (px)
    private readonly kInside = 2; // angular sharpness of the bump from players inside the bubble
    private readonly kOutside = 20; // angular sharpness of the bump from players outside the bubble
    private readonly amp = 20; // max deformation per avatar (px)
    private readonly segments = 64; // angular samples (higher = smoother)
    private readonly speed = 0.1; // If set to 1, the bubble size instantly matches the avatars position. Set between 0 and 1 to have a smooth transition.
    private readonly stopAnimationThreshold = 0.1; // As long as one of the radii changes more than this value, the bubble is considered animating.
    private readonly influenceRadius = this.R0 + this.lambda * 2;
    private readonly influenceRadiusSquared = this.influenceRadius * this.influenceRadius;

    // ==== Internal state ===================================================
    private center = new Vector2();
    private radii = new Array<number>(this.segments).fill(this.R0);
    private gameScene: GameScene;
    private locked: boolean;
    private userIds: number[];

    // Whether the bubble is currently wobbling
    private _isAnimating: boolean = true;
    private _needsStep: boolean = true;

    constructor(scene: GameScene, x: number, y: number, locked: boolean, userIds: number[]) {
        super(scene, { x, y });
        this.gameScene = scene;
        scene.add.existing(this);
        this.center.set(x, y);
        this.setDepth(DEPTH_CONVERSATION_BUBBLE_INDEX); // draw above the map
        this.locked = locked;
        this.userIds = userIds;

        // Generate initial texture
        this.drawSpline();
    }

    public updateUsers(userIds: number[]): void {
        this.userIds = userIds;
        this._needsStep = true;
    }

    public getInfluenceRadius(): number {
        return this.influenceRadius;
    }

    public containsUserId(userId: number): boolean {
        return this.userIds.includes(userId);
    }

    public getUserIds(): readonly number[] {
        return this.userIds;
    }

    public turnInAvatar(character: Character): Avatar | undefined {
        let userId: number;
        if (character instanceof RemotePlayer) {
            userId = character.userId;
        } else {
            // This is the current player
            const currentUserId = this.gameScene.connection?.getUserId();
            if (currentUserId === undefined) {
                console.warn("ConversationBubble: No user ID found for the current player.");
                return undefined; // No user ID available
            }
            userId = currentUserId;
        }

        if (this.userIds.includes(userId)) {
            return {
                x: character.x,
                y: character.y,
                inside: true, // assume all listed players are inside the bubble
            };
        } else {
            // Is the player close enough to be considered?
            const dx = character.x - this.center.x;
            const dy = character.y - this.center.y;
            const dist = dx * dx + dy * dy;
            if (dist < this.influenceRadiusSquared) {
                return {
                    x: character.x,
                    y: character.y,
                    inside: false, // outside the bubble
                };
            }
        }
        return undefined; // not an avatar to be considered
    }

    /** Call once per frame with the avatars that might affect this bubble. */
    public step(avatars: Avatar[]): void {
        this._needsStep = false;
        this._isAnimating = false; // reset animation state
        this.updateCenterFromInsideAvatars(avatars);

        // Per-avatar terms do not depend on the segment: compute them once, not once per segment.
        const influences = avatars.map((av) => {
            const dx = av.x - this.center.x;
            const dy = av.y - this.center.y;
            // signed distance to the resting boundary
            const dBoundary = Math.hypot(dx, dy) - this.R0;
            // ±amp depending on whether avatar is inside or out
            const A = av.inside ? +this.amp : -this.amp;
            return {
                φ: Math.atan2(dy, dx),
                weight: ((A * Math.exp(-Math.abs(dBoundary) / this.lambda)) / avatars.length) * 2,
                inside: av.inside,
            };
        });

        /* --- 1.  Update radius samples ----------------------------------- */
        for (let s = 0; s < this.segments; s++) {
            const θ = (s / this.segments) * Math.PI * 2;
            let targetR = this.R0;

            for (const influence of influences) {
                targetR += influence.weight * this.angularFalloff(θ - influence.φ, influence.inside);
            }

            /* --- 2.  Dampen changes with simple lerp for a jelly feel ---- */
            const newRadius = Linear(this.radii[s], targetR, this.speed);
            if (Math.abs(newRadius - this.radii[s]) > this.stopAnimationThreshold) {
                this._isAnimating = true; // mark as animating if there's a significant change
            }
            this.radii[s] = newRadius;
            //this.radii[s] = targetR;
        }

        /* --- 3.  Redraw -------------------------------------------------- */
        this.drawSpline();
        this.gameScene.markDirty();
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    /** Cosine lobe clamped to zero and sharpened by k. */
    private angularFalloff(delta: number, isInside: boolean): number {
        const c = Math.cos(delta);
        return c <= 0 ? 0 : Math.pow(c, isInside ? this.kInside : this.kOutside);
    }

    private updateCenterFromInsideAvatars(avatars: Avatar[]): void {
        let x = 0;
        let y = 0;
        let count = 0;

        for (const avatar of avatars) {
            if (!avatar.inside) {
                continue;
            }

            x += avatar.x;
            y += avatar.y;
            count++;
        }

        if (count === 0) {
            return;
        }

        this.center.set(x / count, y / count);
        this.setPosition(this.center.x, this.center.y);
    }

    /**
     * Build Catmull-Rom spline and redraw it in place (local coordinates, relative to the center).
     * Redrawing a Graphics is cheap; generating a texture every frame meant a canvas + a GPU upload per bubble.
     */
    private drawSpline(): void {
        if (!this.scene.renderer) {
            // In case we don't have a renderer at all (bots, etc...), no need to render the bubble.
            return;
        }

        // Convert polar samples to Cartesian points
        const pts: Vector2[] = [];
        for (let s = 0; s < this.segments; s++) {
            const θ = (s / this.segments) * Math.PI * 2;
            const r = this.radii[s];
            pts.push(new Vector2(r * Math.cos(θ), r * Math.sin(θ)));
        }

        // Create a spline and oversample for smoothness
        const smooth = new Spline(pts).getSpacedPoints(this.segments * 2);

        this.clear();

        // Apply style based on locked status
        if (this.locked) {
            this.fillStyle(0xff0000, 0.25); // solid fill
            this.lineStyle(1, 0xff0000, 1); // crisp outline
        } else {
            this.fillStyle(0xffffff, 0.25); // semi-transparent fill
            this.lineStyle(1, 0xffffff, 0.9); // crisp outline
        }

        this.beginPath();
        this.moveTo(smooth[0].x, smooth[0].y);
        for (let i = 1; i < smooth.length; i++) {
            this.lineTo(smooth[i].x, smooth[i].y);
        }
        this.closePath();
        this.fillPath();
        this.strokePath();
    }

    // -----------------------------------------------------------------------
    // Optional utilities
    // -----------------------------------------------------------------------

    public setLocked(locked: boolean): void {
        // Called on every group update from the server (several times per second): only redraw on a real change.
        if (this.locked === locked) {
            return;
        }
        this.locked = locked;
        this.drawSpline(); // redraw with new style
    }

    /** Convenience: call inside the scene's update loop. */
    public preUpdate(time: number, delta: number): void {
        // Intentionally empty – you can override if you prefer
    }

    public get isAnimating(): boolean {
        return this._isAnimating;
    }

    public get needsStep(): boolean {
        return this._needsStep;
    }
}
