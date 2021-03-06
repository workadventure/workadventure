import {Scene} from "phaser";

export abstract class ResizableScene extends Scene {
    public abstract onResize(ev: UIEvent): void;
}
