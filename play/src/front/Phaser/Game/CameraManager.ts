import * as Phaser from "phaser";
import { mapEditorModeStore } from "../../Stores/MapEditorStore";
import { cameraDetachedStore } from "../../Stores/CameraStore";
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
import {
    SMOOTH_BUTTON_ZOOM_DURATION,
    SMOOTH_BUTTON_ZOOM_TARGET_EPSILON,
    getContinuousButtonZoomFactor,
    getRetargetedButtonZoomModifier,
    getSmoothButtonZoomModifier,
} from "./CameraZoomUtils";
import type { GameScene } from "./GameScene";

import Clamp = Phaser.Math.Clamp;
import EventEmitter = Phaser.Events.EventEmitter;
import Camera = Phaser.Cameras.Scene2D.Camera;
import Tween = Phaser.Tweens.Tween;

/** While walking, the destination stays at least this far (in map pixels, two tiles) from the edge of the view. */
const WALK_ZOOM_MARGIN = 64;
/** While walking, the camera zooms out at most this much further than the zoom the walk started from. */
const WALK_ZOOM_MAX_OUT = 2.5;

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

type CursorZoomAnchor = {
    screenX: number;
    screenY: number;
    world: { x: number; y: number };
};

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
export class CameraManager extends EventEmitter {
    private camera: Camera;
    private waScaleManager: WaScaleManager;

    private cameraAnimation: CameraAnimation | undefined;
    private zoomAnimation: ZoomAnimation | undefined;

    // Button zoom is kept separate from the regular tween-based zoom so repeated clicks can retarget
    // the current destination without recreating a Phaser tween on every press.
    private buttonZoomAnimation: ZoomAnimation | undefined;
    private smoothButtonZoomStartModifier: number | undefined;
    private smoothButtonZoomTargetModifier: number | undefined;
    private smoothButtonZoomElapsedMs = 0;
    private continuousButtonZoomFactorPerSecond: number | undefined;

    private playerToFollow?: Player | RemotePlayer;
    private zoomLocked: boolean;
    private manuallyDetached = false;
    private cursorZoomAnchor: CursorZoomAnchor | undefined;

    /** Key scrolling in the map editor, in world units per ms at zoom modifier 1 (same on-screen speed at any zoom). */
    private readonly KEY_SCROLL_SPEED = 0.6;
    private mapEditorOpen = false;
    private zoomBeforeMapEditor: number | undefined;
    // The camera bounds last set in game mode (see updateGameBounds).
    private gameBounds: { x: number; y: number; width: number; height: number } | undefined;

    private readonly unsubscribeMapEditorModeStore: () => void;

    private _resistanceEndZoomLevel = 0.3;

    // The free point the view follows when it does not follow a player: after a drag, or in the map editor.
    private explorerFocusOn: { x: number; y: number } = { x: 0, y: 0 };
    // What the camera follows, or is gliding towards (a player, a focus zone...). Undefined while the view is free.
    private followTarget: { x: number; y: number } | undefined;
    // The walk keeping its destination in view (see startWalkZoom), and the zoom it started from.
    private walkZoom: { id: number; startZoom: number } | undefined;
    private walkZoomCount = 0;

    // The tween for the camera offset
    private cameraOffsetCurrentTween?: Tween;

    // The box we should center the camera on (expressed in screen pixels, not game pixels).
    private cameraOffsetBox: Box | undefined;

    // Target follow offset for the camera, expressed in game pixels.
    private targetFollowOffset: { x: number; y: number } | undefined;

    constructor(
        private scene: GameScene,
        private mapSize: { width: number; height: number },
        waScaleManager: WaScaleManager,
    ) {
        super();

        this.camera = scene.cameras.main;
        this.zoomLocked = false;

        this.waScaleManager = waScaleManager;

        this.initCamera();

        this.bindEventHandlers();

        // TODO: we need to improve this with a big derived (a store containing the mapEditorModeStore,
        // one store containing if we are in a focus mode or not (and if we can exit the focus mode by
        // moving the avatar), one listening to the zoom level

        // Subscribe to map editor mode store to change camera bounds when the map editor is opened or closed
        this.unsubscribeMapEditorModeStore = mapEditorModeStore.subscribe((isOpened) => {
            const changed = isOpened !== this.mapEditorOpen;
            this.mapEditorOpen = isOpened;
            if (isOpened) {
                // The editor lets the view go past the map edges.
                this.camera.setBounds(
                    -this.mapSize.width,
                    -this.mapSize.height,
                    this.mapSize.width * 3,
                    this.mapSize.height * 3,
                );
            } else {
                this.gameBounds = undefined;
                this.updateGameBounds();
            }
            if (changed) {
                if (isOpened) this.enterMapEditor();
                else this.leaveMapEditor();
            }
        });
        this.scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.updateGameBounds);

        this.waScaleManager.mapSize = this.mapSize;

        this.scene.game.events.on(WaScaleManagerEvent.ZoomChanged, this.onZoomChanged);
    }

    private readonly onZoomChanged = (): void => {
        this.doUpdateCameraOffset(true);
    };

    /**
     * In game mode the view stays on the map. On an axis where the map is smaller than the view, the map is centred
     * in the area the follow offset leaves visible: the bounds grow to the view's size around that centre, where
     * Phaser's clamping would otherwise pin the map to the top-left corner.
     */
    private readonly updateGameBounds = (): void => {
        if (this.mapEditorOpen) return;
        const { displayWidth, displayHeight, followOffset } = this.camera;
        const { width: mapWidth, height: mapHeight } = this.mapSize;
        const bounds = {
            x: displayWidth > mapWidth ? mapWidth / 2 - followOffset.x - displayWidth / 2 : 0,
            y: displayHeight > mapHeight ? mapHeight / 2 - followOffset.y - displayHeight / 2 : 0,
            width: Math.max(mapWidth, displayWidth),
            height: Math.max(mapHeight, displayHeight),
        };
        const last = this.gameBounds;
        if (
            last &&
            last.x === bounds.x &&
            last.y === bounds.y &&
            last.width === bounds.width &&
            last.height === bounds.height
        ) {
            return;
        }
        this.gameBounds = bounds;
        this.camera.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
        this.scene.markDirty();
    };

    public destroy(): void {
        this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.updateWalkZoom);
        this.setManuallyDetached(false);
        this.cameraAnimation?.onInterrupt();
        this.cameraAnimation = undefined;
        this.cancelOffsetTween();
        this.zoomAnimation?.onInterrupt();
        this.zoomAnimation = undefined;
        this.scene.game.events.off(WaScaleManagerEvent.ZoomChanged, this.onZoomChanged);
        this.scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.updateGameBounds);

        this.scene.game.events.off(WaScaleManagerEvent.RefreshFocusOnTarget);
        this.camera.off("followupdate", this.onFollowUpdate);
        this.off(CameraManagerEvent.CameraUpdate, this.onCameraUpdate);
        this.unsubscribeMapEditorModeStore();
        super.destroy();
    }

    public getCamera(): Camera {
        return this.camera;
    }

    private animateToFocus(
        target: Character | { x: number; y: number },
        duration: number,
        callback?: () => void,
    ): void {
        // The focus tween moves explorerFocusOn itself: let a running cursor zoom finish around the centre instead.
        this.cursorZoomAnchor = undefined;
        this.followTarget = target;
        const wasManuallyDetached = this.manuallyDetached;
        this.setManuallyDetached(false);
        if (wasManuallyDetached) {
            this.doUpdateCameraOffset(true);
        }
        this.cameraAnimation?.onInterrupt();

        if (duration === 0) {
            this.camera.startFollow(target, true, 1, 1, this.camera.followOffset.x, this.camera.followOffset.y);
            callback?.();
            this.setFollowMode();
        }

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
            this.camera.followOffset.y,
        );

        // Note: if duration = 0, the addCounter onUpdate is directly triggered to the "1" progress value.
        const followTween = this.scene.tweens.addCounter({
            from: 0,
            to: 1,
            duration,
            ease: Easing.SineEaseOut,
            onUpdate: (tween: Tween) => {
                const progress = tween.getValue() ?? 0;
                const shiftX = (target.x - origin.x) * progress;
                const shiftY = (target.y - origin.y) * progress;
                this.explorerFocusOn.x = origin.x + shiftX;
                this.explorerFocusOn.y = origin.y + shiftY;

                this.emit(CameraManagerEvent.CameraUpdate, this.getCameraUpdateEventData());
            },
            onComplete: () => {
                this.camera.startFollow(target, true, 1, 1, this.camera.followOffset.x, this.camera.followOffset.y);
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

    /** Scrolls the free view with the move keys, as the map editor does. `delta` is the frame time in ms. */
    public move(moveEvents: ActiveEventList, delta: number): void {
        const x = Number(moveEvents.get(UserInputEvent.MoveRight)) - Number(moveEvents.get(UserInputEvent.MoveLeft));
        const y = Number(moveEvents.get(UserInputEvent.MoveDown)) - Number(moveEvents.get(UserInputEvent.MoveUp));
        if (x === 0 && y === 0) return;
        const step = (this.KEY_SCROLL_SPEED * delta) / this.waScaleManager.zoomModifier;
        this.scrollCamera(x * step, y * step);
    }

    /** In the map editor the view is free: the move keys scroll it and the wheel zooms on the cursor. */
    private enterMapEditor(): void {
        this.zoomBeforeMapEditor = this.waScaleManager.zoomModifier;
        // Unless the user dragged the view away, start where a following camera would be: on its target, with its
        // offset. A small map holds the game-mode view away from the avatar, and a camera reopened while gliding back
        // to the avatar (just after closing the editor) would otherwise stop halfway.
        const target = this.manuallyDetached ? undefined : this.followTarget;
        const offset = { x: this.camera.followOffset.x, y: this.camera.followOffset.y };
        this.setExplorationMode();
        if (!target) return;
        this.explorerFocusOn.x = target.x;
        this.explorerFocusOn.y = target.y;
        this.camera.setFollowOffset(offset.x, offset.y);
    }

    private leaveMapEditor(): void {
        // Zoomed out past the resistance level (to see the whole map, say): go back to the zoom from before.
        const targetZoom =
            this.waScaleManager.zoomModifier < this.resistanceEndZoomLevel
                ? Math.max(this.zoomBeforeMapEditor ?? 0, this.resistanceEndZoomLevel)
                : undefined;
        this.startFollowPlayer(this.scene.CurrentPlayer, 1000);
        if (targetZoom) this.zoomByFactor(targetZoom / this.waScaleManager.zoomModifier, 1000);
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

        if (this.manuallyDetached) {
            return;
        }

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
            height * multiplier,
        );
        const currentZoomModifier = this.waScaleManager.zoomModifier;
        return targetZoomModifier - currentZoomModifier;
    }

    /*public defineNewCameraBounds(width: number, height: number): void {
        this.camera.setBounds(-width, -height, width * 3, height * 3, false);
    }*/

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
            },
        );

        this.camera.on("followupdate", this.onFollowUpdate);
        this.on(CameraManagerEvent.CameraUpdate, this.onCameraUpdate);
    }

    private onCameraUpdate = () => {
        this.scene.sendViewportToServer();
    };

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
        this.followTarget = undefined;
        this.setManuallyDetached(false);
        this.cameraAnimation?.onInterrupt();
        this.cameraAnimation = undefined;
        this.cancelOffsetTween();
        this.camera.setFollowOffset(0, 0);

        // this.camera.setBounds(
        //     -this.mapSize.width,
        //     -this.mapSize.height,
        //     this.mapSize.width * 3,
        //     this.mapSize.height * 3,
        //     false
        // );

        this.explorerFocusOn = {
            x: this.camera.scrollX + this.camera.width / 2,
            y: this.camera.scrollY + this.camera.height / 2,
        };
        this.camera.startFollow(this.explorerFocusOn, true);
    }

    /**
     * While the avatar walks where the user tapped or right-clicked, zooms out just enough to keep the destination in
     * view, then back in as the avatar gets closer, ending at the zoom the walk started from. Returns the walk's id for
     * endWalkZoom(), or undefined when a script or a focus zone holds the camera.
     */
    public startWalkZoom(): number | undefined {
        if (this.isZoomLocked() || this.waScaleManager.getFocusTarget()) return undefined;
        // A tap during a walk keeps the zoom the first walk started from, so repeated taps don't ratchet it out.
        const startZoom = this.walkZoom?.startZoom ?? this.waScaleManager.zoomModifier;
        this.walkZoom = { id: ++this.walkZoomCount, startZoom };
        this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.updateWalkZoom);
        this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.updateWalkZoom);
        return this.walkZoom.id;
    }

    /** The walk ended (arrived, cancelled or stuck): back to the zoom it started from, unless a later walk took over. */
    public endWalkZoom(id: number | undefined): void {
        if (id === undefined || this.walkZoom?.id !== id) return;
        const { startZoom } = this.walkZoom;
        this.walkZoom = undefined;
        this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.updateWalkZoom);
        // The animation also leaves the camera-zoom mode used while walking (see WaScaleManager.applyNewSize).
        this.animateToZoomLevel(startZoom, 500);
    }

    /** The user, a script or a focus zone takes over the view or the zoom: leave the zoom where it is. */
    private stopWalkZoom(): void {
        if (!this.walkZoom) return;
        this.walkZoom = undefined;
        this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.updateWalkZoom);
        this.waScaleManager.setZoomModifier(this.waScaleManager.zoomModifier, this.camera, false);
    }

    private readonly updateWalkZoom = (_time: number, delta: number): void => {
        const player = this.scene.CurrentPlayer;
        const destination = player.getCurrentPathDestinationPoint();
        // Until the path is computed (it's async), there's nothing to keep in view yet.
        if (!this.walkZoom || !destination || this.manuallyDetached) return;

        // The avatar sits at the centre of the area not covered by panels: how far can the destination be?
        const visible = this.visibleHalfSize();
        const zoom = this.waScaleManager.zoomModifier;
        const fit = Math.min(
            visible.width / (Math.abs(destination.x - player.x) + WALK_ZOOM_MARGIN),
            visible.height / (Math.abs(destination.y - player.y) + WALK_ZOOM_MARGIN),
        );
        const { startZoom } = this.walkZoom;
        const target = Clamp(zoom * fit, startZoom / WALK_ZOOM_MAX_OUT, startZoom);
        if (target < zoom && this.waScaleManager.isMaximumZoomOutReached) return;
        // Ease towards it (about a quarter of a second), so the zoom never jumps.
        const next = zoom + (target - zoom) * (1 - Math.exp(-delta / 250));
        if (Math.abs(next - zoom) < 0.0001) return;
        // Camera zoom while walking, without resizing the canvas every frame; endWalkZoom settles it.
        this.waScaleManager.setZoomModifier(next, this.camera, true);
        this.emit(CameraManagerEvent.CameraUpdate, this.getCameraUpdateEventData());
    };

    /** Half the size of the area not covered by panels, where the avatar is centred, in map pixels. */
    private visibleHalfSize(): { width: number; height: number } {
        const box = this.cameraOffsetBox;
        if (!box) return { width: this.camera.displayWidth / 2, height: this.camera.displayHeight / 2 };
        const mapPixelsPerScreenPixel = 1 / this.scene.scale.zoom / this.camera.zoom;
        return {
            width: ((box.xEnd - box.xStart) / 2) * mapPixelsPerScreenPixel,
            height: ((box.yEnd - box.yStart) / 2) * mapPixelsPerScreenPixel,
        };
    }

    /**
     * Make the view follow the free point the user drags and zooms. In game mode this detaches the view from the
     * avatar but keeps avatar controls. In the map editor the view is always free, so it never counts as detached.
     */
    public startManualPan(): void {
        this.stopWalkZoom();
        if (this.cursorZoomAnchor) this.zoomAnimation?.onInterrupt();
        // Apply pans made since the last frame (a pinch pans then zooms in one go) before taking the visible centre.
        this.camera.preRender();
        this.setExplorationMode();
        if (!this.mapEditorOpen) this.setManuallyDetached(true);
    }

    /** The view follows the free point rather than the avatar: after a drag, or in the map editor. */
    private isFreeCamera(): boolean {
        return this.manuallyDetached || this.mapEditorOpen;
    }

    public panBy(screenX: number, screenY: number): void {
        this.scrollCamera(screenX / this.camera.zoom, screenY / this.camera.zoom);
    }

    /** Keep the view gliding after a drag, converting screen velocity to world units at the current zoom. */
    public releaseManualPan(velocity: { x: number; y: number }): void {
        if (!this.isFreeCamera() || !Number.isFinite(velocity.x) || !Number.isFinite(velocity.y)) return;
        this.setSpeed({ x: (-velocity.x * 10) / this.camera.zoom, y: (-velocity.y * 10) / this.camera.zoom });
    }

    public stopManualPanInertia(): void {
        if (this.isFreeCamera()) this.stopSpeed();
    }

    public resumePlayerFollow(): void {
        if (this.manuallyDetached) {
            this.startFollowPlayer(this.scene.CurrentPlayer, 500);
        }
    }

    private setManuallyDetached(detached: boolean): void {
        this.manuallyDetached = detached;
        cameraDetachedStore.set(detached);
    }

    public setFollowMode(): void {
        this.scene.reposition();
    }

    private cancelOffsetTween(): void {
        this.stopTween(this.cameraOffsetCurrentTween);
        this.cameraOffsetCurrentTween = undefined;
    }

    private stopTween(tween: Tween | undefined): void {
        if (!tween) {
            return;
        }

        tween.stop();
        tween.destroy();
    }

    public centerCameraOn(position: { x: number; y: number }, zoom?: number): void {
        // End on the free point (now at `position`), not on `position` itself, so keys, drags and zoom still move the view.
        this.animateToFocus(position, 1000, () => {
            this.camera.startFollow(
                this.explorerFocusOn,
                true,
                1,
                1,
                this.camera.followOffset.x,
                this.camera.followOffset.y,
            );
        });
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

    public zoomByFactorAtPointer(zoomFactor: number, duration: number, pointer: { x: number; y: number }): void {
        // While following the avatar, the wheel zooms on it. Cursor zoom needs a free view (a drag, or the editor).
        if (!this.isFreeCamera()) {
            this.zoomByFactor(zoomFactor, duration);
            return;
        }
        const limitReached =
            zoomFactor > 1 ? this.waScaleManager.isMaximumZoomInReached : this.waScaleManager.isMaximumZoomOutReached;
        if (this.isZoomLocked() || limitReached) return;
        // Normalized coordinates survive WaScaleManager switching between canvas and camera zoom.
        const screenX = (pointer.x - this.camera.x) / this.camera.width;
        const screenY = (pointer.y - this.camera.y) / this.camera.height;
        this.zoomAnimation?.onInterrupt();
        this.startManualPan();
        this.camera.preRender();
        const world = this.camera.getWorldPoint(
            this.camera.x + screenX * this.camera.width,
            this.camera.y + screenY * this.camera.height,
        );
        const anchor = { screenX, screenY, world };
        this.cursorZoomAnchor = anchor;
        this.animateToZoomLevel(this.waScaleManager.zoomModifier * zoomFactor, duration, undefined, anchor);
    }

    /**
     * Applies one Explorer menu click step.
     * If another click arrives while the previous step is still animating, the target is moved again
     * and the animation restarts from the current zoom, which avoids the visible "restart" effect.
     */
    public smoothZoomByFactor(zoomFactor: number): void {
        if (this.isZoomLocked()) {
            return;
        }
        this.stopWalkZoom();

        this.smoothButtonZoomTargetModifier = getRetargetedButtonZoomModifier(
            this.waScaleManager.zoomModifier,
            zoomFactor,
            this.smoothButtonZoomTargetModifier,
        );
        this.smoothButtonZoomStartModifier = this.waScaleManager.zoomModifier;
        this.smoothButtonZoomElapsedMs = 0;
        this.continuousButtonZoomFactorPerSecond = undefined;

        if (!this.buttonZoomAnimation) {
            this.zoomAnimation?.onInterrupt();
            this.startButtonZoomAnimation();
        }
    }

    /**
     * Starts long-press zoom. The caller passes a per-second factor so the update loop can remain frame-rate independent.
     */
    public startContinuousZoom(zoomFactorPerSecond: number): void {
        if (this.isZoomLocked()) {
            return;
        }
        this.stopWalkZoom();

        this.smoothButtonZoomTargetModifier = undefined;
        this.smoothButtonZoomStartModifier = undefined;
        this.smoothButtonZoomElapsedMs = 0;
        this.continuousButtonZoomFactorPerSecond = zoomFactorPerSecond;

        if (!this.buttonZoomAnimation) {
            this.zoomAnimation?.onInterrupt();
            this.startButtonZoomAnimation();
        }
    }

    /**
     * Ends long-press zoom and asks WaScaleManager to settle outside animation mode.
     * This lets its existing zoom bounds and canvas resize logic finish cleanly.
     */
    public stopContinuousZoom(): void {
        if (this.continuousButtonZoomFactorPerSecond === undefined) {
            return;
        }

        this.waScaleManager.setZoomModifier(this.waScaleManager.zoomModifier, this.camera, false);
        this.emit(CameraManagerEvent.CameraUpdate, this.getCameraUpdateEventData());
        this.stopButtonZoomAnimation();
    }

    private animateToZoomLevel(
        targetZoomModifier: number,
        duration: number,
        callback?: () => void,
        anchor?: CursorZoomAnchor,
    ): void {
        this.stopWalkZoom();
        this.zoomAnimation?.onInterrupt();
        const applyZoom = (value: number, animating: boolean): void => {
            this.waScaleManager.setZoomModifier(value, this.camera, animating);
            if (anchor && this.cursorZoomAnchor === anchor && this.isFreeCamera()) {
                this.camera.preRender();
                const point = this.camera.getWorldPoint(
                    this.camera.x + anchor.screenX * this.camera.width,
                    this.camera.y + anchor.screenY * this.camera.height,
                );
                this.scrollCamera(anchor.world.x - point.x, anchor.world.y - point.y);
                this.camera.preRender();
            }
        };
        const startZoomModifier = this.waScaleManager.zoomModifier;
        const startDate = Date.now();

        const easeAlgo = Easing.QuintEaseOut;

        const zoomTween = this.scene.tweens.addCounter({
            from: startZoomModifier,
            to: targetZoomModifier,
            duration,
            ease: easeAlgo,
            onUpdate: (tween: Tween) => {
                const value = tween.getValue();
                if (value === null) {
                    return;
                }
                applyZoom(value, true);
                this.emit(CameraManagerEvent.CameraUpdate, this.getCameraUpdateEventData());
            },
            onComplete: () => {
                applyZoom(targetZoomModifier, false);
                if (this.cursorZoomAnchor === anchor) this.cursorZoomAnchor = undefined;
                callback?.();
            },
            onStop: () => {
                // If we are using the trackpad to zoom, we will receive a LOT of calls to
                // animateToZoomLevel. Some calls will even trigger before the first onUpdate. In this case,
                // the tween value is not set at all (0).
                // In this very special case, we want to compute the value of the Tween manually.

                let elapsedTime = Date.now() - startDate;
                if (elapsedTime > duration) {
                    elapsedTime = duration;
                }

                const easeFunction = Phaser.Tweens.Builders.GetEaseFunction(easeAlgo);

                let value;
                if (duration !== 0) {
                    value =
                        easeFunction(elapsedTime / duration) * (targetZoomModifier - startZoomModifier) +
                        startZoomModifier;
                } else {
                    value = targetZoomModifier;
                }
                applyZoom(value, true);
                this.emit(CameraManagerEvent.CameraUpdate, this.getCameraUpdateEventData());
            },
        });

        const animation: ZoomAnimation = {
            onInterrupt: () => {
                zoomTween.stop();
                zoomTween.destroy();
                if (this.zoomAnimation === animation) this.zoomAnimation = undefined;
                if (this.cursorZoomAnchor === anchor) this.cursorZoomAnchor = undefined;
            },
        };
        this.zoomAnimation = animation;
    }

    private startButtonZoomAnimation(): void {
        // We drive the button zoom from the scene update event because it handles both click easing
        // and continuous hold zoom with the same cleanup path.
        this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.animateButtonZoom);

        const buttonZoomAnimation: ZoomAnimation = {
            onInterrupt: () => {
                this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.animateButtonZoom);
                this.smoothButtonZoomStartModifier = undefined;
                this.smoothButtonZoomTargetModifier = undefined;
                this.smoothButtonZoomElapsedMs = 0;
                this.continuousButtonZoomFactorPerSecond = undefined;
                this.buttonZoomAnimation = undefined;
                if (this.zoomAnimation === buttonZoomAnimation) {
                    this.zoomAnimation = undefined;
                }
            },
        };

        this.buttonZoomAnimation = buttonZoomAnimation;
        this.zoomAnimation = buttonZoomAnimation;
    }

    private stopButtonZoomAnimation(): void {
        this.buttonZoomAnimation?.onInterrupt();
    }

    private updateButtonZoomModifier(targetZoomModifier: number, animating: boolean): void {
        this.waScaleManager.setZoomModifier(targetZoomModifier, this.camera, animating);
        this.emit(CameraManagerEvent.CameraUpdate, this.getCameraUpdateEventData());
    }

    private isButtonZoomLimitReached(previousZoomModifier: number, requestedZoomModifier: number): boolean {
        // WaScaleManager clamps by mutating its internal zoom modifier when bounds are reached.
        // Comparing the requested direction with the exposed bound flags tells us when to stop the loop.
        if (requestedZoomModifier > previousZoomModifier && this.waScaleManager.isMaximumZoomInReached) {
            return true;
        }

        if (requestedZoomModifier < previousZoomModifier && this.waScaleManager.isMaximumZoomOutReached) {
            return true;
        }

        return false;
    }

    private readonly animateButtonZoom = (_time: number, delta: number): void => {
        if (this.continuousButtonZoomFactorPerSecond !== undefined) {
            // Long press zoom is multiplicative and frame-rate independent.
            const currentZoomModifier = this.waScaleManager.zoomModifier;
            const targetZoomModifier =
                currentZoomModifier * getContinuousButtonZoomFactor(this.continuousButtonZoomFactorPerSecond, delta);

            this.updateButtonZoomModifier(targetZoomModifier, true);

            if (this.isButtonZoomLimitReached(currentZoomModifier, targetZoomModifier)) {
                this.stopContinuousZoom();
            }
            return;
        }

        // Click zoom uses elapsed time from the last click target change, not only the frame delta.
        // This keeps the easing curve stable even if the browser drops frames.
        const startZoomModifier = this.smoothButtonZoomStartModifier;
        const targetZoomModifier = this.smoothButtonZoomTargetModifier;
        if (startZoomModifier === undefined || targetZoomModifier === undefined) {
            this.stopButtonZoomAnimation();
            return;
        }

        const currentZoomModifier = this.waScaleManager.zoomModifier;
        this.smoothButtonZoomElapsedMs += delta;
        const nextZoomModifier = getSmoothButtonZoomModifier(
            startZoomModifier,
            targetZoomModifier,
            this.smoothButtonZoomElapsedMs,
            SMOOTH_BUTTON_ZOOM_DURATION,
        );

        this.updateButtonZoomModifier(nextZoomModifier, true);

        if (
            this.smoothButtonZoomElapsedMs >= SMOOTH_BUTTON_ZOOM_DURATION ||
            Math.abs(this.waScaleManager.zoomModifier - targetZoomModifier) <= SMOOTH_BUTTON_ZOOM_TARGET_EPSILON ||
            this.isButtonZoomLimitReached(currentZoomModifier, targetZoomModifier)
        ) {
            this.updateButtonZoomModifier(this.waScaleManager.zoomModifier, false);
            this.stopButtonZoomAnimation();
        }
    };

    private animate = (time: number, delta: number): void => {
        const cameraSpeed = this.cameraAnimation;
        if (cameraSpeed?.type !== "speed") {
            console.warn(
                "Camera animation is not in speed mode but animate callback is called. This should not happen.",
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
