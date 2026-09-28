/**
 * NG Academy — Character Life System (sitting)
 * --------------------------------------------
 * Real SIT state for the LOCAL player (extensible to more characters later):
 *
 *   walk → stop on/beside a seat tile → (350ms still) → sit down (crouch
 *   tween onto the chair) → seated idle (no movement) → press a move key →
 *   stand up (tween) → walk.
 *
 * Seat tiles are declared in the MAP, not in code: a tileset property
 * `sit=true` (+ optional `sitType` = chair|seat|sofa|desk) marks any chair,
 * so the system works in classrooms, the library, the canteen, the computer
 * room, the science lab, the director's office, waiting areas… and any new
 * room that uses marked chairs. New seat families = new entry in SEAT_POSES.
 */
import { get } from "svelte/store";
import type { ITiledMapLayer } from "@workadventure/tiled-map-type-guard";
import { UserInputEvent, type ActiveEventList } from "../../UserInput/UserInputManager";
import { userMovingStore } from "../../../Stores/GameStore";
import { SEAT_POSES, SIT_AFTER_STILL_MS, SIT_PROPERTY, SIT_TYPE_PROPERTY, type SeatType } from "./LifeConfig";
import type { Player } from "../Player";

interface SeatInfo {
    tileX: number;
    tileY: number;
    type: SeatType;
}

export class SitManager {
    public sitting = false;
    private standing = false;
    private stillSince: number | undefined;
    private poseMs = 260;
    private tileWidth = 32;

    constructor(private player: Player) {}

    /**
     * Called every frame BEFORE input handling.
     * @returns true → skip normal input this frame (holding a seat or mid-stand).
     */
    tick(events: ActiveEventList): boolean {
        const scene = this.player.scene;

        if (this.standing) {
            return true;
        }

        if (this.sitting) {
            if (this.hasDirectionInput(events)) {
                this.standUp();
                return true; // walking resumes next frame
            }
            this.player.getPublicBody().setVelocity(0, 0);
            return true;
        }

        // attempt to sit: still, not moving, not on a scripted path, on/near a seat
        const moving = get(userMovingStore);
        const following = this.player.isOnPath();
        const seat = moving || following ? undefined : this.nearestSeat();
        if (!seat) {
            this.stillSince = undefined;
            return false;
        }
        const now = Date.now();
        if (this.stillSince === undefined) {
            this.stillSince = now;
            return false;
        }
        if (now - this.stillSince >= SIT_AFTER_STILL_MS) {
            this.beginSit(seat, scene);
            return true;
        }
        return false;
    }

    private hasDirectionInput(events: ActiveEventList): boolean {
        return (
            events.get(UserInputEvent.MoveUp) ||
            events.get(UserInputEvent.MoveDown) ||
            events.get(UserInputEvent.MoveLeft) ||
            events.get(UserInputEvent.MoveRight)
        );
    }

    /** The seat tile under the player, or the closest adjacent one (max 1 tile away). */
    private nearestSeat(): SeatInfo | undefined {
        const wrapper = this.player.scene.getGameMapFrontWrapper();
        const layer = wrapper.findLayer("floor") as ITiledMapLayer | undefined;
        if (!layer || layer.type !== "tilelayer" || !Array.isArray(layer.data)) {
            return undefined;
        }
        const data = layer.data as number[];
        const w = layer.width;
        const body = this.player.getPublicBody();
        const cx = body.center.x;
        const cy = body.center.y;
        const tile = { x: Math.floor(cx / this.tileWidth), y: Math.floor(cy / this.tileWidth) };
        const map = wrapper.getMap();

        const candidates: { x: number; y: number; d2: number }[] = [];
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const x = tile.x + dx;
                const y = tile.y + dy;
                if (x < 0 || y < 0 || x >= (map.width ?? 0) || y >= (map.height ?? 0)) continue;
                const gid = data[y * w + x];
                if (!gid) continue;
                const seatType = this.sitTypeOf(gid);
                if (!seatType) continue;
                const d2 = dx * dx + dy * dy;
                candidates.push({ x, y, d2 });
            }
        }
        if (!candidates.length) return undefined;
        candidates.sort((a, b) => a.d2 - b.d2);
        const best = candidates[0];
        const bestGid = data[best.y * w + best.x];
        return { tileX: best.x, tileY: best.y, type: this.sitTypeOf(bestGid)! };
    }

    private sitTypeOf(gid: number): SeatType | undefined {
        const props = this.player.scene.getGameMapFrontWrapper().getPropertiesForIndex(gid);
        let sit = false;
        let type: SeatType = "chair";
        for (const p of props) {
            if (p.name === SIT_PROPERTY && p.value === true) sit = true;
            if (p.name === SIT_TYPE_PROPERTY) type = p.value as SeatType;
        }
        return sit ? (SEAT_POSES[type] ? type : "chair") : undefined;
    }

    private beginSit(seat: SeatInfo, scene: Phaser.Scene): void {
        if (this.sitting) return;
        this.sitting = true;
        this.player.isSitting = true;
        this.stillSince = undefined;
        const pose = SEAT_POSES[seat.type] ?? SEAT_POSES.chair;
        this.poseMs = pose.transitionMs;

        // physics would push the body out of the (solid) chair tile — pause it while seated
        this.player.getPublicBody().enable = false;
        this.player.pauseLifeBreath();

        // snap feet to the seat centre
        const targetX = seat.tileX * this.tileWidth + this.tileWidth / 2 - 8;
        const targetY = seat.tileY * this.tileWidth + this.tileWidth / 2 - 24;
        scene.tweens.add({
            targets: this.player,
            x: targetX,
            y: targetY,
            duration: pose.transitionMs,
            ease: "Quad.out",
        });
        const sprites = this.player.getLifeSprites();
        scene.tweens.add({
            targets: sprites,
            scaleY: pose.scaleY,
            scaleX: pose.scaleX,
            y: pose.dy,
            duration: pose.transitionMs,
            ease: "Back.in",
        });
        // face the way the player was facing (towards their table) — already the case
    }

    private standUp(): void {
        if (!this.sitting || this.standing) return;
        this.sitting = false;
        this.player.isSitting = false;
        this.standing = true;
        const scene = this.player.scene;
        const sprites = this.player.getLifeSprites();
        scene.tweens.add({
            targets: sprites,
            scaleY: 1,
            scaleX: 1,
            y: 0,
            duration: Math.max(160, this.poseMs * 0.7),
            ease: "Back.out",
            onComplete: () => {
                this.standing = false;
                this.player.getPublicBody().enable = true;
                this.player.resumeLifeBreath();
            },
        });
    }

    destroy(): void {
        if (this.standing) {
            this.standing = false;
        }
        if (this.sitting) {
            this.player.getPublicBody().enable = true;
        }
        this.sitting = false;
    }
}
