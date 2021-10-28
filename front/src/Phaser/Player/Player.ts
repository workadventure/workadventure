import { PlayerAnimationDirections } from "./Animation";
import type { GameScene } from "../Game/GameScene";
import { ActiveEventList, UserInputEvent, UserInputManager } from "../UserInput/UserInputManager";
import { Character } from "../Entity/Character";
import type { RemotePlayer } from "../Entity/RemotePlayer";
import { userMovingStore } from "../../Stores/GameStore";

export const hasMovedEventName = "hasMoved";
export const requestEmoteEventName = "requestEmote";

export class Player extends Character {
    private previousDirection: PlayerAnimationDirections = PlayerAnimationDirections.Down;
    private wasMoving: boolean = false;
    private timeCounter: number = 0;
    private follow: { followPlayer: RemotePlayer; direction: PlayerAnimationDirections } | null = null;

    constructor(
        Scene: GameScene,
        x: number,
        y: number,
        name: string,
        texturesPromise: Promise<string[]>,
        direction: PlayerAnimationDirections,
        moving: boolean,
        private userInputManager: UserInputManager,
        companion: string | null,
        companionTexturePromise?: Promise<string>
    ) {
        super(Scene, x, y, texturesPromise, name, direction, moving, 1, true, companion, companionTexturePromise);

        //the current player model should be push away by other players to prevent conflict
        this.getBody().setImmovable(false);
    }

    private inputStep(activeEvents: ActiveEventList, delta: number) {
        //if user client on shift, camera and player speed
        let direction = null;
        let moving = false;

        const speedMultiplier = activeEvents.get(UserInputEvent.SpeedUp) ? 25 : 9;
        const moveAmount = speedMultiplier * 20;

        let x = 0;
        let y = 0;

        if (activeEvents.get(UserInputEvent.MoveUp)) {
            y = -moveAmount;
            direction = PlayerAnimationDirections.Up;
            moving = true;
        } else if (activeEvents.get(UserInputEvent.MoveDown)) {
            y = moveAmount;
            direction = PlayerAnimationDirections.Down;
            moving = true;
        }

        if (activeEvents.get(UserInputEvent.MoveLeft)) {
            x = -moveAmount;
            direction = PlayerAnimationDirections.Left;
            moving = true;
        } else if (activeEvents.get(UserInputEvent.MoveRight)) {
            x = moveAmount;
            direction = PlayerAnimationDirections.Right;
            moving = true;
        }

        moving = moving || activeEvents.get(UserInputEvent.JoystickMove);

        if (x !== 0 || y !== 0) {
            this.move(x, y);
            this.emit(hasMovedEventName, { moving, direction, x: this.x, y: this.y, oldX: x, oldY: y });
        } else if (this.wasMoving && moving) {
            // slow joystick movement
            this.move(0, 0);
            this.emit(hasMovedEventName, {
                moving,
                direction: this.previousDirection,
                x: this.x,
                y: this.y,
                oldX: x,
                oldY: y,
            });
        } else if (this.wasMoving && !moving) {
            this.stop();
            this.emit(hasMovedEventName, {
                moving,
                direction: this.previousDirection,
                x: this.x,
                y: this.y,
                oldX: x,
                oldY: y,
            });
        }

        if (direction !== null) {
            this.previousDirection = direction;
        }

        this.wasMoving = moving;
        userMovingStore.set(moving);
    }

    private followStep(activeEvents: ActiveEventList, delta: number) {
        if (this.follow === null) {
            return;
        }

        this.timeCounter += delta;
        if (this.timeCounter < 128) {
            return;
        }
        this.timeCounter = 0;

        const xDist = this.follow.followPlayer.x - this.x;
        const yDist = this.follow.followPlayer.y - this.y;

        const distance = Math.pow(xDist, 2) + Math.pow(yDist, 2);

        if (distance < 650) {
            this.stop();
        } else {
            const moveAmount = 9 * 20;
            const xDir = xDist / Math.sqrt(distance);
            const yDir = yDist / Math.sqrt(distance);

            this.move(xDir * moveAmount, yDir * moveAmount);

            if (Math.abs(xDist) > Math.abs(yDist)) {
                if (xDist < 0) {
                    this.follow.direction = PlayerAnimationDirections.Left;
                } else {
                    this.follow.direction = PlayerAnimationDirections.Right;
                }
            } else {
                if (yDist < 0) {
                    this.follow.direction = PlayerAnimationDirections.Up;
                } else {
                    this.follow.direction = PlayerAnimationDirections.Down;
                }
            }
        }

        this.emit(hasMovedEventName, {
            moving: true,
            direction: this.follow.direction,
            x: this.x,
            y: this.y,
        });

        this.previousDirection = this.follow.direction;

        this.wasMoving = true;
        userMovingStore.set(true);
    }

    moveUser(delta: number): void {
        const activeEvents = this.userInputManager.getEventListForGameTick();

        if (activeEvents.get(UserInputEvent.Interact)) {
            const sortedPlayers = Array.from(this.scene.MapPlayersByKey.values()).sort((p1, p2) => {
                const sdistToP1 = Math.pow(p1.x - this.x, 2) + Math.pow(p1.y - this.y, 2);
                const sdistToP2 = Math.pow(p2.x - this.x, 2) + Math.pow(p2.y - this.y, 2);
                if (sdistToP1 > sdistToP2) {
                    return 1;
                } else if (sdistToP1 < sdistToP2) {
                    return -1;
                } else {
                    return 0;
                }
            });

            const minFollowDist = 10000;
            if (typeof sortedPlayers !== "undefined" && sortedPlayers.length > 0) {
                const sdist = Math.pow(sortedPlayers[0].x - this.x, 2) + Math.pow(sortedPlayers[0].y - this.y, 2);
                if (sdist < minFollowDist) {
                    this.follow = {
                        followPlayer: sortedPlayers[0],
                        direction: this.previousDirection,
                    };
                }
            }
        }

        if (
            activeEvents.get(UserInputEvent.MoveUp) ||
            activeEvents.get(UserInputEvent.MoveDown) ||
            activeEvents.get(UserInputEvent.MoveLeft) ||
            activeEvents.get(UserInputEvent.MoveRight)
        ) {
            this.follow = null;
        }

        if (this.follow === null) {
            this.inputStep(activeEvents, delta);
        } else {
            this.followStep(activeEvents, delta);
        }
    }

    public isMoving(): boolean {
        return this.wasMoving;
    }
}
