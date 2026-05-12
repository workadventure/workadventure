import { DEPTH_INGAME_TEXT_INDEX } from "./DepthIndexes";
import type { GameScene } from "./GameScene";

type UsernameElement = {
    element: HTMLParagraphElement;
    x: number;
    y: number;
    scale: number;
};

export class UsernameDomLayer {
    private readonly container: HTMLDivElement;
    private readonly domElement: Phaser.GameObjects.DOMElement;
    private readonly usernames = new Map<number, UsernameElement>();

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

    public addUsername(id: number, playerName: string, x: number, y: number, font: string, scale: number): void {
        let username = this.usernames.get(id);

        if (!username) {
            const element = document.createElement("p");

            element.ariaHidden = "true";
            element.textContent = playerName;

            element.style.position = "absolute";
            element.style.margin = "0";
            element.style.color = "#ffffff";
            element.style.font = font;
            element.style.whiteSpace = "nowrap";
            element.style.pointerEvents = "none";

            element.style.willChange = "transform";

            username = {
                element,
                x,
                y,
                scale,
            };

            this.container.appendChild(element);
            this.usernames.set(id, username);

            this.applyTransform(username);
            return;
        }

        if (username.element.textContent !== playerName) {
            username.element.textContent = playerName;
        }

        username.x = x;
        username.y = y;
        username.scale = scale;
        this.applyTransform(username);
    }

    public updateUsernamePosition(id: number, x: number, y: number): void {
        const username = this.usernames.get(id);
        if (!username) {
            return;
        }

        if (username.x === x && username.y === y) {
            return;
        }

        username.x = x;
        username.y = y;
        this.applyTransform(username);
    }

    public updateUsernameScale(id: number, scale: number): void {
        const username = this.usernames.get(id);
        if (!username) {
            return;
        }

        if (username.scale === scale) {
            return;
        }

        username.scale = scale;
        this.applyTransform(username);
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
        for (const username of this.usernames.values()) {
            username.element.remove();
        }

        this.usernames.clear();
        this.domElement.destroy();
    }

    private applyTransform(username: UsernameElement): void {
        username.element.style.transform = `translate3d(${username.x}px, ${username.y}px, 0) translate(-50%, -50%) scale(${username.scale})`;
    }
}
