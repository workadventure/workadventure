import Phaser from "phaser";
import { GameScene } from "../Game/GameScene";
import { Character } from "./Character";
import { RemotePlayer } from "./RemotePlayer";

/** A very small interface for whatever “player” object you use.
 *  Adapt or extend as needed. */
export interface Avatar {
    x: number; // world X
    y: number; // world Y
    inside: boolean; // true ⇢ avatar is already in the conversation
}

/** Jelly-like circle that bulges / dimples toward or away from avatars. */
export class ConversationBubble extends Phaser.GameObjects.Graphics {
    // ==== Tunables =========================================================
    private readonly R0 = 64; // resting radius (px)
    private readonly lambda = 40; // fall-off distance for influence (px)
    private readonly k = 2; // angular sharpness of the bump
    private readonly amp = 20; // max deformation per avatar (px)
    private readonly segments = 64; // angular samples (higher = smoother)

    // ==== Internal state ===================================================
    private center = new Phaser.Math.Vector2();
    private radii = new Array<number>(this.segments).fill(this.R0);
    private gameScene: GameScene;

    constructor(scene: GameScene, x: number, y: number, private locked: boolean, private userIds: number[]) {
        super(scene);
        this.gameScene = scene;
        scene.add.existing(this);
        this.center.set(x, y);
        this.setDepth(5); // draw above the map
    }

    public updateUsers(userIds: number[]): void {
        this.userIds = userIds;
        this.drawSpline();
    }

    private getAvatarsList(): Avatar[] {
        const avatars: Avatar[] = [];

        for (const remotePlayer of this.gameScene.MapPlayersByKey.values()) {
            const avatar = this.turnInAvatar(remotePlayer);
            if (avatar) {
                avatars.push(avatar);
            }
        }

        const currentPlayerAvatar = this.turnInAvatar(this.gameScene.CurrentPlayer);
        if (currentPlayerAvatar) {
            avatars.push(currentPlayerAvatar);
        }

        return avatars;
    }

    private turnInAvatar(character: Character): Avatar | undefined {
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
            const dist = /*Math.hypot(dx, dy)*/ dx + dy; // using an approximation of distance for performance
            if (dist < this.R0 + this.lambda * 2) {
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
    public step(): void {
        const avatars = this.getAvatarsList();

        /* --- 1.  Update radius samples ----------------------------------- */
        for (let s = 0; s < this.segments; s++) {
            const θ = (s / this.segments) * Math.PI * 2;
            let targetR = this.R0;

            for (const av of avatars) {
                const dx = av.x - this.center.x;
                const dy = av.y - this.center.y;
                const dist = Math.hypot(dx, dy);
                const φ = Math.atan2(dy, dx);

                // signed distance to the resting boundary
                const dBoundary = dist - this.R0;

                // ±amp depending on whether avatar is inside or out
                const A = av.inside ? +this.amp : -this.amp;

                targetR += A * Math.exp(-Math.abs(dBoundary) / this.lambda) * this.angularFalloff(θ - φ);
            }

            /* --- 2.  Dampen changes with simple lerp for a jelly feel ---- */
            this.radii[s] = Phaser.Math.Linear(this.radii[s], targetR, 0.15);
        }

        /* --- 3.  Redraw -------------------------------------------------- */
        this.drawSpline();
        this.gameScene.markDirty();
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    /** Cosine lobe clamped to zero and sharpened by k. */
    private angularFalloff(delta: number): number {
        const c = Math.cos(delta);
        return c <= 0 ? 0 : Math.pow(c, this.k);
    }

    /** Build Catmull-Rom spline, fill & stroke it. */
    private drawSpline(): void {
        // Convert polar samples to Cartesian points
        const pts: Phaser.Math.Vector2[] = [];
        for (let s = 0; s < this.segments; s++) {
            const θ = (s / this.segments) * Math.PI * 2;
            const r = this.radii[s];
            pts.push(new Phaser.Math.Vector2(this.center.x + r * Math.cos(θ), this.center.y + r * Math.sin(θ)));
        }

        // Create a spline and oversample for smoothness
        const spline = new Phaser.Curves.Spline(pts);
        const smooth = spline.getSpacedPoints(this.segments * 2);

        // Clear old drawing and paint the new shape
        this.clear();
        if (this.locked) {
            this.fillStyle(0xff0000, 0.25); // solid fill
            this.lineStyle(2, 0xff0000, 1); // crisp outline
        } else {
            this.fillStyle(0x5ea8ff, 0.25); // semi-transparent fill
            this.lineStyle(2, 0x5ea8ff, 0.9); // crisp outline
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

    /** Move the whole bubble (e.g. follow the group’s centroid). */
    public setCenter(x: number, y: number): void {
        this.center.set(x, y);
    }

    public setLocked(locked: boolean): void {
        this.locked = locked;
        this.drawSpline(); // redraw with new style
    }

    /** Convenience: call inside the scene’s update loop. */
    public preUpdate(time: number, delta: number): void {
        // Intentionally empty – you can override if you prefer
    }
}
