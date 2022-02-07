import { touchScreenManager } from "../../Touch/TouchScreenManager";
import { MobileJoystick } from "../Components/MobileJoystick";
import { enableUserInputsStore } from "../../Stores/UserInputStore";
import type { Direction } from "phaser3-rex-plugins/plugins/virtualjoystick.js";
import type { UserInputHandlerInterface } from "../../Interfaces/UserInputHandlerInterface";

interface UserInputManagerDatum {
    keyInstance: Phaser.Input.Keyboard.Key;
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
    Shout,
    JoystickMove,
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

    private joystick?: MobileJoystick;
    private joystickEvents = new ActiveEventList();
    private joystickForceThreshold = 60;
    private joystickForceAccuX = 0;
    private joystickForceAccuY = 0;

    private userInputHandler: UserInputHandlerInterface;

    constructor(scene: Phaser.Scene, userInputHandler: UserInputHandlerInterface) {
        this.scene = scene;
        this.userInputHandler = userInputHandler;

        this.isInputDisabled = false;
        this.initKeyBoardEvent();
        this.bindInputEventHandlers();
        if (touchScreenManager.supportTouchScreen) {
            this.initVirtualJoystick();
        }

        enableUserInputsStore.subscribe((enable) => {
            enable ? this.restoreControls() : this.disableControls();
        });
    }

    initVirtualJoystick() {
        this.joystick = new MobileJoystick(this.scene);
        this.joystick.on("update", () => {
            this.joystickForceAccuX = this.joystick?.forceX ? this.joystickForceAccuX : 0;
            this.joystickForceAccuY = this.joystick?.forceY ? this.joystickForceAccuY : 0;
            const cursorKeys = this.joystick?.createCursorKeys();
            for (const name in cursorKeys) {
                const key = cursorKeys[name as Direction];
                switch (name) {
                    case "up":
                        this.joystickEvents.set(UserInputEvent.MoveUp, key.isDown);
                        break;
                    case "left":
                        this.joystickEvents.set(UserInputEvent.MoveLeft, key.isDown);
                        break;
                    case "down":
                        this.joystickEvents.set(UserInputEvent.MoveDown, key.isDown);
                        break;
                    case "right":
                        this.joystickEvents.set(UserInputEvent.MoveRight, key.isDown);
                        break;
                }
            }
        });
    }

    initKeyBoardEvent() {
        this.keysCode = [
            {
                event: UserInputEvent.MoveUp,
                keyInstance: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z, false),
            },
            {
                event: UserInputEvent.MoveUp,
                keyInstance: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W, false),
            },
            {
                event: UserInputEvent.MoveLeft,
                keyInstance: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q, false),
            },
            {
                event: UserInputEvent.MoveLeft,
                keyInstance: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A, false),
            },
            {
                event: UserInputEvent.MoveDown,
                keyInstance: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S, false),
            },
            {
                event: UserInputEvent.MoveRight,
                keyInstance: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D, false),
            },

            {
                event: UserInputEvent.MoveUp,
                keyInstance: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP, false),
            },
            {
                event: UserInputEvent.MoveLeft,
                keyInstance: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT, false),
            },
            {
                event: UserInputEvent.MoveDown,
                keyInstance: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN, false),
            },
            {
                event: UserInputEvent.MoveRight,
                keyInstance: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT, false),
            },

            {
                event: UserInputEvent.SpeedUp,
                keyInstance: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT, false),
            },

            {
                event: UserInputEvent.Interact,
                keyInstance: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E, false),
            },
            {
                event: UserInputEvent.Interact,
                keyInstance: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE, false),
            },
            {
                event: UserInputEvent.Follow,
                keyInstance: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F, false),
            },
            {
                event: UserInputEvent.Shout,
                keyInstance: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F, false),
            },
        ];
    }

    clearAllListeners() {
        this.scene.input.keyboard.removeAllListeners();
    }

    //todo: should we also disable the joystick?
    disableControls() {
        this.scene.input.keyboard.removeAllKeys();
        this.isInputDisabled = true;
    }

    restoreControls() {
        this.initKeyBoardEvent();
        this.isInputDisabled = false;
    }
    getEventListForGameTick(): ActiveEventList {
        const eventsMap = new ActiveEventList();
        if (this.isInputDisabled) {
            return eventsMap;
        }
        this.joystickEvents.forEach((value, key) => {
            if (value && this.joystick) {
                switch (key) {
                    case UserInputEvent.MoveUp:
                    case UserInputEvent.MoveDown:
                        this.joystickForceAccuY += this.joystick.forceY;
                        if (Math.abs(this.joystickForceAccuY) > this.joystickForceThreshold) {
                            eventsMap.set(key, value);
                            this.joystickForceAccuY = 0;
                        }
                        break;
                    case UserInputEvent.MoveLeft:
                    case UserInputEvent.MoveRight:
                        this.joystickForceAccuX += this.joystick.forceX;
                        if (Math.abs(this.joystickForceAccuX) > this.joystickForceThreshold) {
                            eventsMap.set(key, value);
                            this.joystickForceAccuX = 0;
                        }
                        break;
                }
            }
        });
        eventsMap.set(UserInputEvent.JoystickMove, this.joystickEvents.any());
        this.keysCode.forEach((d) => {
            if (d.keyInstance.isDown) {
                eventsMap.set(d.event, true);
            }
        });
        return eventsMap;
    }

    addSpaceEventListner(callback: Function) {
        this.userInputHandler.addSpaceEventListener(callback);
    }
    removeSpaceEventListner(callback: Function) {
        this.userInputHandler.removeSpaceEventListner(callback);
    }

    destroy(): void {
        this.joystick?.destroy();
    }

    private bindInputEventHandlers() {
        this.scene.input.on(
            Phaser.Input.Events.POINTER_WHEEL,
            (
                pointer: Phaser.Input.Pointer,
                gameObjects: Phaser.GameObjects.GameObject[],
                deltaX: number,
                deltaY: number,
                deltaZ: number
            ) => {
                if (this.isInputDisabled) {
                    return;
                }
                this.userInputHandler.handleMouseWheelEvent(pointer, gameObjects, deltaX, deltaY, deltaZ);
            }
        );

        this.scene.input.on(
            Phaser.Input.Events.POINTER_UP,
            (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]) => {
                this.joystick?.hide();
                this.userInputHandler.handlePointerUpEvent(pointer, gameObjects);

                // Disable focus on iframe (need by Firefox)
                if (pointer.downElement.nodeName === "CANVAS" && document.activeElement instanceof HTMLIFrameElement) {
                    document.activeElement.blur();
                }
            }
        );

        this.scene.input.on(
            Phaser.Input.Events.POINTER_DOWN,
            (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]) => {
                if (!pointer.wasTouch) {
                    return;
                }
                this.userInputHandler.handlePointerDownEvent(pointer, gameObjects);
                // Let's only display the joystick if there is one finger on the screen
                if ((pointer.event as TouchEvent).touches.length === 1) {
                    this.joystick?.showAt(pointer.x, pointer.y);
                } else {
                    this.joystick?.hide();
                }
            }
        );

        this.scene.input.keyboard.on("keyup-SPACE", (event: Event) => {
            this.userInputHandler.handleSpaceKeyUpEvent(event);
        });
    }
}
