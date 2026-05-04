import { DEPTH_INGAME_TEXT_INDEX } from "./DepthIndexes";
import type { GameScene } from "./GameScene";

type UsernameElement = {
    element: HTMLDivElement;
};

export class UsernameDomLayer {
    private readonly container: HTMLDivElement;
    private readonly domElement: Phaser.GameObjects.DOMElement;
    private readonly usernames = new Map<number, UsernameElement>();

    constructor(scene: GameScene, width: number, height: number) {
        this.container = document.createElement("div");
        this.container.style.position = "relative";
        this.container.style.width = `${width}px`;
        this.container.style.height = `${height}px`;
        this.container.style.pointerEvents = "none";
        this.container.style.overflow = "visible";

        this.domElement = scene.add.dom(0, 0, this.container).setOrigin(0, 0).setDepth(DEPTH_INGAME_TEXT_INDEX);
        this.domElement.pointerEvents = "none";
    }

    public setVisible(visible: boolean): void {
        this.domElement.setVisible(visible);
    }

    public addUsername(id: number, playerName: string, x: number, y: number, fontSize: number, scale: number): void {
        let username = this.usernames.get(id);
        if (!username) {
            const element = document.createElement("p");
            element.style.position = "absolute";
            element.style.left = "0";
            element.style.top = "0";
            element.style.margin = "0";
            element.style.color = "#ffffff";
            element.style.fontFamily = '"Press Start 2P", monospace';
            element.style.lineHeight = "1";
            element.style.whiteSpace = "nowrap";
            element.style.textAlign = "center";
            element.style.transformOrigin = "50% 50%";
            element.style.pointerEvents = "none";
            this.container.appendChild(element);
            username = { element };
            this.usernames.set(id, username);
        }

        username.element.textContent = playerName;
        username.element.style.fontSize = `${fontSize}px`;
        this.updateUsernamePosition(id, x, y);
        this.updateUsernameScale(id, scale);
    }

    public updateUsernamePosition(id: number, x: number, y: number): void {
        const username = this.usernames.get(id);
        if (!username) {
            return;
        }

        username.element.style.left = `${x}px`;
        username.element.style.top = `${y}px`;
    }

    public updateUsernameScale(id: number, scale: number): void {
        const username = this.usernames.get(id);
        if (!username) {
            return;
        }

        username.element.style.transform = `translate(-50%, -50%) scale(${scale})`;
    }

    public removeUsername(id: number): void {
        const username = this.usernames.get(id);
        if (!username) {
            return;
        }

        username.element.remove();
        this.usernames.delete(id);
    }

    public destroy(): void {
        this.usernames.clear();
        this.domElement.destroy();
    }
}
