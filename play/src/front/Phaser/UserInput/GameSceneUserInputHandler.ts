import * as Phaser from "phaser";
import { get } from "svelte/store";
import * as Sentry from "@sentry/svelte";
import { Player } from "../Player/Player";
import { RemotePlayer } from "../Entity/RemotePlayer";
import type { UserInputHandlerInterface } from "../../Interfaces/UserInputHandlerInterface";
import type { GameScene } from "../Game/GameScene";
import { mapEditorModeStore, mapExplorationModeStore } from "../../Stores/MapEditorStore";
import { isActivatable } from "../Game/ActivatableInterface";
import { mapManagerActivated } from "../../Stores/MenuStore";
import { displayEmote, isEmoteIndex } from "../../Stores/EmoteStore";
import { analyticsClient } from "../../Administration/AnalyticsClient";
import { navChat } from "../../Chat/Stores/ChatStore";
import { chatVisibilityStore } from "../../Stores/ChatStore";
import { popupStore } from "../../Stores/PopupStore";
import SayPopUp from "../../Components/PopUp/SayPopUp.svelte";
import { isPopupJustClosed } from "../Game/Say/SayManager";
import LL from "../../../i18n/i18n-svelte";
import { followRoleStore, followStateStore, followUsersStore } from "../../Stores/FollowStore";
import { localUserStore } from "../../Connection/LocalUserStore";
import { waScaleManager } from "../Services/WaScaleManager";
import { MapDragPointerCapture } from "./MapDragPointerCapture";
import { MapDragGesture } from "./MapDragGesture";
import { MapPanShortcut } from "./MapPanShortcut";
import type { Shortcut } from "./UserInputManager";

import Pointer = Phaser.Input.Pointer;
import GameObject = Phaser.GameObjects.GameObject;

export class GameSceneUserInputHandler implements UserInputHandlerInterface {
    private gameScene: GameScene;
    private controlKeyisPressed: boolean = false;
    private readonly mapDrag = new MapDragGesture();
    private draggingMap = false;
    // The current touch gesture involved two fingers or more (a pinch): lifting a finger must not count as a tap.
    private multiTouch = false;
    private pinchFreedView = false;
    private readonly pointerCapture: MapDragPointerCapture;
    private readonly panShortcut: MapPanShortcut;
    private readonly spaceKey: Phaser.Input.Keyboard.Key | undefined;
    public shortcuts: Shortcut[] = [];

    constructor(gameScene: GameScene) {
        this.gameScene = gameScene;
        this.pointerCapture = new MapDragPointerCapture(
            gameScene.game.canvas,
            () => this.canDragMap(),
            () => this.handlePointerCancelEvent(),
        );
        // Same Key object as the "interact" key: addKey returns the existing one.
        this.spaceKey = gameScene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE, false);
        this.panShortcut = new MapPanShortcut(gameScene.game.canvas, {
            // Middle button everywhere. Space + left button only in the map editor: in game mode, Space interacts.
            canStart: (event) =>
                (event.button === 1 ||
                    (event.button === 0 && this.spaceKey?.isDown === true && get(mapEditorModeStore))) &&
                this.canMoveView(),
            start: () => this.gameScene.getCameraManager().startManualPan(),
            pan: (deltaX, deltaY) => {
                // CSS pixels to game pixels, the unit Phaser pointers (and so panBy) use.
                const scale = this.gameScene.scale.displayScale;
                this.gameScene.getCameraManager().panBy(deltaX * scale.x, deltaY * scale.y);
            },
        });
        gameScene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.pointerCapture.destroy();
            this.panShortcut.destroy();
        });

        this.initShortcuts();
    }

    public initShortcuts() {
        this.shortcuts = [
            {
                key: "C",
                description: get(LL).menu.shortcuts.openChat(),
            },
            {
                key: "U",
                description: get(LL).menu.shortcuts.openUserList(),
            },
            {
                key: "E",
                description: get(LL).menu.shortcuts.toggleMapEditor(),
            },
            {
                key: "R",
                description: get(LL).menu.shortcuts.rotatePlayer(),
            },
            {
                key: "1",
                description: get(LL).menu.shortcuts.emote1(),
            },
            {
                key: "2",
                description: get(LL).menu.shortcuts.emote2(),
            },
            {
                key: "3",
                description: get(LL).menu.shortcuts.emote3(),
            },
            {
                key: "4",
                description: get(LL).menu.shortcuts.emote4(),
            },
            {
                key: "5",
                description: get(LL).menu.shortcuts.emote5(),
            },
            {
                key: "6",
                description: get(LL).menu.shortcuts.emote6(),
            },
            // Enter
            {
                key: "Enter",
                description: get(LL).menu.shortcuts.openSayPopup(),
            },
            // Ctrl + Enter
            {
                key: "Enter",
                description: get(LL).menu.shortcuts.openThinkPopup(),
                ctrlKey: true,
            },
            // Cmd (Mac) / Ctrl (Windows & Linux) + D
            {
                key: "D",
                description: get(LL).menu.shortcuts.walkMyDesk(),
                ctrlKey: true,
            },
            // F
            {
                key: "F",
                description: get(LL).menu.shortcuts.follow(),
            },
        ];
    }

    public handleMouseWheelEvent(
        pointer: Pointer,
        gameObjects: GameObject[],
        deltaX: number,
        deltaY: number,
        deltaZ: number,
    ): void {
        this.gameScene.handleMouseWheel(deltaY, pointer);
    }

    public handlePointerUpEvent(pointer: Pointer, gameObjects: GameObject[]): void {
        if (pointer.leftButtonReleased()) {
            const wasDragging = this.draggingMap;
            const dragged = this.mapDrag.end(pointer.id);
            this.restoreDragCursor();
            this.pointerCapture.release();
            if (dragged) {
                if (wasDragging && this.canDragMap() && pointer.velocity) {
                    this.gameScene.getCameraManager().releaseManualPan(pointer.velocity);
                }
                return;
            }
        }
        if (pointer.wasTouch && this.multiTouch) {
            return;
        }
        if (get(mapEditorModeStore)) {
            return;
        }
        if (pointer.wasTouch || pointer.leftButtonReleased()) {
            if (!this.gameScene.userInputManager.isControlsEnabled) {
                return;
            }
            for (const object of gameObjects) {
                // Clicking your own woka brings the view back on it, as the "show my location" button does.
                if (object instanceof Player) {
                    this.gameScene.getCameraManager().resumePlayerFollow();
                    return;
                }
                if (isActivatable(object)) {
                    this.gameScene.getActivatablesManager().handlePointerDownEvent(object);
                    return;
                }
            }
        }

        if ((!pointer.wasTouch && pointer.leftButtonReleased()) || pointer.getDuration() > 250) {
            return;
        }

        if (
            !this.gameScene.userInputManager.isControlsEnabled &&
            !this.gameScene.userInputManager.isRightClickEnabled
        ) {
            return;
        }

        // If right click is disabled, we don't want to move the player
        if (!this.gameScene.userInputManager.isRightClickEnabled) {
            return;
        }

        for (const object of gameObjects) {
            if (object instanceof Player || object instanceof RemotePlayer) {
                return;
            }
        }
        const cameraManager = this.gameScene.getCameraManager();
        const worldPoint = cameraManager.getCamera().getWorldPoint(pointer.x, pointer.y);
        // Keep the avatar and the spot the user pointed at in view while walking there.
        const walk = cameraManager.startWalkFraming({ x: worldPoint.x, y: worldPoint.y });
        this.gameScene
            .moveTo(
                {
                    x: worldPoint.x,
                    y: worldPoint.y,
                },
                true,
            )
            .catch((reason) => {
                console.warn(reason);
            })
            .finally(() => cameraManager.endWalkFraming(walk));
    }

    public handlePointerDownEvent(pointer: Pointer, gameObjects: GameObject[]): void {
        if (pointer.wasTouch) {
            // A first finger starts a new gesture; a second one turns it into a pinch and ends the one-finger drag.
            this.multiTouch = this.touchPointersDown() > 1;
            if (!this.multiTouch) this.pinchFreedView = false;
            if (this.multiTouch) {
                this.handlePointerCancelEvent();
                return;
            }
        }
        if (!pointer.leftButtonDown() || !this.canDragMap()) {
            return;
        }
        pointer.motionFactor = 0.35;
        this.gameScene.getCameraManager().stopManualPanInertia();
        this.restoreDragCursor();
        this.mapDrag.begin(pointer);
    }

    public handlePointerMoveEvent(pointer: Pointer, gameObjects: GameObject[]): void {
        if (pointer.wasTouch && this.multiTouch) {
            return;
        }
        if (!pointer.leftButtonDown()) {
            if (this.draggingMap) this.handlePointerCancelEvent();
            return;
        }
        if (!this.canDragMap()) {
            this.handlePointerCancelEvent();
            return;
        }
        const delta = this.mapDrag.move(pointer);
        if (!delta) {
            return;
        }
        const cameraManager = this.gameScene.getCameraManager();
        if (!this.draggingMap) {
            cameraManager.startManualPan();
            this.draggingMap = true;
            this.gameScene.input.setDefaultCursor("grabbing");
        }
        cameraManager.panBy(delta.x, delta.y);
    }

    public handlePointerOutEvent(): void {
        if (this.draggingMap && !this.pointerCapture.active) this.handlePointerCancelEvent();
    }

    public handlePointerCancelEvent(): void {
        this.pointerCapture.release();
        this.gameScene.getCameraManager().stopManualPanInertia();
        this.mapDrag.cancel();
        this.restoreDragCursor();
    }

    /** Whether the user may move the view: not behind a modal or a zoom lock, nor (in game mode) in a focus zone. */
    private canMoveView(): boolean {
        if (!this.gameScene.userInputManager.isControlsEnabled || this.gameScene.getCameraManager().isZoomLocked()) {
            return false;
        }
        // The explorer list sets a focus target on hover, which must not hold the editor's view like a focus zone.
        return get(mapEditorModeStore) || !waScaleManager.getFocusTarget();
    }

    private canDragMap(): boolean {
        // The other editor tools use the left drag themselves; they pan with MapPanShortcut instead.
        return this.canMoveView() && (!get(mapEditorModeStore) || get(mapExplorationModeStore));
    }

    public handlePinch(zoomFactor: number, centre: { x: number; y: number }, pan: { x: number; y: number }): void {
        const cameraManager = this.gameScene.getCameraManager();
        if (this.canMoveView()) {
            // As in map apps, a pinch keeps the map under the fingers: its first move frees the view from the avatar.
            if (!this.pinchFreedView) {
                cameraManager.startManualPan();
                this.pinchFreedView = true;
            }
            cameraManager.panBy(pan.x, pan.y);
        }
        this.gameScene.zoomByFactor(zoomFactor, false, this.gameScene.zoomAnchor(centre));
    }

    private touchPointersDown(): number {
        return this.gameScene.input.manager.pointers.filter((pointer) => pointer.wasTouch && pointer.isDown).length;
    }

    private restoreDragCursor(): void {
        if (this.draggingMap) {
            this.gameScene.input.setDefaultCursor(get(mapExplorationModeStore) ? "grab" : "auto");
            this.draggingMap = false;
        }
    }

    private handleKeyF() {
        const state = get(followStateStore);

        if (state === "off" && this.gameScene.groups.size > 0) {
            this.sendFollowRequest();
        } else if (state === "active") {
            followStateStore.set("ending");
            this.gameScene.connection?.emitFollowAbort();
            followUsersStore.stopFollowing();
        }
    }

    public sendFollowRequest() {
        this.gameScene.connection?.emitFollowRequest();
        followRoleStore.set("leader");
        followStateStore.set("active");
    }

    private handleKeyC() {
        if (!this.gameScene.room.isChatEnabled) return;

        const isChatVisible = get(chatVisibilityStore);
        const isInMapEditor = get(mapEditorModeStore);
        const currentNav = get(navChat).key;

        if (currentNav === "users" && isChatVisible) {
            navChat.switchToChat();
        } else if (!isChatVisible && !isInMapEditor) {
            navChat.switchToChat();
            chatVisibilityStore.set(true);
        } else if (isChatVisible) {
            chatVisibilityStore.set(false);
        }
    }
    private handleKeyU() {
        const isChatVisible = get(chatVisibilityStore);
        const isInMapEditor = get(mapEditorModeStore);
        const currentNav = get(navChat).key;
        if (!this.gameScene.room.isChatOnlineListEnabled) return;
        if (currentNav === "chat" && isChatVisible) {
            navChat.switchToUserList();
        } else if (!isChatVisible && !isInMapEditor) {
            navChat.switchToUserList();
            chatVisibilityStore.set(true);
        } else if (isChatVisible) {
            chatVisibilityStore.set(false);
        }
    }
    public handleKeyDownEvent(event: KeyboardEvent): KeyboardEvent {
        const hasExecutedCommand = this.gameScene.getMapEditorModeManager()?.handleKeyDownEvent(event);
        if (hasExecutedCommand) {
            return event;
        }

        switch (event.code) {
            case "KeyE": {
                if (get(mapManagerActivated) == false) return event;
                mapEditorModeStore.switchMode(!get(mapEditorModeStore));
                break;
            }
            case "KeyR": {
                this.gameScene.CurrentPlayer?.rotate();
                break;
            }
            case "KeyC":
                this.handleKeyC();
                break;
            case "KeyU":
                this.handleKeyU();
                break;
            case "KeyD": {
                // Handle Cmd (Mac) / Ctrl (Windows & Linux) + D for "walk my desk"
                if (event.metaKey || event.ctrlKey) {
                    // Prevent the shortcut from being triggered when typing in input fields
                    if (
                        event.target instanceof HTMLInputElement ||
                        event.target instanceof HTMLTextAreaElement ||
                        event.target instanceof HTMLSelectElement
                    ) {
                        return event;
                    }
                    event.preventDefault();
                    this.gameScene.walkToPersonalDesk().catch((error) => {
                        console.warn("Error walking to personal desk", error);
                    });
                }
                break;
            }
            case "Digit1":
            case "Digit2":
            case "Digit3":
            case "Digit4":
            case "Digit5":
            case "Digit6": {
                // Extract the digit from event.code (e.g., "Digit1" -> 1)
                const digit = event.code.replace("Digit", "");
                const emoteIndex = Number.parseInt(digit, 10);

                if (isEmoteIndex(emoteIndex)) {
                    displayEmote(emoteIndex);
                } else {
                    console.warn(`Invalid emote index: ${emoteIndex}`);
                    Sentry.captureException(new Error(`Invalid emote index: ${emoteIndex}`));
                }
                break;
            }
            case "KeyF": {
                this.handleKeyF();
                break;
            }
            default: {
                break;
            }
        }

        switch (event.key) {
            case "Control": {
                this.controlKeyisPressed = true;
                break;
            }
            default: {
                break;
            }
        }

        return event;
    }

    private openSayPopup(): void {
        if (!this.gameScene.room.isSayEnabled) {
            return;
        }
        // Don't open if we just closed.
        if (isPopupJustClosed() || popupStore.hasPopup("say")) {
            return;
        }
        popupStore.addPopup(SayPopUp, { type: this.controlKeyisPressed ? "think" : "say" }, "say");
        if (this.controlKeyisPressed) {
            analyticsClient.trackAdminEvent("bubble.think.opened");
        } else {
            analyticsClient.trackAdminEvent("bubble.say.opened");
        }
    }

    public handleKeyUpEvent(event: KeyboardEvent): KeyboardEvent {
        switch (event.key) {
            case "Escape": {
                const dismissed = this.gameScene.CurrentPlayer?.dismissNewMediaDevicePrompts((deviceId) => {
                    localUserStore.addIgnoredNewMediaDeviceId(deviceId);
                });
                if (dismissed) {
                    event.preventDefault();
                    event.stopPropagation();
                }
                break;
            }
            // SPACE
            case " ": {
                this.handleActivableEntity();
                break;
            }
            case "Control": {
                this.controlKeyisPressed = false;
                break;
            }
            case "Enter": {
                this.openSayPopup();
                this.controlKeyisPressed = false;
                break;
            }
            default: {
                break;
            }
        }
        return event;
    }

    public handleActivableEntity() {
        const activatableManager = this.gameScene.getActivatablesManager();
        const activatable = activatableManager.getSelectedActivatableObject();
        if (activatable && activatable.isActivatable() && activatableManager.isSelectingByDistanceEnabled()) {
            activatable.activate();
            activatable.destroyText("object");
        }
        this.gameScene.CurrentPlayer?.handlePressSpacePlayerTextCallback();
    }

    public addSpaceEventListener(callback: () => void): void {
        this.gameScene.input.keyboard?.addListener("keyup-SPACE", callback);
        this.gameScene.getActivatablesManager().disableSelectingByDistance();
    }
    public removeSpaceEventListener(callback: () => void): void {
        this.gameScene.input.keyboard?.removeListener("keyup-SPACE", callback);
        this.gameScene.getActivatablesManager().enableSelectingByDistance();
    }
}
