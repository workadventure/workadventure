import Phaser from "phaser";
import { GameScene } from "../Game/GameScene";
import { DEPTH_CONVERSATION_BUBBLE_INDEX } from "../Game/DepthIndexes";
import { Character } from "./Character";
import { RemotePlayer } from "./RemotePlayer";

/** A very small interface for whatever "player" object you use.
 *  Adapt or extend as needed. */
export interface Avatar {
    x: number; // world X
    y: number; // world Y
    inside: boolean; // true ⇢ avatar is already in the conversation
}

/** Jelly-like circle that bulges / dimples toward or away from avatars. */
export class ConversationBubble extends Phaser.GameObjects.Sprite {
    // ==== Tunables =========================================================
    private readonly R0 = 64; // resting radius (px)
    private readonly lambda = 40; // fall-off distance for influence (px)
    private readonly kInside = 2; // angular sharpness of the bump from players inside the bubble
    private readonly kOutside = 20; // angular sharpness of the bump from players outside the bubble
    private readonly amp = 20; // max deformation per avatar (px)
    private readonly segments = 64; // angular samples (higher = smoother)
    private readonly speed = 0.1; // If set to 1, the bubble size instantly matches the avatars position. Set between 0 and 1 to have a smooth transition.
    private readonly stopAnimationThreshold = 0.1; // As long as one of the radii changes more than this value, the bubble is considered animating.

    // ==== Internal state ===================================================
    private center = new Phaser.Math.Vector2();
    private radii = new Array<number>(this.segments).fill(this.R0);
    private gameScene: GameScene;
    private locked: boolean;
    private userIds: number[];

    // Texture handling
    private generatedTextureKey: string | null = null;
    // Whether the bubble is currently wobbling
    private _isAnimating: boolean = true;

    constructor(scene: GameScene, x: number, y: number, locked: boolean, userIds: number[]) {
        super(scene, x, y, "");
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
            const dist = dx + dy; // using an approximation of distance for performance
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

        this._isAnimating = false; // reset animation state

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

                targetR +=
                    ((A * Math.exp(-Math.abs(dBoundary) / this.lambda) * this.angularFalloff(θ - φ, av.inside)) /
                        avatars.length) *
                    2;
            }

            /* --- 2.  Dampen changes with simple lerp for a jelly feel ---- */
            const newRadius = Phaser.Math.Linear(this.radii[s], targetR, this.speed);
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

    /**
     * Build Catmull-Rom spline, create texture from it and apply to sprite.
     */
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

        // Calculate bounding box
        let minX = Number.MAX_VALUE;
        let minY = Number.MAX_VALUE;
        let maxX = Number.MIN_VALUE;
        let maxY = Number.MIN_VALUE;

        for (const point of smooth) {
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
        }

        const width = Math.ceil(maxX - minX);
        const height = Math.ceil(maxY - minY);

        // Create temporary graphics object to draw the shape
        const tempGraphics = this.scene.add.graphics();

        // Apply style based on locked status
        if (this.locked) {
            tempGraphics.fillStyle(0xff0000, 0.25); // solid fill
            tempGraphics.lineStyle(1, 0xff0000, 1); // crisp outline
        } else {
            tempGraphics.fillStyle(0xffffff, 0.25); // semi-transparent fill
            tempGraphics.lineStyle(1, 0xffffff, 0.9); // crisp outline
        }

        // Draw the shape adjusted to (0,0) origin in the texture
        tempGraphics.beginPath();
        tempGraphics.moveTo(smooth[0].x - minX, smooth[0].y - minY);
        for (let i = 1; i < smooth.length; i++) {
            tempGraphics.lineTo(smooth[i].x - minX, smooth[i].y - minY);
        }
        tempGraphics.closePath();
        tempGraphics.fillPath();
        tempGraphics.strokePath();

        // Calculate origin offset to position the sprite correctly
        const originX = (this.center.x - minX) / width;
        const originY = (this.center.y - minY) / height;

        // Remove old texture if it exists
        if (this.generatedTextureKey && this.scene.textures.exists(this.generatedTextureKey)) {
            this.scene.textures.remove(this.generatedTextureKey);
        }

        // Generate a new texture key
        this.generatedTextureKey = `bubble_texture_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

        // Generate a texture from the graphics
        tempGraphics.generateTexture(this.generatedTextureKey, width, height);

        // Clean up the temporary graphics
        tempGraphics.destroy();

        // Apply the new texture to this sprite
        this.setTexture(this.generatedTextureKey);
        this.setOrigin(originX, originY);
    }

    // -----------------------------------------------------------------------
    // Optional utilities
    // -----------------------------------------------------------------------

    /** Move the whole bubble (e.g. follow the group's centroid). */
    public setCenter(x: number, y: number): void {
        this.center.set(x, y);
        this.setPosition(x, y);
    }

    public setLocked(locked: boolean): void {
        this.locked = locked;
        this.drawSpline(); // redraw with new style
    }

    /** Convenience: call inside the scene's update loop. */
    public preUpdate(time: number, delta: number): void {
        // Intentionally empty – you can override if you prefer
    }

    /** Clean up resources when destroying the object */
    public destroy(fromScene?: boolean): void {
        // Remove the generated texture before destroying the sprite
        if (this.generatedTextureKey && this.scene.textures.exists(this.generatedTextureKey)) {
            this.scene.textures.remove(this.generatedTextureKey);
        }
        super.destroy(fromScene);
    }

    public get isAnimating(): boolean {
        return this._isAnimating;
    }
}
