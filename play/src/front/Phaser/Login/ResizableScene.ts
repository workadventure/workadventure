import * as Phaser from "phaser";

export abstract class ResizableScene extends Phaser.Scene {
    public abstract onResize(): void;
}
