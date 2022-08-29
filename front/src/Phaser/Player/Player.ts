import type { GameScene } from "../Game/GameScene";
import { ActiveEventList, UserInputEvent } from "../UserInput/UserInputManager";
import { Character } from "../Entity/Character";

import { get } from "svelte/store";
import { userMovingStore } from "../../Stores/GameStore";
import { followStateStore, followRoleStore, followUsersStore } from "../../Stores/FollowStore";
import type CancelablePromise from "cancelable-promise";
import { PositionMessage_Direction } from "../../Messages/ts-proto-generated/protos/messages";
import { MathUtils } from "@workadventure/math-utils";

export const hasMovedEventName = "hasMoved";
export const requestEmoteEventName = "requestEmote";

export class Player extends Character {
    private pathToFollow?: { x: number; y: number }[];
    private followingPathPromiseResolve?: (result: { x: number; y: number; cancelled: boolean }) => void;
    private pathWalkingSpeed?: number;
    private lastKnownX: number;
    private lastKnownY: number;

    constructor(
        Scene: GameScene,
        x: number,
        y: number,
        name: string,
        texturesPromise: CancelablePromise<string[]>,
        direction: PositionMessage_Direction,
        moving: boolean,
        companion: string | null,
        companionTexturePromise?: CancelablePromise<string>
    ) {
        super(Scene, x, y, texturesPromise, name, direction, moving, 1, true, companion, companionTexturePromise, "me");
        //the current player model should be push away by other players to prevent conflict
        this.getBody().setImmovable(false);

        this.lastKnownX = x;
        this.lastKnownY = y;
        this.scene.events.on("postupdate", this.detectOvershoot.bind(this));
    }

    /**
     * If we are moving towards a target, we are trying to detect if we "overshoot" the target or not.
     * This can happen on slow machines with unstable frame rate.
     */
    private detectOvershoot() {
        // This is triggered just after the Physics engine has run, on each frame

        // The current position should be within the bounding box made of the last known position and the target position
        if (this.pathToFollow && this.pathToFollow.length > 0) {
            const nearestTarget = this.pathToFollow[0];
            const left = Math.min(this.lastKnownX, nearestTarget.x);
            const right = Math.max(this.lastKnownX, nearestTarget.x);
            const top = Math.min(this.lastKnownY, nearestTarget.y);
            const bottom = Math.max(this.lastKnownY, nearestTarget.y);
            if (!(left <= this.x && this.x <= right && top <= this.y && this.y <= bottom)) {
                console.log("OVERSHOOT DETECTED!!!! WE WENT TOO FAR! LET'S RESET THE SPRITE POSITION");
                //this.setPosition(nearestTarget.x, nearestTarget.y);
                // TODO: we need to find a way to reset the sprite position here
                // TODO: we probably need to stop the sprite too!
            }
        }

        this.lastKnownX = this.x;
        this.lastKnownY = this.y;
    }

    public moveUser(dt: number, activeUserInputEvents: ActiveEventList): void {
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
            [x, y] = this.computeFollowPathMovement(dt);
        }
        this.inputStep(activeUserInputEvents, x, y, dt);
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
        // take collider offset into consideration
        this.pathToFollow = this.adjustPathToFollowToColliderBounds(path);
        this.pathWalkingSpeed = speed;
        return new Promise((resolve) => {
            this.followingPathPromiseResolve?.call(this, { x: this.x, y: this.y, cancelled: isPreviousPathInProgress });
            this.followingPathPromiseResolve = resolve;
        });
    }

    public getCurrentPathDestinationPoint(): { x: number; y: number } | undefined {
        if (!this.pathToFollow) {
            return undefined;
        }
        return this.pathToFollow[this.pathToFollow.length - 1];
    }

    public finishFollowingPath(cancelled = false): void {
        this.pathToFollow = undefined;
        this.pathWalkingSpeed = undefined;
        this.followingPathPromiseResolve?.call(this, { x: this.x, y: this.y, cancelled });
    }

    private deduceSpeed(speedUp: boolean, followMode: boolean): number {
        return this.pathWalkingSpeed ? this.pathWalkingSpeed : speedUp && !followMode ? 500 : 180;
    }

    private adjustPathToFollowToColliderBounds(path: { x: number; y: number }[]): { x: number; y: number }[] {
        return path.map((step) => {
            return { x: step.x, y: step.y - this.getBody().offset.y };
        });
    }

    private inputStep(activeEvents: ActiveEventList, x: number, y: number, dt: number) {
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
        let velocityX = x * speed;
        let velocityY = y * speed;
        // Compute moving state
        const joystickMovement = activeEvents.get(UserInputEvent.JoystickMove);
        const moving = velocityX !== 0 || velocityY !== 0 || joystickMovement;

        // Compute direction
        let direction = this.lastDirection;
        if (moving && !joystickMovement) {
            if (Math.abs(velocityX) > Math.abs(velocityY)) {
                direction = velocityX < 0 ? PositionMessage_Direction.LEFT : PositionMessage_Direction.RIGHT;
            } else {
                direction = velocityY < 0 ? PositionMessage_Direction.UP : PositionMessage_Direction.DOWN;
            }
        }

        // we are currently following the path
        if (this.pathToFollow && this.pathToFollow.length > 0) {
            const nearestTarget = this.pathToFollow[0];
            const distanceToTarget = MathUtils.distanceBetween({ x: this.x, y: this.y }, nearestTarget);
            const distanceToTraveldThisFrame = MathUtils.distanceTraveledInTime({ x: velocityX, y: velocityY }, dt);

            if (distanceToTarget < distanceToTraveldThisFrame) {
                velocityX *= distanceToTarget / distanceToTraveldThisFrame;
                velocityY *= distanceToTarget / distanceToTraveldThisFrame;
            }
        }

        // Send movement events
        const emit = () => this.emit(hasMovedEventName, { moving, direction, x: this.x, y: this.y });
        if (moving) {
            this.move(velocityX, velocityY);
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

    private computeFollowPathMovement(dt: number): number[] {
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
        if (distance < 10 * dt) {
            this.pathToFollow.shift();
        }
        return this.getMovementDirection(xDistance, yDistance, distance);
    }

    private getMovementDirection(xDistance: number, yDistance: number, distance: number): [number, number] {
        return [xDistance / Math.sqrt(distance), yDistance / Math.sqrt(distance)];
    }
}
