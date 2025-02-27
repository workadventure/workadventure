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
    handlePointerMoveEvent: (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]) => void;

    handleKeyUpEvent: (event: KeyboardEvent) => KeyboardEvent;
    handleKeyDownEvent: (event: KeyboardEvent) => KeyboardEvent;

    handleActivableEntity: () => void;

    addSpaceEventListener: (callback: () => void) => void;
    removeSpaceEventListener: (callback: () => void) => void;
}
