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

export type RequireOnlyOne<T, keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, keys>> &
    {
        [K in keys]-?: Required<Pick<T, K>> & Partial<Record<Exclude<keys, K>, undefined>>;
    }[keys];
