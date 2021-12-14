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

    private inputStep(activeEvents: ActiveEventList) {
        //if user client on shift, camera and player speed
        let direction = this.lastDirection;
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
        } else if (get(userMovingStore) && moving) {
            // slow joystick movement
            this.move(0, 0);
            this.emit(hasMovedEventName, {
                moving,
                direction: direction,
                x: this.x,
                y: this.y,
                oldX: x,
                oldY: y,
            });
        } else if (get(userMovingStore) && !moving) {
            this.stop();
            this.emit(hasMovedEventName, {
                moving,
                direction: direction,
                x: this.x,
                y: this.y,
                oldX: x,
                oldY: y,
            });
        }

        userMovingStore.set(moving);
    }

    private followStep(delta: number) {
        const player = this.scene.findPlayer((p) => p.PlayerValue === get(followUsersStore)[0]);
        if (!player) {
            this.scene.connection?.emitFollowAbort(get(followUsersStore)[0], this.PlayerValue);
            followStateStore.set(followStates.off);
            return;
        }

        const xDist = player.x - this.x;
        const yDist = player.y - this.y;
        const distance = Math.pow(xDist, 2) + Math.pow(yDist, 2);

        let moving = false;
        let direction = this.lastDirection;
        if (distance < 2000) {
            this.stop();
        } else {
            moving = true;
            const moveAmount = 9 * 20;
            const xDir = xDist / Math.sqrt(distance);
            const yDir = yDist / Math.sqrt(distance);

            this.move(xDir * moveAmount, yDir * moveAmount);

            if (Math.abs(xDist) > Math.abs(yDist)) {
                direction = xDist < 0 ? PlayerAnimationDirections.Left : PlayerAnimationDirections.Right;
            } else {
                direction = yDist < 0 ? PlayerAnimationDirections.Up : PlayerAnimationDirections.Down;
            }
        }

        this.emit(hasMovedEventName, {
            moving: moving,
            direction: direction,
            x: this.x,
            y: this.y,
        });

        userMovingStore.set(moving);
    }

    public enableFollowing() {
        followStateStore.set(followStates.active);
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
            this.inputStep(activeEvents);
        } else {
            this.followStep(delta);
        }
    }
}
