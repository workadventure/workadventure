import Map = Phaser.Structs.Map;
import {GameScene} from "../Game/GameScene";

interface UserInputManagerDatum {
    keyCode: number;
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
    private KeysCode : any;
    constructor() {
        this.KeysCode = {};
    }
    get(event: UserInputEvent): boolean {
        return this.KeysCode[event] || false;
    }
    set(event: UserInputEvent, value: boolean): boolean {
        return this.KeysCode[event] = true;
    }
}

//this class is responsible for catching user inputs and listing all active user actions at every game tick events.
export class UserInputManager {
    private KeysCode: UserInputManagerDatum[] = [
        {keyCode: Phaser.Input.Keyboard.KeyCodes.Z, event: UserInputEvent.MoveUp, keyInstance: null},
        {keyCode: Phaser.Input.Keyboard.KeyCodes.Q, event: UserInputEvent.MoveLeft, keyInstance: null},
        {keyCode: Phaser.Input.Keyboard.KeyCodes.S, event: UserInputEvent.MoveDown, keyInstance: null},
        {keyCode: Phaser.Input.Keyboard.KeyCodes.D, event: UserInputEvent.MoveRight, keyInstance: null},

        {keyCode: Phaser.Input.Keyboard.KeyCodes.UP, event: UserInputEvent.MoveUp, keyInstance: null},
        {keyCode: Phaser.Input.Keyboard.KeyCodes.LEFT, event: UserInputEvent.MoveLeft, keyInstance: null},
        {keyCode: Phaser.Input.Keyboard.KeyCodes.DOWN, event: UserInputEvent.MoveDown, keyInstance: null},
        {keyCode: Phaser.Input.Keyboard.KeyCodes.RIGHT, event: UserInputEvent.MoveRight, keyInstance: null},

        {keyCode: Phaser.Input.Keyboard.KeyCodes.SHIFT, event: UserInputEvent.SpeedUp, keyInstance: null},

        {keyCode: Phaser.Input.Keyboard.KeyCodes.E, event: UserInputEvent.Interact, keyInstance: null},
        {keyCode: Phaser.Input.Keyboard.KeyCodes.F, event: UserInputEvent.Shout, keyInstance: null},
    ];

    constructor(Scene : GameScene) {
        this.KeysCode.forEach(d => {
            d.keyInstance = Scene.input.keyboard.addKey(d.keyCode);
        });
    }

    getEventListForGameTick(): ActiveEventList {
        let eventsMap = new ActiveEventList();
        this.KeysCode.forEach(d => {
            if (d. keyInstance.isDown) {
                eventsMap.set(d.event, true);
            }
        });
        return eventsMap;
    }
}
