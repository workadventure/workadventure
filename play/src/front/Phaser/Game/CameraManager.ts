import { mapEditorModeStore } from "../../Stores/MapEditorStore";
import { Easing } from "../../types";
import { HtmlUtils } from "../../WebRtc/HtmlUtils";
import type { Box } from "../../WebRtc/LayoutManager";
import type { Player } from "../Player/Player";
import { hasMovedEventName } from "../Player/Player";
import type { WaScaleManagerFocusTarget, WaScaleManager } from "../Services/WaScaleManager";
import { WaScaleManagerEvent } from "../Services/WaScaleManager";
import type { ActiveEventList } from "../UserInput/UserInputManager";
import { UserInputEvent } from "../UserInput/UserInputManager";
import type { GameScene } from "./GameScene";

export enum CameraMode {
    /**
     * Camera looks at certain point but is not locked and will start following the player on his movement
     */
    Positioned = "Positioned",
    /**
     * Camera is actively following the player
     */
    Follow = "Follow",
    /**
     * Camera is focusing on certain point and will not break this focus even on player movement
     */
    Focus = "Focus",
}

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

export class CameraManager extends Phaser.Events.EventEmitter {
    private scene: GameScene;
    private camera: Phaser.Cameras.Scene2D.Camera;
    private cameraBounds: { x: number; y: number };
    private waScaleManager: WaScaleManager;

    private cameraMode: CameraMode = CameraMode.Positioned;

    private restoreZoomTween?: Phaser.Tweens.Tween;
    private startFollowTween?: Phaser.Tweens.Tween;

    private playerToFollow?: Player;
    private cameraLocked: boolean;

    private readonly EDITOR_MODE_SCROLL_SPEED: number = 5;

    private unsubscribeMapEditorModeStore: () => void;

    constructor(scene: GameScene, cameraBounds: { x: number; y: number }, waScaleManager: WaScaleManager) {
        super();
        this.scene = scene;

        this.camera = scene.cameras.main;
        this.cameraBounds = cameraBounds;
        this.cameraLocked = false;

        this.waScaleManager = waScaleManager;

        this.initCamera();

        this.bindEventHandlers();

        // Subscribe to map editor mode store to change camera bounds when the map editor is opened or closed
        this.unsubscribeMapEditorModeStore = mapEditorModeStore.subscribe((isOpened) => {
            // Define new bounds for camera if the map editor is opened
            if (isOpened) {
                this.camera.setBounds(0, 0, this.cameraBounds.x * 2, this.cameraBounds.y);
            } else {
                this.camera.setBounds(0, 0, this.cameraBounds.x, this.cameraBounds.y);
            }
        });
    }

    public destroy(): void {
        this.scene.game.events.off(WaScaleManagerEvent.RefreshFocusOnTarget);
        this.unsubscribeMapEditorModeStore();
        super.destroy();
    }

    public getCamera(): Phaser.Cameras.Scene2D.Camera {
        return this.camera;
    }

    /**
     * Set camera view to specific destination without changing current camera mode. Won't work if camera mode is set to Focus.
     * @param setTo Viewport on which the camera should set the position
     * @param duration Time for the transition im MS. If set to 0, transition will occur immediately
     */
    public setPosition(setTo: WaScaleManagerFocusTarget, duration = 1000): void {
        if (this.cameraMode === CameraMode.Focus) {
            return;
        }
        this.setCameraMode(CameraMode.Positioned);
        this.waScaleManager.saveZoom();
        this.camera.stopFollow();

        const currentZoomModifier = this.waScaleManager.zoomModifier;
        const zoomModifierChange = this.getZoomModifierChange(setTo.width, setTo.height);

        if (duration === 0) {
            this.waScaleManager.zoomModifier = currentZoomModifier + zoomModifierChange;
            this.camera.centerOn(setTo.x, setTo.y);
            this.emit(CameraManagerEvent.CameraUpdate, this.getCameraUpdateEventData());
            this.playerToFollow?.once(hasMovedEventName, () => {
                if (this.playerToFollow) {
                    this.startFollowPlayer(this.playerToFollow, duration);
                }
            });
            return;
        }
        this.camera.pan(setTo.x, setTo.y, duration, Easing.SineEaseOut, true, (camera, progress, x, y) => {
            if (this.cameraMode === CameraMode.Positioned) {
                this.waScaleManager.zoomModifier = currentZoomModifier + progress * zoomModifierChange;
                this.emit(CameraManagerEvent.CameraUpdate, this.getCameraUpdateEventData());
            }
            if (progress === 1) {
                this.playerToFollow?.once(hasMovedEventName, () => {
                    if (this.playerToFollow) {
                        this.startFollowPlayer(this.playerToFollow, duration);
                    }
                });
            }
        });
    }

    /**
     * Set camera to focus mode. As long as the camera is in the Focus mode, its view cannot be changed.
     * @param setTo Viewport on which the camera should focus on
     * @param duration Time for the transition im MS. If set to 0, transition will occur immediately
     */
    public enterFocusMode(focusOn: WaScaleManagerFocusTarget, margin = 0, duration = 1000): void {
        this.setCameraMode(CameraMode.Focus);
        this.waScaleManager.saveZoom();
        this.waScaleManager.setFocusTarget(focusOn);
        this.cameraLocked = true;

        this.unlockCameraWithDelay(duration);
        this.restoreZoomTween?.stop();
        this.startFollowTween?.stop();
        this.camera.stopFollow();
        this.playerToFollow = undefined;

        const currentZoomModifier = this.waScaleManager.zoomModifier;
        const zoomModifierChange = this.getZoomModifierChange(focusOn.width, focusOn.height, 1 + margin);

        if (duration === 0) {
            this.waScaleManager.zoomModifier = currentZoomModifier + zoomModifierChange;
            this.camera.centerOn(focusOn.x, focusOn.y);
            this.emit(CameraManagerEvent.CameraUpdate, this.getCameraUpdateEventData());
            return;
        }
        this.camera.pan(focusOn.x, focusOn.y, duration, Easing.SineEaseOut, true, (camera, progress, x, y) => {
            this.waScaleManager.zoomModifier = currentZoomModifier + progress * zoomModifierChange;
            if (progress === 1) {
                // NOTE: Making sure the last action will be centering after zoom change
                this.camera.centerOn(focusOn.x, focusOn.y);
            }
            this.emit(CameraManagerEvent.CameraUpdate, this.getCameraUpdateEventData());
        });
    }

    public leaveFocusMode(player: Player, duration = 0): void {
        this.waScaleManager.setFocusTarget();
        this.unlockCameraWithDelay(duration);
        this.startFollowPlayer(player, duration);
        this.restoreZoom(duration);
    }

    public move(moveEvents: ActiveEventList): void {
        let sendViewportUpdate = false;
        if (moveEvents.get(UserInputEvent.MoveUp)) {
            this.camera.scrollY -= this.EDITOR_MODE_SCROLL_SPEED;
            this.scene.markDirty();
            sendViewportUpdate = true;
        } else if (moveEvents.get(UserInputEvent.MoveDown)) {
            this.camera.scrollY += this.EDITOR_MODE_SCROLL_SPEED;
            this.scene.markDirty();
            sendViewportUpdate = true;
        }

        if (moveEvents.get(UserInputEvent.MoveLeft)) {
            this.camera.scrollX -= this.EDITOR_MODE_SCROLL_SPEED;
            this.scene.markDirty();
            sendViewportUpdate = true;
        } else if (moveEvents.get(UserInputEvent.MoveRight)) {
            this.camera.scrollX += this.EDITOR_MODE_SCROLL_SPEED;
            this.scene.markDirty();
            sendViewportUpdate = true;
        }

        if (sendViewportUpdate) {
            this.scene.sendViewportToServer();
        }
    }

    public scrollBy(x: number, y: number): void {
        this.camera.scrollX += x;
        this.camera.scrollY += y;
        this.scene.markDirty();
    }

    public startFollowPlayer(player: Player, duration = 0): void {
        this.playerToFollow = player;
        this.setCameraMode(CameraMode.Follow);
        if (duration === 0) {
            this.camera.startFollow(player, true);
            this.scene.markDirty();
            return;
        }
        const oldPos = { x: this.camera.scrollX, y: this.camera.scrollY };
        this.startFollowTween = this.scene.tweens.addCounter({
            from: 0,
            to: 1,
            duration,
            ease: Easing.SineEaseOut,
            onUpdate: (tween: Phaser.Tweens.Tween) => {
                if (!this.playerToFollow) {
                    return;
                }
                const shiftX =
                    (this.playerToFollow.x - this.camera.worldView.width * 0.5 - oldPos.x) * tween.getValue();
                const shiftY =
                    (this.playerToFollow.y - this.camera.worldView.height * 0.5 - oldPos.y) * tween.getValue();
                this.camera.setScroll(oldPos.x + shiftX, oldPos.y + shiftY);
                this.emit(CameraManagerEvent.CameraUpdate, this.getCameraUpdateEventData());
            },
            onComplete: () => {
                this.camera.startFollow(player, true);
            },
        });
    }

    public stopFollow(): void {
        this.camera.stopFollow();
        this.setCameraMode(CameraMode.Positioned);
        this.scene.markDirty();
    }

    /**
     * Updates the offset of the character compared to the center of the screen according to the layout manager
     * (tries to put the character in the center of the remaining space if there is a discussion going on.
     */
    public updateCameraOffset(box: Box, instant = false): void {
        const xCenter = (box.xEnd - box.xStart) / 2 + box.xStart;
        const yCenter = (box.yEnd - box.yStart) / 2 + box.yStart;

        const game = HtmlUtils.querySelectorOrFail<HTMLCanvasElement>("#game canvas");
        // Let's put this in Game coordinates by applying the zoom level:

        const followOffsetX = ((xCenter - game.offsetWidth / 2) * window.devicePixelRatio) / this.scene.scale.zoom;
        const followOffsetY = ((yCenter - game.offsetHeight / 2) * window.devicePixelRatio) / this.scene.scale.zoom;

        if (instant) {
            this.camera.setFollowOffset(followOffsetX, followOffsetY);
            this.scene.markDirty();
            return;
        }

        const oldFollowOffsetX = this.camera.followOffset.x;
        const oldFollowOffsetY = this.camera.followOffset.y;

        this.scene.tweens.addCounter({
            from: 0,
            to: 1,
            duration: 500,
            ease: Easing.QuadEaseOut,
            onUpdate: (tween) => {
                const progress = tween.getValue();
                const newOffsetX = oldFollowOffsetX + (followOffsetX - oldFollowOffsetX) * progress;
                const newOffsetY = oldFollowOffsetY + (followOffsetY - oldFollowOffsetY) * progress;
                this.camera.setFollowOffset(newOffsetX, newOffsetY);
                this.scene.markDirty();
            },
        });
    }

    public isCameraLocked(): boolean {
        return this.cameraLocked;
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

    private unlockCameraWithDelay(delay: number): void {
        this.scene.time.delayedCall(delay, () => {
            this.cameraLocked = false;
        });
    }

    private setCameraMode(mode: CameraMode): void {
        if (this.cameraMode === mode) {
            return;
        }
        this.cameraMode = mode;
    }

    private restoreZoom(duration = 0): void {
        if (duration === 0) {
            this.waScaleManager.zoomModifier = this.waScaleManager.getSaveZoom();
            return;
        }
        this.restoreZoomTween?.stop();
        this.restoreZoomTween = this.scene.tweens.addCounter({
            from: this.waScaleManager.zoomModifier,
            to: this.waScaleManager.getSaveZoom(),
            duration,
            ease: Easing.SineEaseOut,
            onUpdate: (tween: Phaser.Tweens.Tween) => {
                this.waScaleManager.zoomModifier = tween.getValue();
                this.emit(CameraManagerEvent.CameraUpdate, this.getCameraUpdateEventData());
            },
        });
    }

    private initCamera() {
        this.camera = this.scene.cameras.main;
        this.camera.setBounds(0, 0, this.cameraBounds.x, this.cameraBounds.y);
    }

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

        this.camera.on("followupdate", () => {
            this.emit(CameraManagerEvent.CameraUpdate, this.getCameraUpdateEventData());
        });
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
}
