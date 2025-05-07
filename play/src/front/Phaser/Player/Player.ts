import { get, Unsubscriber } from "svelte/store";
import type CancelablePromise from "cancelable-promise";
import { PositionMessage_Direction } from "@workadventure/messages";
import type { GameScene } from "../Game/GameScene";
import type { ActiveEventList } from "../UserInput/UserInputManager";
import { UserInputEvent } from "../UserInput/UserInputManager";
import { Character } from "../Entity/Character";

import { userMovingStore } from "../../Stores/GameStore";
import { followStateStore, followRoleStore, followUsersStore } from "../../Stores/FollowStore";
import { WOKA_SPEED } from "../../Enum/EnvironmentVariable";
import { visibilityStore } from "../../Stores/VisibilityStore";
import { passStatusToOnline } from "../../Rules/StatusRules/statusChangerFunctions";

export const hasMovedEventName = "hasMoved";
export const requestEmoteEventName = "requestEmote";

export class Player extends Character {
    private pathToFollow?: { x: number; y: number }[];
    // Number of pixels the player has walked on the current path segment
    private currentPathSegmentDistanceFromStart = 0;
    private followingPathPromiseResolve?: (result: { x: number; y: number; cancelled: boolean }) => void;
    private pathWalkingSpeed?: number;
    private readonly unsubscribeVisibilityStore: Unsubscriber;
    //private readonly unsubscribeLayoutManagerActionStore: Unsubscriber;

    constructor(
        Scene: GameScene,
        x: number,
        y: number,
        name: string,
        texturesPromise: CancelablePromise<string[]>,
        direction: PositionMessage_Direction,
        moving: boolean,
        companionTexturePromise: CancelablePromise<string>
    ) {
        super(Scene, x, y, texturesPromise, name, direction, moving, 1, true, companionTexturePromise, "me");
        //the current player model should be push away by other players to prevent conflict
        this.getBody().setImmovable(false);

        this.unsubscribeVisibilityStore = visibilityStore.subscribe((isVisible) => {
            if (!isVisible) {
                this.stop();
                this.finishFollowingPath(true);
            }
        });

        /*this.unsubscribeLayoutManagerActionStore = layoutManagerActionStore.subscribe((actions) => {
            this.destroyAllText();
            actions.forEach((action) => {
                this.playText(action.uuid, `${action.message}`, -1, action.callback, undefined, action.type);
            });
        });*/
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
            this.followPath(delta);
        } else {
            this.inputStep(activeUserInputEvents, x, y);
        }
    }

    public rotate(): void {
        const direction = (this._lastDirection + 1) % (PositionMessage_Direction.LEFT + 1);
        this.emit(hasMovedEventName, {
            moving: false,
            direction: (this._lastDirection + 1) % (PositionMessage_Direction.LEFT + 1),
            x: this.x,
            y: this.y,
        });
        this._lastDirection = direction;
        this.companion?.setTarget(this.x, this.y, this._lastDirection);
        this.playAnimation(this._lastDirection, false);
    }

    public sendFollowRequest() {
        this.scene.connection?.emitFollowRequest();
        followRoleStore.set("leader");
        followStateStore.set("active");
    }

    public startFollowing() {
        followStateStore.set("active");
        this.scene.connection?.emitFollowConfirmation(get(followUsersStore)[0]);
    }

    public async setPathToFollow(
        path: { x: number; y: number }[],
        speed?: number
    ): Promise<{ x: number; y: number; cancelled: boolean }> {
        this.getBody().setDirectControl(true);
        const isPreviousPathInProgress = this.pathToFollow !== undefined && this.pathToFollow.length > 0;
        // take collider offset into consideration
        this.pathToFollow = this.adjustPathToFollowToColliderBounds(path);
        this.pathToFollow.unshift({ x: this.x, y: this.y });
        this.pathWalkingSpeed = speed;
        this.currentPathSegmentDistanceFromStart = 0;
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
        this.currentPathSegmentDistanceFromStart = 0;
        this.stop();
        this.followingPathPromiseResolve?.call(this, { x: this.x, y: this.y, cancelled });
        this.getBody().setDirectControl(false);
        this.emit(hasMovedEventName, { moving: false, direction: this._lastDirection, x: this.x, y: this.y });
    }

    private deduceSpeed(speedUp: boolean, followMode: boolean): number {
        return this.pathWalkingSpeed ? this.pathWalkingSpeed : speedUp && !followMode ? 2.5 * WOKA_SPEED : WOKA_SPEED;
    }

    private adjustPathToFollowToColliderBounds(path: { x: number; y: number }[]): { x: number; y: number }[] {
        return path.map((step) => {
            return { x: step.x, y: step.y - this.getBody().height / 2 - this.getBody().offset.y };
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
        let direction = this._lastDirection;
        if (moving && !joystickMovement) {
            if (Math.abs(x) > Math.abs(y)) {
                direction = x < 0 ? PositionMessage_Direction.LEFT : PositionMessage_Direction.RIGHT;
            } else {
                direction = y < 0 ? PositionMessage_Direction.UP : PositionMessage_Direction.DOWN;
            }
        }

        // Send movement events
        const emit = () => this.emit(hasMovedEventName, { moving, direction, x: this.x, y: this.y });
        if (moving) {
            this.moveBy(x, y);
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

    private followPath(delta: number): void {
        if (this.pathToFollow !== undefined && this.pathToFollow.length === 1) {
            this.finishFollowingPath();
        }
        if (!this.pathToFollow) {
            return;
        }
        let segmentStartPos = this.pathToFollow[0];
        let segmentEndPos = this.pathToFollow[1];

        // Compute movement direction
        let xDistance = segmentEndPos.x - segmentStartPos.x;
        let yDistance = segmentEndPos.y - segmentStartPos.y;
        let pathSegmentLength = Math.sqrt(Math.pow(xDistance, 2) + Math.pow(yDistance, 2));

        this.currentPathSegmentDistanceFromStart += (this.deduceSpeed(false, false) * delta * 20) / 1000;

        while (this.currentPathSegmentDistanceFromStart >= pathSegmentLength) {
            this.currentPathSegmentDistanceFromStart -= pathSegmentLength;

            this.pathToFollow.shift();
            if (this.pathToFollow.length === 1) {
                this.x = this.pathToFollow[0].x;
                this.y = this.pathToFollow[0].y;
                this.finishFollowingPath();
                return;
            }
            segmentStartPos = this.pathToFollow[0];
            segmentEndPos = this.pathToFollow[1];

            // Compute movement direction
            xDistance = segmentEndPos.x - segmentStartPos.x;
            yDistance = segmentEndPos.y - segmentStartPos.y;
            pathSegmentLength = Math.sqrt(Math.pow(xDistance, 2) + Math.pow(yDistance, 2));
        }

        const newX =
            segmentStartPos.x +
            (this.currentPathSegmentDistanceFromStart / pathSegmentLength) * (segmentEndPos.x - segmentStartPos.x);
        const newY =
            segmentStartPos.y +
            (this.currentPathSegmentDistanceFromStart / pathSegmentLength) * (segmentEndPos.y - segmentStartPos.y);

        this.moveToPos(newX, newY);

        this.emit(hasMovedEventName, { moving: true, direction: this._lastDirection, x: this.x, y: this.y });
        this.scene.markDirty();
        /*if (distance < 200) {
            this.pathToFollow.shift();
        }
        return this.getMovementDirection(xDistance, yDistance, distance);*/
    }

    private getMovementDirection(xDistance: number, yDistance: number, distance: number): [number, number] {
        return [xDistance / Math.sqrt(distance), yDistance / Math.sqrt(distance)];
    }

    /**
     * Moves the character by the given speed amount.
     */
    private moveBy(x: number, y: number) {
        const body = this.getBody();

        body.setVelocity(x, y);

        if (Math.abs(body.velocity.x) > Math.abs(body.velocity.y)) {
            if (body.velocity.x < 0) {
                this._lastDirection = PositionMessage_Direction.LEFT;
            } else if (body.velocity.x > 0) {
                this._lastDirection = PositionMessage_Direction.RIGHT;
            }
        } else {
            if (body.velocity.y < 0) {
                this._lastDirection = PositionMessage_Direction.UP;
            } else if (body.velocity.y > 0) {
                this._lastDirection = PositionMessage_Direction.DOWN;
            }
        }
        passStatusToOnline();
        this.playAnimation(this._lastDirection, true);
        this.setDepth(this.y + 16);

        if (this.companion) {
            this.companion.setTarget(this.x, this.y, this._lastDirection);
        }
    }

    /**
     * Moves the character to the given position.
     */
    private moveToPos(x: number, y: number) {
        const oldX = this.x;
        const oldY = this.y;
        this.x = x;
        this.y = y;
        // The 1.1 ratio to y is applied here because in path finding mode, the player often moves in diagonal.
        // In diagonal, the amount of x and y are almost equal. This produces a graphical glitch where on one frame,
        // the player goes left, and on the next frame, the player goes up. This is because the x and y are almost equal.
        // To fix this, we apply a ratio of 1.1 to y to make sure that the player goes up/down when the y and x are almost equal.
        if (Math.abs(x - oldX) > Math.abs((y - oldY) * 1.1)) {
            if (x < oldX) {
                this._lastDirection = PositionMessage_Direction.LEFT;
            } else if (x > oldX) {
                this._lastDirection = PositionMessage_Direction.RIGHT;
            }
        } else {
            if (y < oldY) {
                this._lastDirection = PositionMessage_Direction.UP;
            } else if (y > oldY) {
                this._lastDirection = PositionMessage_Direction.DOWN;
            }
        }
        passStatusToOnline();
        this.playAnimation(this._lastDirection, true);

        this.setDepth(this.y + 16);

        if (this.companion) {
            this.companion.setTarget(this.x, this.y, this._lastDirection);
        }
    }
    destroy(): void {
        this.unsubscribeVisibilityStore();
        //this.unsubscribeLayoutManagerActionStore();
        super.destroy();
    }
}
