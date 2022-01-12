import { Easing } from "../../types";
import { HtmlUtils } from "../../WebRtc/HtmlUtils";
import type { Box } from "../../WebRtc/LayoutManager";
import type { Player } from "../Player/Player";
import type { WaScaleManager } from "../Services/WaScaleManager";
import type { GameScene } from "./GameScene";

export enum CameraMode {
    Free = "Free",
    Follow = "Follow",
    Focus = "Focus",
}

export class CameraManager extends Phaser.Events.EventEmitter {
    private scene: GameScene;
    private camera: Phaser.Cameras.Scene2D.Camera;
    private cameraBounds: { x: number; y: number };
    private waScaleManager: WaScaleManager;

    private cameraMode: CameraMode = CameraMode.Free;

    private restoreZoomTween?: Phaser.Tweens.Tween;
    private startFollowTween?: Phaser.Tweens.Tween;

    private cameraFollowTarget?: { x: number; y: number };
    private cameraLocked: boolean;

    constructor(scene: GameScene, cameraBounds: { x: number; y: number }, waScaleManager: WaScaleManager) {
        super();
        this.scene = scene;

        this.camera = scene.cameras.main;
        this.cameraBounds = cameraBounds;
        this.cameraLocked = false;

        this.waScaleManager = waScaleManager;

        this.initCamera();

        this.bindEventHandlers();
    }

    public destroy(): void {
        this.scene.game.events.off("wa-scale-manager:refresh-focus-on-target");
        super.destroy();
    }

    public getCamera(): Phaser.Cameras.Scene2D.Camera {
        return this.camera;
    }

    public enterFocusMode(
        focusOn: { x: number; y: number; width: number; height: number },
        margin: number = 0,
        duration: number = 1000
    ): void {
        this.setCameraMode(CameraMode.Focus);
        this.waScaleManager.saveZoom();
        this.waScaleManager.setFocusTarget(focusOn);

        this.cameraLocked = true;
        this.unlockCameraWithDelay(duration);
        this.restoreZoomTween?.stop();
        this.startFollowTween?.stop();
        const marginMult = 1 + margin;
        const targetZoomModifier = this.waScaleManager.getTargetZoomModifierFor(
            focusOn.width * marginMult,
            focusOn.height * marginMult
        );
        const currentZoomModifier = this.waScaleManager.zoomModifier;
        const zoomModifierChange = targetZoomModifier - currentZoomModifier;
        this.camera.stopFollow();
        this.cameraFollowTarget = undefined;
        this.camera.pan(
            focusOn.x + focusOn.width * 0.5 * marginMult,
            focusOn.y + focusOn.height * 0.5 * marginMult,
            duration,
            Easing.SineEaseOut,
            true,
            (camera, progress, x, y) => {
                this.waScaleManager.zoomModifier = currentZoomModifier + progress * zoomModifierChange;
            }
        );
    }

    public leaveFocusMode(player: Player, duration = 0): void {
        this.waScaleManager.setFocusTarget();
        this.unlockCameraWithDelay(duration);
        this.startFollow(player, duration);
        this.restoreZoom(duration);
    }

    public startFollow(target: object | Phaser.GameObjects.GameObject, duration: number = 0): void {
        this.cameraFollowTarget = target as { x: number; y: number };
        this.setCameraMode(CameraMode.Follow);
        if (duration === 0) {
            this.camera.startFollow(target, true);
            return;
        }
        const oldPos = { x: this.camera.scrollX, y: this.camera.scrollY };
        this.startFollowTween = this.scene.tweens.addCounter({
            from: 0,
            to: 1,
            duration,
            ease: Easing.SineEaseOut,
            onUpdate: (tween: Phaser.Tweens.Tween) => {
                if (!this.cameraFollowTarget) {
                    return;
                }
                const shiftX =
                    (this.cameraFollowTarget.x - this.camera.worldView.width * 0.5 - oldPos.x) * tween.getValue();
                const shiftY =
                    (this.cameraFollowTarget.y - this.camera.worldView.height * 0.5 - oldPos.y) * tween.getValue();
                this.camera.setScroll(oldPos.x + shiftX, oldPos.y + shiftY);
            },
            onComplete: () => {
                this.camera.startFollow(target, true);
            },
        });
    }

    /**
     * Updates the offset of the character compared to the center of the screen according to the layout manager
     * (tries to put the character in the center of the remaining space if there is a discussion going on.
     */
    public updateCameraOffset(array: Box): void {
        const xCenter = (array.xEnd - array.xStart) / 2 + array.xStart;
        const yCenter = (array.yEnd - array.yStart) / 2 + array.yStart;

        const game = HtmlUtils.querySelectorOrFail<HTMLCanvasElement>("#game canvas");
        // Let's put this in Game coordinates by applying the zoom level:

        this.camera.setFollowOffset(
            ((xCenter - game.offsetWidth / 2) * window.devicePixelRatio) / this.scene.scale.zoom,
            ((yCenter - game.offsetHeight / 2) * window.devicePixelRatio) / this.scene.scale.zoom
        );
    }

    public isCameraLocked(): boolean {
        return this.cameraLocked;
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

    private restoreZoom(duration: number = 0): void {
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
            },
        });
    }

    private initCamera() {
        this.camera = this.scene.cameras.main;
        this.camera.setBounds(0, 0, this.cameraBounds.x, this.cameraBounds.y);
    }

    private bindEventHandlers(): void {
        this.scene.game.events.on(
            "wa-scale-manager:refresh-focus-on-target",
            (focusOn: { x: number; y: number; width: number; height: number }) => {
                if (!focusOn) {
                    return;
                }
                this.camera.centerOn(focusOn.x + focusOn.width * 0.5, focusOn.y + focusOn.height * 0.5);
            }
        );
    }
}
