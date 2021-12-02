import type Phaser from "phaser";

export type CursorKey = {
    isDown: boolean;
};

export type Direction = "left" | "right" | "up" | "down";

export interface CursorKeys extends Record<Direction, CursorKey> {
    left: CursorKey;
    right: CursorKey;
    up: CursorKey;
    down: CursorKey;
}

export interface IVirtualJoystick extends Phaser.GameObjects.GameObject {
    y: number;
    x: number;
    forceX: number;
    forceY: number;
    visible: boolean;
    createCursorKeys: () => CursorKeys;
}

export enum Easing {
    Linear = "Linear",
    QuadEaseIn = "Quad.easeIn",
    CubicEaseIn = "Cubic.easeIn",
    QuartEaseIn = "Quart.easeIn",
    QuintEaseIn = "Quint.easeIn",
    SineEaseIn = "Sine.easeIn",
    ExpoEaseIn = "Expo.easeIn",
    CircEaseIn = "Circ.easeIn",
    BackEaseIn = "Back.easeIn",
    BounceEaseIn = "Bounce.easeIn",
    QuadEaseOut = "Quad.easeOut",
    CubicEaseOut = "Cubic.easeOut",
    QuartEaseOut = "Quart.easeOut",
    QuintEaseOut = "Quint.easeOut",
    SineEaseOut = "Sine.easeOut",
    ExpoEaseOut = "Expo.easeOut",
    CircEaseOut = "Circ.easeOut",
    BackEaseOut = "Back.easeOut",
    BounceEaseOut = "Bounce.easeOut",
    QuadEaseInOut = "Quad.easeInOut",
    CubicEaseInOut = "Cubic.easeInOut",
    QuartEaseInOut = "Quart.easeInOut",
    QuintEaseInOut = "Quint.easeInOut",
    SineEaseInOut = "Sine.easeInOut",
    ExpoEaseInOut = "Expo.easeInOut",
    CircEaseInOut = "Circ.easeInOut",
    BackEaseInOut = "Back.easeInOut",
    BounceEaseInOut = "Bounce.easeInOut"
}
