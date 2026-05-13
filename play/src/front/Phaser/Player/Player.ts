import type { Unsubscriber } from "svelte/store";
import { get } from "svelte/store";
import type CancelablePromise from "cancelable-promise";
import { AskPositionMessage_AskType, PositionMessage_Direction } from "@workadventure/messages";
import type { GameScene } from "../Game/GameScene";
import type { ActiveEventList } from "../UserInput/UserInputManager";
import { UserInputEvent } from "../UserInput/UserInputManager";
import { Character } from "../Entity/Character";

import { userMovingStore } from "../../Stores/GameStore";
import { followStateStore, followRoleStore, followUsersStore } from "../../Stores/FollowStore";
import { WOKA_SPEED } from "../../Enum/EnvironmentVariable";
import { visibilityStore } from "../../Stores/VisibilityStore";
import { passStatusToOnline } from "../../Rules/StatusRules/statusChangerFunctions";
import { localUserStore } from "../../Connection/LocalUserStore";

export const hasMovedEventName = "hasMoved";
export const requestEmoteEventName = "requestEmote";

export class Player extends Character {
    private readonly unsubscribeVisibilityStore: Unsubscriber;

    constructor(
        Scene: GameScene,
        x: number,
        y: number,
        name: string,
        texturesPromise: CancelablePromise<string[]>,
        direction: PositionMessage_Direction,
        moving: boolean,
        companionTexturePromise: CancelablePromise<string> | undefined
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
    }

    public moveUser(delta: number, activeUserInputEvents: ActiveEventList): void {
        const state = get(followStateStore);
        const role = get(followRoleStore);

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

    public setPathToFollow(
        path: { x: number; y: number }[],
        speed?: number
    ): Promise<{ x: number; y: number; cancelled: boolean }> {
        this.getBody().setDirectControl(true);
        return super.setPathToFollow(path, speed);
    }

    public getCurrentPathDestinationPoint(): { x: number; y: number } | undefined {
        if (!this.pathToFollow) {
            return undefined;
        }
        return this.pathToFollow[this.pathToFollow.length - 1];
    }

    private deduceSpeed(speedUp: boolean, followMode: boolean): number {
        return this.pathWalkingSpeed ? this.pathWalkingSpeed : speedUp && !followMode ? 2.5 * WOKA_SPEED : WOKA_SPEED;
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

        if (this.companion) {
            this.companion.setTarget(this.x, this.y, this._lastDirection);
        }
    }

    protected onPathFinished(wasFollowing: boolean): void {
        this.getBody().setDirectControl(false);
        if (wasFollowing) {
            this.emit(hasMovedEventName, { moving: false, direction: this._lastDirection, x: this.x, y: this.y });
        }
    }

    protected followPath(delta: number): void {
        super.followPath(delta);
        this.emit(hasMovedEventName, { moving: true, direction: this._lastDirection, x: this.x, y: this.y });
    }

    protected moveToPathPosition(x: number, y: number): void {
        passStatusToOnline();
        super.moveToPathPosition(x, y);
    }

    public finishFollowingPath(cancelled = false): void {
        const wasFollowing = this.isFollowingPath();
        super.finishFollowingPath(cancelled);
        this.onPathFinished(wasFollowing);
    }

    public teleportTo(x: number, y: number): void {
        this.setPosition(x, y);
        this.finishFollowingPath(true);
        this.emit(hasMovedEventName, { moving: false, direction: this._lastDirection, x: this.x, y: this.y });
        this.scene.markDirty();
    }

    public get walkingSpeed(): number | undefined {
        return this.pathWalkingSpeed;
    }

    public emitAskPosition(): void {
        this.scene.connection?.emitAskPosition(
            localUserStore.getLocalUser()?.uuid ?? "",
            this.scene.roomUrl,
            AskPositionMessage_AskType.LOCATE
        );
    }

    destroy(): void {
        this.unsubscribeVisibilityStore();
        super.destroy();
    }
}
