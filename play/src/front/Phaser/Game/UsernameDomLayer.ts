import { DEPTH_INGAME_TEXT_INDEX } from "./DepthIndexes";
import type { GameScene } from "./GameScene";

export class UsernameDomLayer {
    private readonly container: HTMLDivElement;
    private readonly domElement: Phaser.GameObjects.DOMElement;

    constructor(scene: GameScene) {
        this.container = document.createElement("div");
        this.container.style.position = "relative";
        this.container.style.pointerEvents = "none";
        this.container.style.overflow = "visible";

        this.domElement = scene.add.dom(0, 0, this.container).setOrigin(0, 0).setDepth(DEPTH_INGAME_TEXT_INDEX);

        this.domElement.pointerEvents = "none";
    }

    public setVisible(visible: boolean): void {
        this.domElement.setVisible(visible);
    }

    public addUsername(usernameDisplayElement: HTMLDivElement): void {
        this.container.appendChild(usernameDisplayElement);
    }

    public destroy(): void {
        this.domElement.destroy();
    }
}
