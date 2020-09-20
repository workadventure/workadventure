import {GameScene} from "../Game/GameScene";

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
}

//this class is responsible for catching user inputs and listing all active user actions at every game tick events.
export class UserInputManager {
    private KeysCode!: UserInputManagerDatum[];
    private Scene: GameScene;

    constructor(Scene : GameScene) {
        this.Scene = Scene;
        this.initKeyBoardEvent();
    }

    initKeyBoardEvent(){
        this.KeysCode = [
            {event: UserInputEvent.MoveUp, keyInstance: this.Scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z) },
            {event: UserInputEvent.MoveLeft, keyInstance: this.Scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q) },
            {event: UserInputEvent.MoveDown, keyInstance: this.Scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S) },
            {event: UserInputEvent.MoveRight, keyInstance: this.Scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D) },

            {event: UserInputEvent.MoveUp, keyInstance: this.Scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP) },
            {event: UserInputEvent.MoveLeft, keyInstance: this.Scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT) },
            {event: UserInputEvent.MoveDown, keyInstance: this.Scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN) },
            {event: UserInputEvent.MoveRight, keyInstance: this.Scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT) },

            {event: UserInputEvent.SpeedUp, keyInstance: this.Scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT) },

            {event: UserInputEvent.Interact, keyInstance: this.Scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E) },
            {event: UserInputEvent.Interact, keyInstance: this.Scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE) },
            {event: UserInputEvent.Shout, keyInstance: this.Scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F) },
        ];
    }

    clearAllInputKeyboard(){
        this.Scene.input.keyboard.removeAllKeys();
    }

    getEventListForGameTick(): ActiveEventList {
        const eventsMap = new ActiveEventList();
        this.KeysCode.forEach(d => {
            if (d. keyInstance.isDown) {
                eventsMap.set(d.event, true);
            }
        });
        return eventsMap;
    }
}
