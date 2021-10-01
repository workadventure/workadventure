import { Scene } from "phaser";
import DOMElement = Phaser.GameObjects.DOMElement;

export abstract class ResizableScene extends Scene {
    public abstract onResize(): void;

    /**
     * Centers the DOM element on the X axis.
     *
     * @param object
     * @param defaultWidth The width of the DOM element. We try to compute it but it may not be available if called from "create".
     */
    public centerXDomElement(object: DOMElement, defaultWidth: number): void {
        object.x =
            this.scale.width / 2 -
            (object && object.node && object.node.getBoundingClientRect().width > 0
                ? object.node.getBoundingClientRect().width / 2 / this.scale.zoom
                : defaultWidth / this.scale.zoom);
    }
}
