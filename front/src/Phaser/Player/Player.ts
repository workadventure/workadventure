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
} from "../../Stores/FollowStore";

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

    private inputStep(activeEvents: ActiveEventList, x: number, y: number) {
        // Process input events
        if (activeEvents.get(UserInputEvent.MoveUp)) {
            y = y - 1;
        } else if (activeEvents.get(UserInputEvent.MoveDown)) {
            y = y + 1;
        }

        if (activeEvents.get(UserInputEvent.MoveLeft)) {
            x = x - 1;
        } else if (activeEvents.get(UserInputEvent.MoveRight)) {
            x = x + 1;
        }

        // Compute movement deltas
        const speedMultiplier = activeEvents.get(UserInputEvent.SpeedUp) ? 25 : 9;
        const moveAmount = speedMultiplier * 20;
        x = x * moveAmount;
        y = y * moveAmount;

        // Compute moving state
        const joystickMovement = activeEvents.get(UserInputEvent.JoystickMove);
        const moving = x !== 0 || y !== 0 || joystickMovement;

        // Compute direction
        let direction = this.lastDirection;
        if (moving && !joystickMovement) {
            if (Math.abs(x) > Math.abs(y)) {
                direction = x < 0 ? PlayerAnimationDirections.Left : PlayerAnimationDirections.Right;
            } else {
                direction = y < 0 ? PlayerAnimationDirections.Up : PlayerAnimationDirections.Down;
            }
        }

        // Send movement events
        const emit = () => this.emit(hasMovedEventName, { moving, direction, x: this.x, y: this.y });
        if (moving) {
            this.move(x, y);
            emit();
        } else if (get(userMovingStore)) {
            this.stop();
            emit();
        }

        // Update state
        userMovingStore.set(moving);
    }

    private computeFollowMovement(): number[] {
        // Find followed WOKA and abort following if we lost it
        const player = this.scene.MapPlayersByKey.get(get(followUsersStore)[0]);
        if (!player) {
            this.scene.connection?.emitFollowAbort();
            followStateStore.set(followStates.off);
            return [0, 0];
        }

        // Compute movement direction
        const xDistance = player.x - this.x;
        const yDistance = player.y - this.y;
        const distance = Math.pow(xDistance, 2) + Math.pow(yDistance, 2);
        if (distance < 2000) {
            return [0, 0];
        }
        const xMovement = xDistance / Math.sqrt(distance);
        const yMovement = yDistance / Math.sqrt(distance);
        return [xMovement, yMovement];
    }

    public enableFollowing() {
        followStateStore.set(followStates.active);
    }

    public moveUser(delta: number): void {
        const activeEvents = this.userInputManager.getEventListForGameTick();
        const state = get(followStateStore);
        const role = get(followRoleStore);

        if (state === followStates.off && this.scene.groups.size > 0) {
            followRoleStore.set(followRoles.open);
        } else if (this.scene.groups.size == 0) {
            followStateStore.set(followStates.off);
            followRoleStore.set(followRoles.leader);
        }

        if (activeEvents.get(UserInputEvent.Follow)) {
            if (state === followStates.off && this.scene.groups.size > 0) {
                followStateStore.set(followStates.requesting);
                followRoleStore.set(followRoles.leader);
            } else if (state === followStates.active) {
                followStateStore.set(followStates.ending);
            }
        }

        let x = 0;
        let y = 0;
        if ((state === followStates.active || state === followStates.ending) && role === followRoles.follower) {
            [x, y] = this.computeFollowMovement();
        }
        this.inputStep(activeEvents, x, y);
    }
}
