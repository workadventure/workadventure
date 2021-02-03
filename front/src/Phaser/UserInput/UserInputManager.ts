import { Direction, IVirtualJoystick } from "../../types";
import {GameScene} from "../Game/GameScene";
const {
  default: VirtualJoystick,
} = require("phaser3-rex-plugins/plugins/virtualjoystick.js");

interface UserInputManagerDatum {
    keyInstance: Phaser.Input.Keyboard.Key;
    event: UserInputEvent
}

export enum UserInputEvent {
    MoveLeft = 1,
    MoveUp,
    MoveRight,
    MoveDown,
    SpeedUp,
    Interact,
    Shout,
}

//we cannot the map structure so we have to create a replacment
export class ActiveEventList {
    private KeysCode : Map<UserInputEvent, boolean> = new Map<UserInputEvent, boolean>();

    get(event: UserInputEvent): boolean {
        return this.KeysCode.get(event) || false;
    }
    set(event: UserInputEvent, value: boolean): void {
        this.KeysCode.set(event, value);
    }
    forEach(callback: (value: boolean, key: UserInputEvent) => void): void {
        this.KeysCode.forEach(callback);
    }
}

//this class is responsible for catching user inputs and listing all active user actions at every game tick events.
export class UserInputManager {
    private KeysCode!: UserInputManagerDatum[];
    private Scene: GameScene;

    private joystickEvents = new ActiveEventList();
    constructor(Scene: GameScene, virtualJoystick: IVirtualJoystick) {
        this.Scene = Scene;
        this.initKeyBoardEvent();
        virtualJoystick.on("update", () => {
            const cursorKeys = virtualJoystick.createCursorKeys();
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

    initKeyBoardEvent(){
        this.KeysCode = [
            {event: UserInputEvent.MoveUp, keyInstance: this.Scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z, false) },
            {event: UserInputEvent.MoveUp, keyInstance: this.Scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W, false) },
            {event: UserInputEvent.MoveLeft, keyInstance: this.Scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q, false) },
            {event: UserInputEvent.MoveLeft, keyInstance: this.Scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A, false) },
            {event: UserInputEvent.MoveDown, keyInstance: this.Scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S, false) },
            {event: UserInputEvent.MoveRight, keyInstance: this.Scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D, false) },

            {event: UserInputEvent.MoveUp, keyInstance: this.Scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP, false) },
            {event: UserInputEvent.MoveLeft, keyInstance: this.Scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT, false) },
            {event: UserInputEvent.MoveDown, keyInstance: this.Scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN, false) },
            {event: UserInputEvent.MoveRight, keyInstance: this.Scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT, false) },

            {event: UserInputEvent.SpeedUp, keyInstance: this.Scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT, false) },

            {event: UserInputEvent.Interact, keyInstance: this.Scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E, false) },
            {event: UserInputEvent.Interact, keyInstance: this.Scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE, false) },
            {event: UserInputEvent.Shout, keyInstance: this.Scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F, false) },
        ];
    }

    clearAllListeners(){
        this.Scene.input.keyboard.removeAllListeners();
    }

    clearAllKeys(){
        this.Scene.input.keyboard.removeAllKeys();
    }

    getEventListForGameTick(): ActiveEventList {
        const eventsMap = new ActiveEventList();
        this.joystickEvents.forEach((value, key) => {
            if (value) {
                eventsMap.set(key, value);
            }
        });
        this.KeysCode.forEach(d => {
            if (d. keyInstance.isDown) {
                eventsMap.set(d.event, true);
            }
        });
        return eventsMap;
    }

    spaceEvent(callback : Function){
        this.Scene.input.keyboard.on('keyup-SPACE', (event: Event) => {
            callback();
            return event;
        });
    }

    addSpaceEventListner(callback : Function){
        this.Scene.input.keyboard.addListener('keyup-SPACE', callback);
    }
    removeSpaceEventListner(callback : Function){
        this.Scene.input.keyboard.removeListener('keyup-SPACE', callback);
    }
}
