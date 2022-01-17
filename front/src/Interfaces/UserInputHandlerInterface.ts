export interface UserInputHandlerInterface {
    handleMouseWheelEvent: (
        pointer: Phaser.Input.Pointer,
        gameObjects: Phaser.GameObjects.GameObject[],
        deltaX: number,
        deltaY: number,
        deltaZ: number
    ) => void;
    handleSpaceKeyUpEvent: (event: Event) => Event;
}
