import * as Phaser from "phaser";
import type { Unsubscriber } from "svelte/store";
import { get } from "svelte/store";
import { enableUserInputsStore } from "../../Stores/UserInputStore";
import type { UserInputHandlerInterface } from "../../Interfaces/UserInputHandlerInterface";
import LL from "../../../i18n/i18n-svelte";

import Key = Phaser.Input.Keyboard.Key;
import Pointer = Phaser.Input.Pointer;
import GameObject = Phaser.GameObjects.GameObject;

// Event listeners are valid for the lifetime of the Phaser object and will be garbage collected when the object is destroyed
/* eslint-disable listeners/no-missing-remove-event-listener, listeners/no-inline-function-event-listener */

interface UserInputManagerDatum extends Shortcut {
    keyInstance?: Key;
    event: UserInputEvent;
}

export enum UserInputEvent {
    MoveLeft = 1,
    MoveUp,
    MoveRight,
    MoveDown,
    SpeedUp,
    Interact,
    Follow,
}

// The reason why the controls are disabled
// The MessageEventSource type means the controls where disabled by the scripting API in the related iframe
type DisableControlsReason = "store" | "explorerTool" | "errorScreen" | MessageEventSource;

export interface Shortcut {
    key: string;
    description: string;
    ctrlKey?: boolean;
    altKey?: boolean;
    shiftKey?: boolean;
}

//we cannot use a map structure so we have to create a replacement
export class ActiveEventList {
    private eventMap: Map<UserInputEvent, boolean> = new Map<UserInputEvent, boolean>();

    get(event: UserInputEvent): boolean {
        return this.eventMap.get(event) || false;
    }
    set(event: UserInputEvent, value: boolean): void {
        this.eventMap.set(event, value);
    }
    forEach(callback: (value: boolean, key: UserInputEvent) => void): void {
        this.eventMap.forEach(callback);
    }
    any(): boolean {
        return Array.from(this.eventMap.values()).reduce((accu, curr) => accu || curr, false);
    }
    anyExcept(...exceptions: UserInputEvent[]): boolean {
        const userInputEvents = Array.from(this.eventMap);
        for (const event of userInputEvents) {
            if (event[1] && !exceptions.includes(event[0])) {
                return true;
            }
        }
        return false;
    }
}

//this class is responsible for catching user inputs and listing all active user actions at every game tick events.
export class UserInputManager {
    private keysCode!: UserInputManagerDatum[];
    private scene: Phaser.Scene;
    private isInputDisabled: boolean;
    private isRightClickDisabled: boolean;

    public userInputHandler: UserInputHandlerInterface;
    private enableUserInputsStoreUnsubscribe: Unsubscriber;
    private readonly disableControlsReasons: Set<DisableControlsReason> = new Set();
    private readonly onPointerGameOut = () => {
        if (this.userInputHandler.handlePointerOutEvent) this.userInputHandler.handlePointerOutEvent();
        else this.cancelPointerGesture();
    };
    private readonly cancelPointerGesture = () => this.userInputHandler.handlePointerCancelEvent?.();

    constructor(scene: Phaser.Scene, userInputHandler: UserInputHandlerInterface) {
        this.scene = scene;
        this.userInputHandler = userInputHandler;

        this.isInputDisabled = false;
        this.isRightClickDisabled = false;
        this.initKeyBoardEvent();
        this.bindInputEventHandlers();

        this.enableUserInputsStoreUnsubscribe = enableUserInputsStore.subscribe((enable) => {
            if (enable) {
                this.restoreControls("store");
            } else {
                this.disableControls("store");
            }
        });
    }

    initKeyBoardEvent() {
        this.keysCode = [
            {
                event: UserInputEvent.MoveUp,
                keyInstance: this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.Z, false),
                key: "Z",
                description: get(LL).menu.shortcuts.moveUp(),
            },
            {
                event: UserInputEvent.MoveUp,
                keyInstance: this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.W, false),
                key: "W",
                description: get(LL).menu.shortcuts.moveUp(),
            },
            {
                event: UserInputEvent.MoveLeft,
                keyInstance: this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.Q, false),
                key: "Q",
                description: get(LL).menu.shortcuts.moveLeft(),
            },
            {
                event: UserInputEvent.MoveLeft,
                keyInstance: this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.A, false),
                key: "A",
                description: get(LL).menu.shortcuts.moveLeft(),
            },
            {
                event: UserInputEvent.MoveDown,
                keyInstance: this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.S, false),
                key: "S",
                description: get(LL).menu.shortcuts.moveDown(),
            },
            {
                event: UserInputEvent.MoveRight,
                keyInstance: this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.D, false),
                key: "D",
                description: get(LL).menu.shortcuts.moveRight(),
            },

            {
                event: UserInputEvent.MoveUp,
                keyInstance: this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.UP, false),
                key: "Up",
                description: get(LL).menu.shortcuts.moveUp(),
            },
            {
                event: UserInputEvent.MoveLeft,
                keyInstance: this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT, false),
                key: "Left",
                description: get(LL).menu.shortcuts.moveLeft(),
            },
            {
                event: UserInputEvent.MoveDown,
                keyInstance: this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN, false),
                key: "Down",
                description: get(LL).menu.shortcuts.moveDown(),
            },
            {
                event: UserInputEvent.MoveRight,
                keyInstance: this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT, false),
                key: "Right",
                description: get(LL).menu.shortcuts.moveRight(),
            },

            {
                event: UserInputEvent.SpeedUp,
                keyInstance: this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT, false),
                key: "Shift",
                description: get(LL).menu.shortcuts.speedUp(),
            },
            {
                event: UserInputEvent.Interact,
                keyInstance: this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE, false),
                key: "Space",
                description: get(LL).menu.shortcuts.interact(),
            },
            {
                event: UserInputEvent.Follow,
                keyInstance: this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.F, false),
                key: "F",
                description: get(LL).menu.shortcuts.follow(),
            },
        ];
    }

    /**
     * Will disable the controls for the user.
     * You need to pass the reason why the controls are disabled.
     * When you restore the controls, you need to pass the same reason.
     */
    disableControls(reason: DisableControlsReason) {
        try {
            this.scene.input.keyboard?.disableGlobalCapture();
            this.disableControlsReasons.add(reason);
        } catch (e) {
            console.warn(e);
        }
        this.isInputDisabled = true;
        this.cancelPointerGesture();
    }

    /**
     * Will restore the controls for the user.
     * You need to pass the reason why the controls are restored.
     * Only when there are no more reasons to disable the controls, the controls will be restored.
     */
    restoreControls(reason: DisableControlsReason) {
        this.disableControlsReasons.delete(reason);
        if (this.disableControlsReasons.size > 0) {
            return;
        }
        try {
            this.scene.input.keyboard?.enableGlobalCapture();
        } catch (e) {
            console.warn(e);
        }
        this.isInputDisabled = false;
    }

    get keysCodeList(): Shortcut[] {
        return this.keysCode;
    }

    get isControlsEnabled() {
        return !this.isInputDisabled;
    }

    disableRightClick() {
        this.isRightClickDisabled = true;
    }

    restoreRightClick() {
        this.isRightClickDisabled = false;
    }

    get isRightClickEnabled() {
        return !this.isRightClickDisabled;
    }

    getEventListForGameTick(): ActiveEventList {
        const eventsMap = new ActiveEventList();
        if (this.isInputDisabled) {
            return eventsMap;
        }
        this.keysCode.forEach((d) => {
            if (d.keyInstance?.isDown) {
                // Fix mac keyboard issue
                // Prevents the input from being triggered when the focus is on an input field
                if (
                    d.keyInstance.originalEvent.target instanceof HTMLInputElement ||
                    d.keyInstance.originalEvent.target instanceof HTMLTextAreaElement ||
                    d.keyInstance.originalEvent.target instanceof HTMLSelectElement ||
                    d.keyInstance.originalEvent.metaKey ||
                    d.keyInstance.originalEvent.ctrlKey
                ) {
                    d.keyInstance.reset();
                    return;
                }

                eventsMap.set(d.event, true);
            }
        });
        return eventsMap;
    }

    handleActivableEntity() {
        this.userInputHandler.handleActivableEntity();
    }

    addSpaceEventListener(callback: () => void) {
        this.userInputHandler.addSpaceEventListener(callback);
    }
    removeSpaceEventListener(callback: () => void) {
        this.userInputHandler.removeSpaceEventListener(callback);
    }

    destroy(): void {
        this.cancelPointerGesture();
        this.scene.input.off(Phaser.Input.Events.GAME_OUT, this.onPointerGameOut);
        this.scene.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.cancelPointerGesture);
        this.scene.game.events.off(Phaser.Core.Events.BLUR, this.cancelPointerGesture);
        this.enableUserInputsStoreUnsubscribe();
    }

    private bindInputEventHandlers() {
        this.scene.input.on(Phaser.Input.Events.GAME_OUT, this.onPointerGameOut);
        this.scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.cancelPointerGesture);
        this.scene.game.events.on(Phaser.Core.Events.BLUR, this.cancelPointerGesture);
        this.scene.input.on(
            Phaser.Input.Events.POINTER_WHEEL,
            (pointer: Pointer, gameObjects: GameObject[], deltaX: number, deltaY: number, deltaZ: number) => {
                if (this.isInputDisabled) {
                    return;
                }
                this.userInputHandler.handleMouseWheelEvent(pointer, gameObjects, deltaX, deltaY, deltaZ);
            },
        );

        this.scene.input.on(Phaser.Input.Events.POINTER_UP, (pointer: Pointer, gameObjects: GameObject[]) => {
            this.userInputHandler.handlePointerUpEvent(pointer, gameObjects);

            // Disable focus on iframe (need by Firefox)
            if (pointer.downElement?.nodeName === "CANVAS" && document.activeElement instanceof HTMLIFrameElement) {
                document.activeElement.blur();
            }
        });

        this.scene.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Pointer, gameObjects: GameObject[]) => {
            if (this.isInputDisabled) {
                return;
            }
            this.userInputHandler.handlePointerDownEvent(pointer, gameObjects);
        });

        this.scene.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Pointer, gameObjects: GameObject[]) => {
            if (this.isInputDisabled) {
                return;
            }
            this.userInputHandler.handlePointerMoveEvent(pointer, gameObjects);
        });

        this.scene.input.keyboard?.on("keyup", (event: KeyboardEvent) => {
            if (this.isInputDisabled) {
                return;
            }
            this.userInputHandler.handleKeyUpEvent(event);
        });

        this.scene.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
            if (this.isInputDisabled) {
                return;
            }
            this.userInputHandler.handleKeyDownEvent(event);
        });
    }
}
