import { mapEditorModeStore } from "../../Stores/MapEditorStore";
import { Easing } from "../../types";
import { HtmlUtils } from "../../WebRtc/HtmlUtils";
import type { Box } from "../../WebRtc/LayoutManager";
import type { Character } from "../Entity/Character";
import { hasMovedEventName, type Player } from "../Player/Player";
import type { WaScaleManager, WaScaleManagerFocusTarget } from "../Services/WaScaleManager";
import { WaScaleManagerEvent } from "../Services/WaScaleManager";
import type { ActiveEventList } from "../UserInput/UserInputManager";
import { UserInputEvent } from "../UserInput/UserInputManager";
import type { RemotePlayer } from "../Entity/RemotePlayer";
import type { GameScene } from "./GameScene";
import Clamp = Phaser.Math.Clamp;

export enum CameraManagerEvent {
    CameraUpdate = "CameraUpdate",
}

export interface CameraManagerEventCameraUpdateData {
    x: number;
    y: number;
    width: number;
    height: number;
    zoom: number;
}

type FocusCameraAnimation = {
    type: "focus";
    onInterrupt: () => void;
};

type SpeedCameraAnimation = {
    type: "speed";
    speedX: number;
    speedY: number;
    onComplete: () => void;
    onInterrupt: () => void;
};

type CameraAnimation = FocusCameraAnimation | SpeedCameraAnimation;

type ZoomAnimation = {
    onInterrupt: () => void;
};

/**
 * The CameraManager is responsible for managing the camera in the game.
 * It allows to set the camera to follow the player, to focus on a specific point or to be in exploration mode.
 *
 * The CameraManager handles the transitions / animations between the different camera modes.
 * It also handles the smooth zoom in and out of the camera.
 */
export class CameraManager extends Phaser.Events.EventEmitter {
    private camera: Phaser.Cameras.Scene2D.Camera;
    private waScaleManager: WaScaleManager;

    private cameraAnimation: CameraAnimation | undefined;
    private zoomAnimation: ZoomAnimation | undefined;

    private playerToFollow?: Player | RemotePlayer;
    private zoomLocked: boolean;

    private readonly EDITOR_MODE_SCROLL_SPEED: number = 5;

    private readonly unsubscribeMapEditorModeStore: () => void;

    private _resistanceEndZoomLevel = 0.3;

    // The point of the scene the explorer mode is focusing on.
    private explorerFocusOn: { x: number; y: number } = { x: 0, y: 0 };

    // The tween for the camera offset
    private cameraOffsetCurrentTween?: Phaser.Tweens.Tween;

    // The box we should center the camera on (expressed in screen pixels, not game pixels).
    private cameraOffsetBox: Box | undefined;

    // Target follow offset for the camera, expressed in game pixels.
    private targetFollowOffset: { x: number; y: number } | undefined;

    constructor(
        private scene: GameScene,
        private mapSize: { width: number; height: number },
        waScaleManager: WaScaleManager
    ) {
        super();

        this.camera = scene.cameras.main;
        this.zoomLocked = false;

        this.waScaleManager = waScaleManager;

        this.initCamera();

        this.bindEventHandlers();

        // Subscribe to map editor mode store to change camera bounds when the map editor is opened or closed
        this.unsubscribeMapEditorModeStore = mapEditorModeStore.subscribe((isOpened) => {
            // Define new bounds for camera if the map editor is opened
            if (isOpened) {
                this.camera.setBounds(0, 0, this.mapSize.width * 2, this.mapSize.height);
            } else {
                // We set the bounds back after a call to start following the player
                //this.camera.setBounds(0, 0, this.mapSize.width, this.mapSize.height);
            }
        });

        // Set zoom out to the maximum possible value
        this.waScaleManager.maxZoomOut = this.waScaleManager.getTargetZoomModifierFor(
            this.mapSize.width,
            this.mapSize.height
        );

        this.scene.game.events.on(WaScaleManagerEvent.ZoomChanged, this.onZoomChanged);
    }

    private readonly onZoomChanged = (): void => {
        this.doUpdateCameraOffset(true);
    };

    public destroy(): void {
        this.cancelOffsetTween();
        this.scene.game.events.off(WaScaleManagerEvent.ZoomChanged, this.onZoomChanged);

        this.scene.game.events.off(WaScaleManagerEvent.RefreshFocusOnTarget);
        this.camera.off("followupdate", this.onFollowUpdate);
        this.unsubscribeMapEditorModeStore();
        super.destroy();
    }

    public getCamera(): Phaser.Cameras.Scene2D.Camera {
        return this.camera;
    }

    private animateToFocus(
        target: Character | { x: number; y: number },
        duration: number,
        callback?: () => void
    ): void {
        this.cameraAnimation?.onInterrupt();
        const origin = {
            x: this.camera.scrollX + this.camera.width / 2 + this.camera.followOffset.x,
            y: this.camera.scrollY + this.camera.height / 2 + this.camera.followOffset.y,
        };
        this.explorerFocusOn = { ...origin };

        this.camera.startFollow(
            this.explorerFocusOn,
            true,
            1,
            1,
            this.camera.followOffset.x,
            this.camera.followOffset.y
        );

        // Note: if duration = 0, the addCounter onUpdate is directly triggered to the "1" progress value.
        const followTween = this.scene.tweens.addCounter({
            from: 0,
            to: 1,
            duration,
            ease: Easing.SineEaseOut,
            onUpdate: (tween: Phaser.Tweens.Tween) => {
                const progress = tween.getValue() ?? 0;
                const shiftX = (target.x - origin.x) * progress;
                const shiftY = (target.y - origin.y) * progress;
                this.explorerFocusOn.x = origin.x + shiftX;
                this.explorerFocusOn.y = origin.y + shiftY;

                this.emit(CameraManagerEvent.CameraUpdate, this.getCameraUpdateEventData());
            },
            onComplete: () => {
                this.camera.startFollow(target, true, 1, 1, this.camera.followOffset.x, this.camera.followOffset.y);
                this.camera.setBounds(0, 0, this.mapSize.width, this.mapSize.height);
                callback?.();
                this.setFollowMode();
            },
        });

        this.cameraAnimation = {
            type: "focus",
            onInterrupt: () => {
                followTween.stop();
                followTween.destroy();
            },
        };
    }

    /**
     * Set camera view to specific destination without changing current camera mode.
     * @param setTo Viewport on which the camera should set the position
     * @param duration Time for the transition im MS. If set to 0, transition will occur immediately
     */
    public setPosition(setTo: WaScaleManagerFocusTarget, duration = 1000): void {
        this.waScaleManager.saveZoom();
        this.camera.stopFollow();

        const currentZoomModifier = this.waScaleManager.zoomModifier;
        const zoomModifierChange = this.getZoomModifierChange(setTo.width, setTo.height);

        this.animateToFocus(setTo, duration, () => {});
        this.animateToZoomLevel(currentZoomModifier + zoomModifierChange, duration);

        this.playerToFollow?.once(hasMovedEventName, () => {
            if (this.playerToFollow) {
                this.startFollowPlayer(this.playerToFollow, duration);
            }
        });
    }

    /**
     * Set camera to focus mode. As long as the camera is in the Focus mode, its view cannot be changed.
     */
    public enterFocusMode(focusOn: WaScaleManagerFocusTarget, margin = 0, duration = 1000): void {
        this.waScaleManager.saveZoom();
        this.waScaleManager.setFocusTarget(focusOn);

        this.zoomLocked = false;

        //Set the camera to focus on the given point
        const focusPoint = {
            x: focusOn.x,
            y: focusOn.y,
        };

        const currentZoomModifier = this.waScaleManager.zoomModifier;
        const zoomModifierChange = this.getZoomModifierChange(focusOn.width, focusOn.height, 1 + margin);

        this.animateToFocus(focusPoint, duration, () => {});
        this.animateToZoomLevel(currentZoomModifier + zoomModifierChange, duration);
    }

    public leaveFocusMode(player: Player, duration = 0): void {
        this.waScaleManager.setFocusTarget();
        this.startFollowPlayer(player, duration);
        this.restoreZoom(duration);
    }

    public move(moveEvents: ActiveEventList): void {
        let sendViewportUpdate = false;
        if (moveEvents.get(UserInputEvent.MoveUp)) {
            this.explorerFocusOn.y -= this.EDITOR_MODE_SCROLL_SPEED;
            this.explorerFocusOn.y = Clamp(this.explorerFocusOn.y, 0, this.mapSize.height);
            this.scene.markDirty();
            sendViewportUpdate = true;
        } else if (moveEvents.get(UserInputEvent.MoveDown)) {
            this.explorerFocusOn.y += this.EDITOR_MODE_SCROLL_SPEED;
            this.explorerFocusOn.y = Clamp(this.explorerFocusOn.y, 0, this.mapSize.height);
            this.scene.markDirty();
            sendViewportUpdate = true;
        }

        if (moveEvents.get(UserInputEvent.MoveLeft)) {
            this.explorerFocusOn.x -= this.EDITOR_MODE_SCROLL_SPEED;
            this.explorerFocusOn.x = Clamp(this.explorerFocusOn.x, 0, this.mapSize.width);
            this.scene.markDirty();
            sendViewportUpdate = true;
        } else if (moveEvents.get(UserInputEvent.MoveRight)) {
            this.explorerFocusOn.x += this.EDITOR_MODE_SCROLL_SPEED;
            this.explorerFocusOn.x = Clamp(this.explorerFocusOn.x, 0, this.mapSize.width);
            this.scene.markDirty();
            sendViewportUpdate = true;
        }

        if (sendViewportUpdate) {
            this.scene.sendViewportToServer();
        }
    }

    public startFollowPlayer(player: Player | RemotePlayer, duration = 0): void {
        this.playerToFollow = player;

        this.animateToFocus(player, duration, () => {});
        return;
    }

    /**
     * Follow a remote player by their ID. Centers the camera on them and shows a popup.
     */
    public followRemotePlayer(userId: number): void {
        // Find the remote player by UserId
        const remotePlayer = this.scene.MapPlayersByKey.get(userId);

        if (!remotePlayer) {
            console.warn(`Remote player with ID ${userId} not found`);
            return;
        }

        // Restore camera mode
        this.startFollowPlayer(remotePlayer, 1000);
    }

    /**
     * Stop following a remote player.
     */
    public stopFollowRemotePlayer(): void {
        // Start following the current player
        this.startFollowPlayer(this.scene.CurrentPlayer, 1000);
    }

    /**
     * Takes the camera offset box (expressed in screen pixels) and update the targetFollowOffset (expressed in game pixels),
     * according to the current zoom level.
     */
    private updateTargetFollowOffset(): { x: number; y: number } {
        const box = this.cameraOffsetBox;
        if (!box) {
            return this.targetFollowOffset ?? { x: 0, y: 0 };
        }
        const xCenter = (box.xEnd - box.xStart) / 2 + box.xStart;
        const yCenter = (box.yEnd - box.yStart) / 2 + box.yStart;

        const game = HtmlUtils.querySelectorOrFail<HTMLDivElement>("#game");

        // Let's put this in Game coordinates by applying the zoom level:
        this.targetFollowOffset = {
            x: (xCenter - game.offsetWidth / 2) / this.scene.scale.zoom / this.camera.zoom,
            y: (yCenter - game.offsetHeight / 2) / this.scene.scale.zoom / this.camera.zoom,
        };
        return this.targetFollowOffset;
    }

    /**
     * Updates the offset of the character compared to the center of the screen according to the layout manager
     * (tries to put the character in the center of the remaining space if there is a discussion going on).
     */
    public updateCameraOffset(box: Box, instant = false): void {
        if (box.xEnd === undefined || box.yEnd === undefined) {
            return;
        }

        if (
            this.cameraOffsetBox &&
            box.xStart === this.cameraOffsetBox.xStart &&
            box.yStart === this.cameraOffsetBox.yStart &&
            box.xEnd === this.cameraOffsetBox.xEnd &&
            box.yEnd === this.cameraOffsetBox.yEnd
        ) {
            return;
        }

        this.cameraOffsetBox = box;
        this.doUpdateCameraOffset(instant);
    }

    public doUpdateCameraOffset(instant = false): void {
        const targetFollowOffset = this.updateTargetFollowOffset();

        if (instant) {
            if (!this.cameraOffsetCurrentTween) {
                this.camera.setFollowOffset(targetFollowOffset.x, targetFollowOffset.y);
                this.scene.markDirty();
                return;
            } else {
                // If we are requested to update the offset immediately, but we are in the middle of an animation of the offset,
                // let's keep the animation playing and simply update the offset.
                return;
            }
        }

        this.cancelOffsetTween();

        const oldFollowOffsetX = this.camera.followOffset.x;
        const oldFollowOffsetY = this.camera.followOffset.y;

        this.cameraOffsetCurrentTween = this.scene.tweens.addCounter({
            from: 0,
            to: 1,
            duration: 500,
            ease: Easing.QuadEaseOut,
            onUpdate: (tween) => {
                const progress = tween.getValue() ?? 0;
                if (!this.targetFollowOffset) {
                    console.warn("No more target for follow offset during animation");
                    return;
                }
                const newOffsetX = oldFollowOffsetX + (this.targetFollowOffset.x - oldFollowOffsetX) * progress;
                const newOffsetY = oldFollowOffsetY + (this.targetFollowOffset.y - oldFollowOffsetY) * progress;
                this.camera.setFollowOffset(newOffsetX, newOffsetY);
                this.scene.markDirty();
            },
            onComplete: () => {
                this.cameraOffsetCurrentTween = undefined;
            },
        });
    }

    public isZoomLocked(): boolean {
        return this.zoomLocked;
    }

    private getZoomModifierChange(width?: number, height?: number, multiplier = 1): number {
        if (!width || !height) {
            return 0;
        }
        const targetZoomModifier = this.waScaleManager.getTargetZoomModifierFor(
            width * multiplier,
            height * multiplier
        );
        const currentZoomModifier = this.waScaleManager.zoomModifier;
        return targetZoomModifier - currentZoomModifier;
    }

    public defineNewCameraBounds(width: number, height: number): void {
        this.camera.setBounds(-width, -height, width * 3, height * 3, false);
    }

    public lockZoom(): void {
        this.zoomLocked = true;
    }

    public unlockZoom(): void {
        this.zoomLocked = false;
    }

    private restoreZoom(duration = 0): void {
        this.animateToZoomLevel(this.waScaleManager.getSaveZoom(), duration);
    }

    private initCamera() {
        this.camera = this.scene.cameras.main;
        this.camera.setBounds(0, 0, this.mapSize.width, this.mapSize.height);
    }

    private onFollowUpdate = () => {
        this.emit(CameraManagerEvent.CameraUpdate, this.getCameraUpdateEventData());
    };

    private bindEventHandlers(): void {
        this.scene.game.events.on(
            WaScaleManagerEvent.RefreshFocusOnTarget,
            (focusOn: { x: number; y: number; width: number; height: number }) => {
                if (!focusOn) {
                    return;
                }

                this.camera.centerOn(focusOn.x, focusOn.y);

                this.emit(CameraManagerEvent.CameraUpdate, this.getCameraUpdateEventData());
            }
        );

        this.camera.on("followupdate", this.onFollowUpdate);
    }

    private getCameraUpdateEventData(): CameraManagerEventCameraUpdateData {
        return {
            x: this.camera.worldView.x,
            y: this.camera.worldView.y,
            width: this.camera.worldView.width,
            height: this.camera.worldView.height,
            zoom: this.camera.scaleManager.zoom,
        };
    }

    // Create function to define the camera on exploration mode. The camera can be moved anywhere on the map. The camera is not locked on the player. The camera can be zoomed in and out. The camera can be moved with the mouse. The camera can be moved with the keyboard. The camera can be moved with the touchpad.
    public setExplorationMode(): void {
        this.camera.setFollowOffset(0, 0);

        this.camera.setBounds(
            -this.mapSize.width,
            -this.mapSize.height,
            this.mapSize.width * 3,
            this.mapSize.height * 3,
            false
        );

        this.explorerFocusOn = {
            x: this.camera.scrollX + this.camera.width / 2,
            y: this.camera.scrollY + this.camera.height / 2,
        };
        this.camera.startFollow(this.explorerFocusOn, true);
    }

    public setFollowMode(): void {
        this.scene.reposition();
    }

    private cancelOffsetTween(): void {
        this.stopTween(this.cameraOffsetCurrentTween);
        this.cameraOffsetCurrentTween = undefined;
    }

    private stopTween(tween: Phaser.Tweens.Tween | undefined): void {
        if (!tween) {
            return;
        }

        tween.stop();
        tween.destroy();
    }

    public centerCameraOn(position: { x: number; y: number }, zoom?: number): void {
        this.animateToFocus(position, 1000);
        if (zoom) {
            this.animateToZoomLevel(zoom, 1000);
        }
    }

    /**
     * Zooms the camera by a factor passed in parameter.
     */
    public zoomByFactor(zoomFactor: number, duration: number, callback?: () => void): void {
        this.animateToZoomLevel(this.waScaleManager.zoomModifier * zoomFactor, duration, callback);
    }

    private animateToZoomLevel(targetZoomModifier: number, duration: number, callback?: () => void): void {
        this.zoomAnimation?.onInterrupt();

        const zoomTween = this.scene.tweens.addCounter({
            from: this.waScaleManager.zoomModifier,
            to: targetZoomModifier,
            duration,
            ease: Easing.SineEaseOut,
            onUpdate: (tween: Phaser.Tweens.Tween) => {
                this.waScaleManager.setZoomModifier(tween.getValue() ?? 0, this.camera);

                this.emit(CameraManagerEvent.CameraUpdate, this.getCameraUpdateEventData());
            },
            onComplete: () => {
                callback?.();
            },
        });

        this.zoomAnimation = {
            onInterrupt: () => {
                zoomTween.stop();
                zoomTween.destroy();
            },
        };
    }
    private animate = (time: number, delta: number): void => {
        const cameraSpeed = this.cameraAnimation;
        if (cameraSpeed?.type !== "speed") {
            console.warn(
                "Camera animation is not in speed mode but animate callback is called. This should not happen."
            );
            return;
        }

        this.explorerFocusOn.x += (cameraSpeed.speedX * delta) / 400;
        this.explorerFocusOn.y += (cameraSpeed.speedY * delta) / 400;

        this.explorerFocusOn.x = Clamp(this.explorerFocusOn.x, 0, this.mapSize.width);
        this.explorerFocusOn.y = Clamp(this.explorerFocusOn.y, 0, this.mapSize.height);

        // Now, let's slow down the camera a bit
        cameraSpeed.speedX *= 1 - delta / 500;
        cameraSpeed.speedY *= 1 - delta / 500;
        if (Math.pow(cameraSpeed.speedX, 2) + Math.pow(cameraSpeed.speedY, 2) < 20) {
            cameraSpeed.onComplete();
        }

        this.emit(CameraManagerEvent.CameraUpdate, this.getCameraUpdateEventData());
    };

    get resistanceEndZoomLevel(): number {
        return this._resistanceEndZoomLevel;
    }

    setSpeed(speed: { x: number; y: number }) {
        this.cameraAnimation?.onInterrupt();

        this.cameraAnimation = {
            type: "speed",
            speedX: speed.x,
            speedY: speed.y,
            onComplete: () => {
                this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.animate);
            },
            onInterrupt: () => {
                this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.animate);
            },
        };

        this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.animate);
    }

    stopSpeed() {
        if (this.cameraAnimation?.type === "speed") {
            this.cameraAnimation.onInterrupt();
        }
    }

    scrollCamera(x: number, y: number): void {
        this.explorerFocusOn.x += x;
        this.explorerFocusOn.y += y;

        this.explorerFocusOn.x = Clamp(this.explorerFocusOn.x, 0, this.mapSize.width);
        this.explorerFocusOn.y = Clamp(this.explorerFocusOn.y, 0, this.mapSize.height);

        this.emit(CameraManagerEvent.CameraUpdate, this.getCameraUpdateEventData());
        this.scene.markDirty();
    }

    get playerFollowing(): Player | RemotePlayer | undefined {
        return this.playerToFollow;
    }
}
