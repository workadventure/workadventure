import { Easing } from "../../types";
import { HtmlUtils } from "../../WebRtc/HtmlUtils";
import type { Box } from "../../WebRtc/LayoutManager";
import { hasMovedEventName, Player } from "../Player/Player";
import type { WaScaleManager } from "../Services/WaScaleManager";
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

export class CameraManager extends Phaser.Events.EventEmitter {
    private scene: GameScene;
    private camera: Phaser.Cameras.Scene2D.Camera;
    private cameraBounds: { x: number; y: number };
    private waScaleManager: WaScaleManager;

    private cameraMode: CameraMode = CameraMode.Positioned;

    private restoreZoomTween?: Phaser.Tweens.Tween;
    private startFollowTween?: Phaser.Tweens.Tween;

    private playerToFollow?: Player;

    constructor(scene: GameScene, cameraBounds: { x: number; y: number }, waScaleManager: WaScaleManager) {
        super();
        this.scene = scene;

        this.camera = scene.cameras.main;
        this.cameraBounds = cameraBounds;

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

    /**
     * Set camera view to specific destination without changing current camera mode. Won't work if camera mode is set to Focus.
     * @param setTo Viewport on which the camera should set the position
     * @param duration Time for the transition im MS. If set to 0, transition will occur immediately
     */
    public setPosition(setTo: { x: number; y: number; width: number; height: number }, duration: number = 1000): void {
        if (this.cameraMode === CameraMode.Focus) {
            return;
        }
        this.setCameraMode(CameraMode.Positioned);
        const currentZoomModifier = this.waScaleManager.zoomModifier;
        const zoomModifierChange = this.getZoomModifierChange(setTo.width, setTo.height);
        this.camera.stopFollow();
        this.camera.pan(
            setTo.x + setTo.width * 0.5,
            setTo.y + setTo.height * 0.5,
            duration,
            Easing.SineEaseOut,
            true,
            (camera, progress, x, y) => {
                if (this.cameraMode === CameraMode.Positioned) {
                    this.waScaleManager.zoomModifier = currentZoomModifier + progress * zoomModifierChange;
                }
                if (progress === 1) {
                    this.playerToFollow?.once(hasMovedEventName, () => {
                        if (this.playerToFollow) {
                            this.startFollowPlayer(this.playerToFollow, duration);
                        }
                    });
                }
            }
        );
    }

    private getZoomModifierChange(width: number, height: number): number {
        const targetZoomModifier = this.waScaleManager.getTargetZoomModifierFor(width, height);
        const currentZoomModifier = this.waScaleManager.zoomModifier;
        return targetZoomModifier - currentZoomModifier;
    }

    /**
     * Set camera to focus mode. As long as the camera is in the Focus mode, its view cannot be changed.
     * @param setTo Viewport on which the camera should focus on
     * @param duration Time for the transition im MS. If set to 0, transition will occur immediately
     */
    public enterFocusMode(
        focusOn: { x: number; y: number; width: number; height: number },
        margin: number = 0,
        duration: number = 1000
    ): void {
        this.setCameraMode(CameraMode.Focus);
        this.waScaleManager.saveZoom();
        this.waScaleManager.setFocusTarget(focusOn);

        this.restoreZoomTween?.stop();
        this.startFollowTween?.stop();
        const marginMult = 1 + margin;
        const currentZoomModifier = this.waScaleManager.zoomModifier;
        const zoomModifierChange = this.getZoomModifierChange(focusOn.width * marginMult, focusOn.height * marginMult);
        this.camera.stopFollow();
        this.playerToFollow = undefined;
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

    public leaveFocusMode(player: Player, duration: number = 1000): void {
        this.waScaleManager.setFocusTarget();
        this.startFollowPlayer(player, duration);
        this.restoreZoom(duration);
    }

    public startFollowPlayer(player: Player, duration: number = 0): void {
        this.playerToFollow = player;
        this.setCameraMode(CameraMode.Follow);
        if (duration === 0) {
            this.camera.startFollow(player, true);
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
            },
            onComplete: () => {
                this.camera.startFollow(player, true);
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

    public isCameraZoomLocked(): boolean {
        return [CameraMode.Focus, CameraMode.Positioned].includes(this.cameraMode);
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
