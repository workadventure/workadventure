import * as Phaser from "phaser";
import type { Shortcut } from "../Phaser/UserInput/UserInputManager";

import Pointer = Phaser.Input.Pointer;
import GameObject = Phaser.GameObjects.GameObject;

export interface UserInputHandlerInterface {
    shortcuts: Shortcut[];
    handleMouseWheelEvent: (
        pointer: Pointer,
        gameObjects: GameObject[],
        deltaX: number,
        deltaY: number,
        deltaZ: number,
    ) => void;
    handlePointerUpEvent: (pointer: Pointer, gameObjects: GameObject[]) => void;
    handlePointerDownEvent: (pointer: Pointer, gameObjects: GameObject[]) => void;
    handlePointerMoveEvent: (pointer: Pointer, gameObjects: GameObject[]) => void;
    handlePointerOutEvent?: () => void;
    handlePointerCancelEvent?: () => void;
    /** A pinch step: `centre` is between the fingers, `pan` is how far that point moved (in game pixels). */
    handlePinch?: (zoomFactor: number, centre: { x: number; y: number }, pan: { x: number; y: number }) => void;

    handleKeyUpEvent: (event: KeyboardEvent) => KeyboardEvent;
    handleKeyDownEvent: (event: KeyboardEvent) => KeyboardEvent;

    handleActivableEntity: () => void;

    addSpaceEventListener: (callback: () => void) => void;
    removeSpaceEventListener: (callback: () => void) => void;
}
