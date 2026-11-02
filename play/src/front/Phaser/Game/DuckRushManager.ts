import * as Phaser from "phaser";
import type { GameScene } from "./GameScene";

const DUCK_TEXTURE_KEY = "konami-duck";
const DUCK_TEXTURE_URL = "/resources/ducks/duck.png";
const DUCK_FRAME_SIZE = 32;
const DUCK_WALK_ANIMATION_KEY = "konami-duck-walk";
// The sprite sheet has 6 frames per row: the walk cycle is the second row.
const DUCK_WALK_FIRST_FRAME = 6;
const DUCK_WALK_LAST_FRAME = 11;

const DUCK_COUNT = 30;
const DUCK_SPAWN_INTERVAL_MS = 40;
const DUCK_MIN_LIFETIME_MS = 4_000;
const DUCK_MAX_LIFETIME_MS = 7_000;
const DUCK_FADE_OUT_MS = 800;
const DUCK_MIN_SPEED = 120;
const DUCK_MAX_SPEED = 260;
const DUCK_MIN_TARGET_DISTANCE = 150;
const DUCK_MAX_TARGET_DISTANCE = 700;
const DUCK_PATH_ATTEMPTS = 5;
// One duck out of RESIDENT_PERIOD stays around the player, in the same room, instead of running away.
const RESIDENT_PERIOD = 3;
const RESIDENT_MIN_TARGET_DISTANCE = 32;
const RESIDENT_MAX_TARGET_DISTANCE = 160;
// A resident does not take a path that goes around walls and through doors to reach a close target.
const RESIDENT_MAX_PATH_DETOUR = 2;

type Point = { x: number; y: number };

/**
 * The burst of ducks of one player. Every client plays the rush of every player nearby: only the player who entered
 * the Konami code announces it, the ducks themselves are never sent through the network.
 */
interface Rush {
    userId: number;
    origin: Point;
    // Where the player is now: undefined once the player is gone (left the room, or too far to be known).
    getPlayerPosition: () => Point | undefined;
    lastPlayerPosition: Point;
    pendingSpawns: number;
    duckCount: number;
}

interface Duck {
    rush: Rush;
    sprite: Phaser.GameObjects.Sprite;
    speed: number;
    expiresAt: number;
    path: Point[];
    // The index of the waypoint the duck is running to.
    nextWaypoint: number;
    isSearchingPath: boolean;
    // Stays around the player instead of running away.
    isResident: boolean;
    // Center of the duck, in the coordinates of the characters: this is what opens the doors.
    opener: Point;
}

/**
 * Makes a lot of ducks leave a player and run to many different places for a few seconds. The ducks follow the
 * pathfinding, so they respect the colliders of the map.
 */
export class DuckRushManager {
    private ducks = new Set<Duck>();
    // The rushes in progress, by user id of the player: a player cannot start a new rush before the previous one is over.
    private rushes = new Map<number, Rush>();
    private readonly updateListener = (time: number, delta: number): void => this.update(time, delta);

    constructor(private scene: GameScene) {}

    public static preload(scene: Phaser.Scene): void {
        scene.load.spritesheet(DUCK_TEXTURE_KEY, DUCK_TEXTURE_URL, {
            frameWidth: DUCK_FRAME_SIZE,
            frameHeight: DUCK_FRAME_SIZE,
        });
    }

    /**
     * @param userId The user id of the player who entered the Konami code
     * @param getPlayerPosition Returns the position (center) of the player, or undefined if the player is not on the map
     */
    public start(userId: number, getPlayerPosition: () => Point | undefined): void {
        const origin = getPlayerPosition();
        if (!origin || this.rushes.has(userId) || !this.scene.textures.exists(DUCK_TEXTURE_KEY)) {
            return;
        }
        if (!this.scene.anims.exists(DUCK_WALK_ANIMATION_KEY)) {
            this.scene.anims.create({
                key: DUCK_WALK_ANIMATION_KEY,
                frames: this.scene.anims.generateFrameNumbers(DUCK_TEXTURE_KEY, {
                    start: DUCK_WALK_FIRST_FRAME,
                    end: DUCK_WALK_LAST_FRAME,
                }),
                frameRate: 10,
                repeat: -1,
            });
        }

        const rush: Rush = {
            userId,
            origin,
            getPlayerPosition,
            lastPlayerPosition: origin,
            pendingSpawns: DUCK_COUNT,
            duckCount: 0,
        };
        const isFirstRush = this.rushes.size === 0;
        this.rushes.set(userId, rush);
        // The ducks come out one after the other, like a burst.
        for (let i = 0; i < DUCK_COUNT; i++) {
            this.scene.time.delayedCall(i * DUCK_SPAWN_INTERVAL_MS, () => {
                if (this.rushes.get(userId) !== rush) {
                    return;
                }
                rush.pendingSpawns--;
                this.spawnDuck(rush, i);
            });
        }
        // One listener for all the rushes: registering it twice would make the ducks run twice as fast.
        if (isFirstRush) {
            this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.updateListener);
        }
    }

    public destroy(): void {
        this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.updateListener);
        this.rushes.clear();
        for (const duck of this.ducks) {
            duck.sprite.destroy();
        }
        this.ducks.clear();
    }

    private forgetRushIfOver(rush: Rush): void {
        if (rush.pendingSpawns === 0 && rush.duckCount === 0) {
            this.rushes.delete(rush.userId);
        }
    }

    /**
     * Calls the callback with the position of each duck: like the characters, the ducks open the doors.
     */
    public forEachDoorOpener(callback: (position: Point) => void): void {
        for (const duck of this.ducks) {
            callback(duck.opener);
        }
    }

    private spawnDuck(rush: Rush, index: number): void {
        // The player is positioned by its center, the ducks by their feet.
        const sprite = this.scene.add.sprite(rush.origin.x, rush.origin.y + DUCK_FRAME_SIZE / 2, DUCK_TEXTURE_KEY);
        // The position of a duck is the position of its feet.
        sprite.setOrigin(0.5, 1);
        sprite.setScale(Phaser.Math.FloatBetween(0.8, 1.2));
        sprite.play({ key: DUCK_WALK_ANIMATION_KEY, startFrame: Phaser.Math.Between(0, 5) });
        const duck: Duck = {
            rush,
            sprite,
            speed: Phaser.Math.Between(DUCK_MIN_SPEED, DUCK_MAX_SPEED),
            expiresAt: this.scene.time.now + Phaser.Math.Between(DUCK_MIN_LIFETIME_MS, DUCK_MAX_LIFETIME_MS),
            path: [],
            nextWaypoint: 0,
            isSearchingPath: false,
            isResident: index % RESIDENT_PERIOD === 0,
            opener: { x: sprite.x, y: sprite.y - DUCK_FRAME_SIZE / 2 },
        };
        this.ducks.add(duck);
        rush.duckCount++;
        this.searchPath(duck);
    }

    /**
     * Looks for a path from the duck to a random place around it. The first path of a duck starts from the player.
     */
    private searchPath(duck: Duck): void {
        duck.isSearchingPath = true;
        this.findRandomPath(duck)
            .then((path) => {
                duck.path = path;
                duck.nextWaypoint = 1;
            })
            .catch((e) => console.error("Cannot find a path for a duck", e))
            .finally(() => {
                duck.isSearchingPath = false;
            });
    }

    private async findRandomPath(duck: Duck): Promise<Point[]> {
        const feet = duck.sprite;
        // A resident wanders around the player, wherever the player is now.
        const center = duck.isResident ? this.getPlayerFeet(duck.rush) : feet;
        const minDistance = duck.isResident ? RESIDENT_MIN_TARGET_DISTANCE : DUCK_MIN_TARGET_DISTANCE;
        const maxDistance = duck.isResident ? RESIDENT_MAX_TARGET_DISTANCE : DUCK_MAX_TARGET_DISTANCE;
        const pathfindingManager = this.scene.getUpToDatePathfindingManager();
        for (let attempt = 0; attempt < DUCK_PATH_ATTEMPTS; attempt++) {
            const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
            const distance = Phaser.Math.Between(minDistance, maxDistance);
            const target = { x: center.x + Math.cos(angle) * distance, y: center.y + Math.sin(angle) * distance };
            // eslint-disable-next-line no-await-in-loop
            const path = await pathfindingManager.findPathFromGameCoordinates(
                // The pathfinding expects the center of an avatar and works from its feet.
                { x: feet.x, y: feet.y - DUCK_FRAME_SIZE / 2 },
                target,
                true,
            );
            if (path.length > 1 && (!duck.isResident || this.isDirectEnough(path, target))) {
                return path;
            }
        }
        return [];
    }

    private getPlayerFeet(rush: Rush): Point {
        rush.lastPlayerPosition = rush.getPlayerPosition() ?? rush.lastPlayerPosition;
        return { x: rush.lastPlayerPosition.x, y: rush.lastPlayerPosition.y + DUCK_FRAME_SIZE / 2 };
    }

    /**
     * Whether the path does not make a long detour (around a wall, through a door) to reach a close target.
     */
    private isDirectEnough(path: Point[], target: Point): boolean {
        let length = 0;
        for (let i = 1; i < path.length; i++) {
            length += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
        }
        const directLength = Math.hypot(target.x - path[0].x, target.y - path[0].y);
        return length <= directLength * RESIDENT_MAX_PATH_DETOUR;
    }

    private update(time: number, delta: number): void {
        const step = delta / 1000;
        for (const duck of this.ducks) {
            const sprite = duck.sprite;
            const remaining = duck.expiresAt - time;
            if (remaining <= 0) {
                sprite.destroy();
                this.ducks.delete(duck);
                duck.rush.duckCount--;
                this.forgetRushIfOver(duck.rush);
                continue;
            }
            sprite.setAlpha(Math.min(1, remaining / DUCK_FADE_OUT_MS));

            const waypoint = duck.path[duck.nextWaypoint];
            if (!waypoint) {
                // The path is over: run somewhere else.
                if (!duck.isSearchingPath) {
                    this.searchPath(duck);
                }
                continue;
            }
            const dx = waypoint.x - sprite.x;
            const dy = waypoint.y - sprite.y;
            const distance = Math.hypot(dx, dy);
            const maxMove = duck.speed * step;
            if (distance <= maxMove) {
                sprite.setPosition(waypoint.x, waypoint.y);
                duck.nextWaypoint++;
            } else {
                sprite.x += (dx / distance) * maxMove;
                sprite.y += (dy / distance) * maxMove;
            }
            // The sprite sheet faces right.
            if (Math.abs(dx) > 1) {
                sprite.setFlipX(dx < 0);
            }
            duck.opener.x = sprite.x;
            duck.opener.y = sprite.y - DUCK_FRAME_SIZE / 2;
            // Like the characters, the depth follows the y coordinate to simulate a perspective.
            sprite.setDepth(sprite.y);
        }
        if (this.rushes.size === 0) {
            this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.updateListener);
        }
    }
}
