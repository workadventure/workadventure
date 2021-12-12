import { PlayerAnimationDirections } from "./Animation";
import type { GameScene } from "../Game/GameScene";
import { ActiveEventList, UserInputEvent, UserInputManager } from "../UserInput/UserInputManager";
import { Character } from "../Entity/Character";
import type { RemotePlayer } from "../Entity/RemotePlayer";

import { get } from "svelte/store";
import { userMovingStore } from "../../Stores/GameStore";
import {
    followStateStore,
    followRoleStore,
    followUsersStore,
    followRoles,
    followStates,
} from "../../Stores/InteractStore";

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
        let moving = false;

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

        if (distance < 2000) {
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

            moving = true;
        }

        this.emit(hasMovedEventName, {
            moving: moving,
            direction: this.follow.direction,
            x: this.x,
            y: this.y,
        });

        this.previousDirection = this.follow.direction;

        this.wasMoving = moving;
        userMovingStore.set(moving);
    }

    public enableFollowing() {
        Array.from(this.scene.MapPlayersByKey.values()).forEach((player) => {
            if (player.PlayerValue !== get(followUsersStore)[0]) {
                return;
            }
            this.follow = {
                followPlayer: player,
                direction: this.previousDirection,
            };
            followStateStore.set(followStates.active);
        });
    }

    public moveUser(delta: number): void {
        const activeEvents = this.userInputManager.getEventListForGameTick();
        const state = get(followStateStore);
        const role = get(followRoleStore);

        if (activeEvents.get(UserInputEvent.Interact)) {
            if (state === followStates.off && this.scene.groups.size > 0) {
                followStateStore.set(followStates.requesting);
                followRoleStore.set(followRoles.leader);
            } else if (state === followStates.active) {
                followStateStore.set(followStates.ending);
            }
        }

        if ((state !== followStates.active && state !== followStates.ending) || role !== followRoles.follower) {
            this.inputStep(activeEvents, delta);
        } else {
            this.followStep(activeEvents, delta);
        }
    }

    public isMoving(): boolean {
        return this.wasMoving;
    }
}
