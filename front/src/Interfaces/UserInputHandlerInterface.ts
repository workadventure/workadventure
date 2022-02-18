export interface UserInputHandlerInterface {
    handleMouseWheelEvent: (
        pointer: Phaser.Input.Pointer,
        gameObjects: Phaser.GameObjects.GameObject[],
        deltaX: number,
        deltaY: number,
        deltaZ: number
    ) => void;
    handlePointerUpEvent: (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]) => void;
    handlePointerDownEvent: (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]) => void;
    handleSpaceKeyUpEvent: (event: Event) => Event;

    addSpaceEventListener: (callback: Function) => void;
    removeSpaceEventListner: (callback: Function) => void;
}
