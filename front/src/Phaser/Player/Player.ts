import { PlayerAnimationDirections } from "./Animation";
import type { GameScene } from "../Game/GameScene";
import { ActiveEventList, UserInputEvent } from "../UserInput/UserInputManager";
import { Character } from "../Entity/Character";

import { get } from "svelte/store";
import { userMovingStore } from "../../Stores/GameStore";
import { followStateStore, followRoleStore, followUsersStore } from "../../Stores/FollowStore";
import type CancelablePromise from "cancelable-promise";

export const hasMovedEventName = "hasMoved";
export const requestEmoteEventName = "requestEmote";

export class Player extends Character {
    private pathToFollow?: { x: number; y: number }[];
    private followingPathPromiseResolve?: (result: { x: number; y: number; cancelled: boolean }) => void;
    private pathWalkingSpeed?: number;

    constructor(
        Scene: GameScene,
        x: number,
        y: number,
        name: string,
        texturesPromise: CancelablePromise<string[]>,
        direction: PlayerAnimationDirections,
        moving: boolean,
        companion: string | null,
        companionTexturePromise?: CancelablePromise<string>
    ) {
        super(Scene, x, y, texturesPromise, name, direction, moving, 1, true, companion, companionTexturePromise);

        //the current player model should be push away by other players to prevent conflict
        this.getBody().setImmovable(false);
    }

    public moveUser(delta: number, activeUserInputEvents: ActiveEventList): void {
        const state = get(followStateStore);
        const role = get(followRoleStore);

        if (activeUserInputEvents.get(UserInputEvent.Follow)) {
            if (state === "off" && this.scene.groups.size > 0) {
                this.sendFollowRequest();
            } else if (state === "active") {
                followStateStore.set("ending");
            }
        }

        if (this.pathToFollow && activeUserInputEvents.anyExcept(UserInputEvent.SpeedUp)) {
            this.finishFollowingPath(true);
        }

        let x = 0;
        let y = 0;
        if ((state === "active" || state === "ending") && role === "follower") {
            [x, y] = this.computeFollowMovement();
        }
        if (this.pathToFollow) {
            [x, y] = this.computeFollowPathMovement();
        }
        this.inputStep(activeUserInputEvents, x, y);
    }

    public sendFollowRequest() {
        this.scene.connection?.emitFollowRequest();
        followRoleStore.set("leader");
        followStateStore.set("active");
    }

    public startFollowing() {
        followStateStore.set("active");
        this.scene.connection?.emitFollowConfirmation();
    }

    public async setPathToFollow(
        path: { x: number; y: number }[],
        speed?: number
    ): Promise<{ x: number; y: number; cancelled: boolean }> {
        const isPreviousPathInProgress = this.pathToFollow !== undefined && this.pathToFollow.length > 0;
        // take collider offset into consideraton
        this.pathToFollow = this.adjustPathToFollowToColliderBounds(path);
        this.pathWalkingSpeed = speed;
        return new Promise((resolve) => {
            this.followingPathPromiseResolve?.call(this, { x: this.x, y: this.y, cancelled: isPreviousPathInProgress });
            this.followingPathPromiseResolve = resolve;
        });
    }

    private deduceSpeed(speedUp: boolean, followMode: boolean): number {
        return this.pathWalkingSpeed ? this.pathWalkingSpeed : speedUp && !followMode ? 25 : 9;
    }

    private adjustPathToFollowToColliderBounds(path: { x: number; y: number }[]): { x: number; y: number }[] {
        return path.map((step) => {
            return { x: step.x, y: step.y - this.getBody().offset.y };
        });
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
        const followMode = get(followStateStore) !== "off";
        const speed = this.deduceSpeed(activeEvents.get(UserInputEvent.SpeedUp), followMode);
        const moveAmount = speed * 20;
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
            followStateStore.set("off");
            return [0, 0];
        }

        // Compute movement direction
        const xDistance = player.x - this.x;
        const yDistance = player.y - this.y;
        const distance = Math.pow(xDistance, 2) + Math.pow(yDistance, 2);
        if (distance < 2000) {
            return [0, 0];
        }
        return this.getMovementDirection(xDistance, yDistance, distance);
    }

    private computeFollowPathMovement(): number[] {
        if (this.pathToFollow !== undefined && this.pathToFollow.length === 0) {
            this.finishFollowingPath();
        }
        if (!this.pathToFollow) {
            return [0, 0];
        }
        const nextStep = this.pathToFollow[0];

        // Compute movement direction
        const xDistance = nextStep.x - this.x;
        const yDistance = nextStep.y - this.y;
        const distance = Math.pow(xDistance, 2) + Math.pow(yDistance, 2);
        if (distance < 200) {
            this.pathToFollow.shift();
        }
        return this.getMovementDirection(xDistance, yDistance, distance);
    }

    private finishFollowingPath(cancelled: boolean = false): void {
        this.pathToFollow = undefined;
        this.pathWalkingSpeed = undefined;
        this.followingPathPromiseResolve?.call(this, { x: this.x, y: this.y, cancelled });
    }

    private getMovementDirection(xDistance: number, yDistance: number, distance: number): [number, number] {
        return [xDistance / Math.sqrt(distance), yDistance / Math.sqrt(distance)];
    }
}
