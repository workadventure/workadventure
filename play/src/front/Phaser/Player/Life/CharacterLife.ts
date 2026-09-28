/**
 * NG Academy — Character Life System (per-character life director)
 * ----------------------------------------------------------------
 * Makes each character feel alive without any game mechanics:
 *   • breathing  — a gentle 1px bob while idle (deterministic per name)
 *   • look-around— remote characters occasionally glance left/right
 *   • stop settle— walk→idle keeps the last walk frame briefly (no hard cut)
 *   • attention  — idle characters face a nearby speaker
 *
 * Everything is driven by a name-hashed PRNG, so all clients agree on what
 * a given remote character does. The local player only gets breathing +
 * settle (their facing is user-controlled).
 *
 * New behaviours = new method + new config entry in LifeConfig.ts.
 */
import { PositionMessage_Direction } from "@workadventure/messages";
import type { ITiledMapLayer } from "@workadventure/tiled-map-type-guard";
import type { Character } from "../../Entity/Character";
import type { GameScene } from "../../Game/GameScene";
import type { GameMapFrontWrapper } from "../../Game/GameMap/GameMapFrontWrapper";
import { DEFAULT_LIFE, LIFE_PROFILES, ZONE_CLASS_LAYER, ZONE_LIFE, ZONE_TEACHER_LAYER, type LifeTimings } from "./LifeConfig";
import { LifeRegistry, type SpeakerInfo } from "./LifeRegistry";

/** FNV-1a 32-bit hash — stable across clients/languages. */
function hashName(s: string): number {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

/** Tiny deterministic PRNG (mulberry32). */
function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function rand(rng: () => number, range: [number, number]): number {
    return range[0] + rng() * (range[1] - range[0]);
}

export class CharacterLife {
    private cfg: LifeTimings;
    private rng: () => number;
    private homeDir: PositionMessage_Direction;
    private looking = false;
    private lookTimer?: Phaser.Time.TimerEvent;
    private holdCall?: Phaser.Time.TimerEvent;
    private settleCall?: Phaser.Time.TimerEvent;
    private breathTween?: Phaser.Tweens.Tween;
    private zoneTimer?: Phaser.Time.TimerEvent;
    private inTeacherZone = false;
    private inClassZone = false;
    private nextTeacherScanAt = 0;
    private faceTeacherUntil = 0;
    private destroyed = false;
    public readonly isSelf: boolean;

    constructor(
        private scene: GameScene,
        private character: Character,
        profile: string = "default",
    ) {
        this.isSelf = character.isSelf;
        this.cfg = { ...DEFAULT_LIFE, ...LIFE_PROFILES[profile] };
        this.rng = mulberry32(hashName(character.playerName));
        this.homeDir = character.lastDirection;
        LifeRegistry.register(scene, this);
        this.start();
    }

    get name(): string {
        return this.character.playerName;
    }

    private start(): void {
        this.startBreath();
        this.startZones();
        if (!this.isSelf) {
            const first = rand(this.rng, this.cfg.firstLookAfterMs);
            this.scene.time.delayedCall(first, () => this.tickLook());
        }
    }

    /* ---------------- role by location (zones) ---------------- */

    /** Repeatedly checks which zone layers sit under this character. */
    private startZones(): void {
        if (this.zoneTimer) return;
        this.zoneTimer = this.scene.time.addEvent({
            delay: ZONE_LIFE.tickMs,
            callback: () => this.tickZones(),
            loop: true,
        });
    }

    private zoneGid(wrapper: GameMapFrontWrapper, layerName: string, tile: { x: number; y: number }): boolean {
        const layer = wrapper.findLayer(layerName) as ITiledMapLayer | undefined;
        if (!layer || layer.type !== "tilelayer" || !Array.isArray(layer.data)) {
            return false;
        }
        const data = layer.data as number[];
        const w = layer.width;
        if (tile.x < 0 || tile.y < 0 || tile.x >= w || tile.y >= layer.height) {
            return false;
        }
        return data[tile.y * w + tile.x] !== 0;
    }

    private tickZones(): void {
        if (this.destroyed) return;
        const wrapper = this.scene.getGameMapFrontWrapper();
        if (!wrapper) return;
        const body = this.character.getPublicBody();
        const tile = {
            x: Math.floor(body.center.x / ZONE_LIFE.tilePx),
            y: Math.floor(body.center.y / ZONE_LIFE.tilePx),
        };
        const wasTeacher = this.inTeacherZone;
        this.inTeacherZone = this.zoneGid(wrapper, ZONE_TEACHER_LAYER, tile);
        this.inClassZone = this.zoneGid(wrapper, ZONE_CLASS_LAYER, tile);
        if (!wasTeacher) {
            this.nextTeacherScanAt = 0;
        }

        // Any real user in a teacher zone IS the teacher of that room.
        if (this.inTeacherZone) {
            LifeRegistry.setTeacher(this.scene, { name: this.name, x: body.center.x, y: body.center.y });
            if (!this.isSelf && !this.character.isOnPath() && !this.character.isSitting) {
                this.maybeTeacherScan();
            }
        } else {
            LifeRegistry.clearTeacher(this.scene, this.name);
        }

        // Students (class zone, not the teacher) attend to the nearest teacher.
        if (this.inClassZone && !this.inTeacherZone && !this.isSelf && !this.character.isOnPath() && !this.character.isSitting) {
            if (Date.now() >= this.faceTeacherUntil) {
                const teacher = LifeRegistry.nearestTeacher(
                    this.scene,
                    body.center.x,
                    body.center.y,
                    ZONE_LIFE.maxTeacherDistPx,
                    this.name,
                );
                if (teacher) {
                    this.faceTarget(teacher.x, teacher.y, rand(this.rng, ZONE_LIFE.studentFaceHoldMs));
                    this.faceTeacherUntil = Date.now() + ZONE_LIFE.studentFaceHoldMs[1];
                }
            }
        } else if (!this.inClassZone) {
            this.faceTeacherUntil = 0;
        }
    }

    /** The teacher turns to scan the row (biased towards the class zone). */
    private maybeTeacherScan(): void {
        if (this.looking) return;
        const now = Date.now();
        if (now < this.nextTeacherScanAt) return;
        this.nextTeacherScanAt = now + rand(this.rng, ZONE_LIFE.teacherScanEveryMs);
        this.faceDir(this.scanDirection(), rand(this.rng, ZONE_LIFE.teacherScanHoldMs));
    }

    private scanDirection(): PositionMessage_Direction {
        if (this.rng() < ZONE_LIFE.teacherScanClassBias) {
            const row = this.nearestClassPoint();
            if (row) {
                return this.directionToward(row.x, row.y);
            }
        }
        const dirs: PositionMessage_Direction[] = [
            PositionMessage_Direction.UP,
            PositionMessage_Direction.DOWN,
            PositionMessage_Direction.LEFT,
            PositionMessage_Direction.RIGHT,
        ];
        return dirs[Math.floor(this.rng() * dirs.length)];
    }

    /** Centre of the nearest class-zone tile (pixel coords), if the layer exists. */
    private nearestClassPoint(): { x: number; y: number } | undefined {
        const wrapper = this.scene.getGameMapFrontWrapper();
        if (!wrapper) return undefined;
        const layer = wrapper.findLayer(ZONE_CLASS_LAYER) as ITiledMapLayer | undefined;
        if (!layer || layer.type !== "tilelayer" || !Array.isArray(layer.data)) {
            return undefined;
        }
        const data = layer.data as number[];
        const w = layer.width;
        const body = this.character.getPublicBody();
        let best: { x: number; y: number } | undefined;
        let bestD2 = Infinity;
        for (let y = 0; y < layer.height; y++) {
            for (let x = 0; x < w; x++) {
                if (!data[y * w + x]) continue;
                const px = x * ZONE_LIFE.tilePx + ZONE_LIFE.tilePx / 2;
                const py = y * ZONE_LIFE.tilePx + ZONE_LIFE.tilePx / 2;
                const dx = px - body.center.x;
                const dy = py - body.center.y;
                const d2 = dx * dx + dy * dy;
                if (d2 < bestD2) {
                    bestD2 = d2;
                    best = { x: px, y: py };
                }
            }
        }
        return best;
    }

    private directionToward(targetX: number, targetY: number): PositionMessage_Direction {
        const dx = targetX - this.character.getPublicBody().center.x;
        const dy = targetY - this.character.getPublicBody().center.y;
        if (Math.abs(dx) > Math.abs(dy)) {
            return dx > 0 ? PositionMessage_Direction.RIGHT : PositionMessage_Direction.LEFT;
        }
        return dy > 0 ? PositionMessage_Direction.DOWN : PositionMessage_Direction.UP;
    }

    /* ---------------- breathing ---------------- */

    startBreath(): void {
        if (this.destroyed || this.breathTween) return;
        const sprites = this.character.getLifeSprites();
        if (!sprites.length) return;
        const half = rand(this.rng, this.cfg.breathPeriodMs) / 2;
        this.breathTween = this.scene.tweens.add({
            targets: sprites,
            y: { from: 0, to: -this.cfg.breathAmplitudePx },
            duration: half,
            ease: "Sine.inOut",
            yoyo: true,
            repeat: -1,
        });
    }

    stopBreath(): void {
        this.breathTween?.remove();
        this.breathTween = undefined;
    }

    /* ---------------- idle micro-behaviours ---------------- */

    private tickLook(): void {
        if (this.destroyed) return;
        // never steal the facing of a character that is moving / on a path / sitting
        if (this.character.isOnPath() || this.character.isSitting) {
            this.rescheduleLook();
            return;
        }
        if (Date.now() - this.character.lastMoveAt < 2500) {
            this.rescheduleLook();
            return;
        }
        // zone-managed facing owns idle turns (teacher scanning / attending student)
        const body = this.character.getPublicBody();
        const zoneManaged =
            this.inTeacherZone ||
            (this.inClassZone &&
                LifeRegistry.nearestTeacher(this.scene, body.center.x, body.center.y, ZONE_LIFE.maxTeacherDistPx, this.name) !==
                    undefined);
        if (zoneManaged) {
            this.rescheduleLook();
            return;
        }
        // 1) attention: face a nearby speaker
        const speaker = LifeRegistry.speaker(this.scene);
        if (speaker && speaker.name !== this.name) {
            const dx = speaker.x - this.character.x;
            const dy = speaker.y - this.character.y;
            if (dx * dx + dy * dy < this.cfg.listenRadiusPx * this.cfg.listenRadiusPx) {
                this.faceTarget(speaker.x, speaker.y, rand(this.rng, this.cfg.listenHoldMs));
                this.rescheduleLook();
                return;
            }
        }
        // 2) plain look-around
        const dir = this.rng() < 0.5 ? PositionMessage_Direction.LEFT : PositionMessage_Direction.RIGHT;
        this.faceDir(dir, rand(this.rng, this.cfg.lookAroundHoldMs));
        this.rescheduleLook();
    }

    private faceTarget(targetX: number, targetY: number, holdMs: number): void {
        this.faceDir(this.directionToward(targetX, targetY), holdMs);
    }

    private faceDir(dir: PositionMessage_Direction, holdMs: number): void {
        if (this.looking) return;
        this.looking = true;
        this.character.setLifeDirection(dir);
        this.holdCall = this.scene.time.delayedCall(holdMs, () => {
            this.holdCall = undefined;
            this.looking = false;
            if (!this.destroyed) {
                this.character.setLifeDirection(this.homeDir);
            }
        });
    }

    private rescheduleLook(): void {
        this.lookTimer?.remove(false);
        const delay = rand(this.rng, this.cfg.lookAroundEveryMs);
        this.lookTimer = this.scene.time.addEvent({
            delay,
            callback: () => this.tickLook(),
        });
    }

    /* ---------------- walk/idle state hooks ---------------- */

    /** Called by Character every time its animation state changes. */
    onAnimation(direction: PositionMessage_Direction, moving: boolean): void {
        this.homeDir = direction;
        if (moving) {
            this.lastMoveSeen();
            if (this.looking) {
                this.looking = false;
                this.holdCall?.remove(false);
                this.holdCall = undefined;
            }
            this.settleCall?.remove(false);
            this.settleCall = undefined;
        }
    }

    private lastMoveSeen(): void {
        this.character.lastMoveAt = Date.now();
    }

    /**
     * Walk→idle transition: keep the last walk frame for a short "settle" so
     * the character does not hard-cut from walking to a frozen pose.
     * Returns true when the life director (not the caller) owns the switch.
     */
    handleStop(direction: PositionMessage_Direction, sprite: Phaser.GameObjects.Sprite): boolean {
        if (this.destroyed) return false;
        const current = sprite.anims.currentAnim?.key ?? "";
        if (!current.endsWith("-walk") || this.settleCall) {
            return false;
        }
        sprite.anims.pause();
        this.settleCall = this.scene.time.delayedCall(this.cfg.stopSettleMs, () => {
            this.settleCall = undefined;
            if (this.destroyed) return;
            this.character.playIdleForLife(direction);
            this.scene.tweens.add({
                targets: sprite,
                y: { from: this.cfg.stopSettlePx, to: 0 },
                duration: 180,
                ease: "Quad.out",
            });
        });
        return true;
    }

    /* ---------------- speaker attention (immediate) ---------------- */

    onSpeakerAnnounced(speaker: SpeakerInfo): void {
        if (this.destroyed || this.isSelf) return;
        if (this.character.isOnPath() || this.character.isSitting) return;
        if (Date.now() - this.character.lastMoveAt < 1500) return;
        const dx = speaker.x - this.character.x;
        const dy = speaker.y - this.character.y;
        if (dx * dx + dy * dy >= this.cfg.listenRadiusPx * this.cfg.listenRadiusPx) return;
        // replace any ongoing look with attention towards the speaker
        this.looking = false;
        this.holdCall?.remove(false);
        this.holdCall = undefined;
        this.faceTarget(speaker.x, speaker.y, rand(this.rng, this.cfg.listenHoldMs));
    }

    /* ---------------- lifecycle ---------------- */

    destroy(): void {
        if (this.destroyed) return;
        this.destroyed = true;
        this.lookTimer?.remove(false);
        this.holdCall?.remove(false);
        this.settleCall?.remove(false);
        this.zoneTimer?.remove(false);
        this.breathTween?.remove();
        LifeRegistry.unregister(this.scene, this.name);
        LifeRegistry.clearTeacher(this.scene, this.name);
    }
}
