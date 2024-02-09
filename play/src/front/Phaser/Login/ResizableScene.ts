import { Scene } from "phaser";
import DOMElement = Phaser.GameObjects.DOMElement;

export abstract class ResizableScene extends Scene {
    public abstract onResize(): void;
}
