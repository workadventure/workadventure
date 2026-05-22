import { DEPTH_INGAME_TEXT_INDEX } from "./DepthIndexes";
import type { GameScene } from "./GameScene";

type UsernameElement = {
    element: HTMLDivElement;
    x: number;
    y: number;
    depth: number;
    scale: number;
    zoomScale: number;
};

const PLAYER_NAME_BACKGROUND_COLOR = "rgba(27, 42, 65, 0.5)";
const PLAYER_NAME_BACKGROUND_RADIUS = 8;
const PLAYER_NAME_HEIGHT = 14;
const PLAYER_NAME_PADDING = 6;
const PLAYER_NAME_GAP = 4;

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

    public addUsername(
        id: number,
        x: number,
        y: number,
        depth: number,
        displayScale: number,
        zoomScale: number
    ): HTMLDivElement {
        let username = this.usernames.get(id);

        if (!username) {
            const element = document.createElement("div");

            element.ariaHidden = "true";
            element.className = "username-display";
            element.style.background = PLAYER_NAME_BACKGROUND_COLOR;

            username = {
                element,
                x,
                y,
                depth,
                scale: displayScale,
                zoomScale,
            };

            this.container.appendChild(element);
            this.usernames.set(id, username);

            this.applyStyles(username);
            this.applyDepth(username);
            return element;
        }

        username.x = x;
        username.y = y;
        username.depth = depth;
        username.scale = displayScale;
        username.zoomScale = zoomScale;
        this.applyStyles(username);
        this.applyDepth(username);
        return username.element;
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

    public updateUsernameScale(id: number, displayScale: number, zoomScale: number): void {
        const username = this.usernames.get(id);
        if (!username) {
            return;
        }
        if (username.scale === displayScale && username.zoomScale === zoomScale) {
            return;
        }

        username.scale = displayScale;
        username.zoomScale = zoomScale;
        this.applyStyles(username);
    }

    public updateUsernameDepth(id: number, depth: number): void {
        const username = this.usernames.get(id);
        if (!username) {
            return;
        }

        if (username.depth === depth) {
            return;
        }

        username.depth = depth;
        this.applyDepth(username);
    }

    public updateUsernameBackgroundColor(id: number, color: number | undefined): void {
        const username = this.usernames.get(id);
        if (!username) {
            return;
        }

        username.element.style.background =
            color === undefined ? PLAYER_NAME_BACKGROUND_COLOR : `#${color.toString(16).padStart(6, "0")}`;
    }

    public removeUsername(id: number): void {
        const username = this.usernames.get(id);
        if (!username) {
            return;
        }

        this.removeUsernameElement(username);
        this.usernames.delete(id);
    }

    public destroy(): void {
        for (const username of this.usernames.values()) {
            this.removeUsernameElement(username);
        }

        this.usernames.clear();
        this.domElement.destroy();
    }

    private applyStyles(username: UsernameElement): void {
        const domScale = username.zoomScale * username.scale;
        username.element.style.setProperty("--username-dom-scale", domScale.toString());
        username.element.style.height = `${PLAYER_NAME_HEIGHT * domScale}px`;
        username.element.style.gap = `${PLAYER_NAME_GAP * domScale}px`;
        username.element.style.padding = `0 ${PLAYER_NAME_PADDING * domScale}px`;
        username.element.style.borderRadius = `${PLAYER_NAME_BACKGROUND_RADIUS * domScale}px`;
        this.applyTransform(username);
    }

    private applyTransform(username: UsernameElement): void {
        const scale = 1 / username.zoomScale;
        username.element.style.transform = `translate3d(${username.x}px, ${username.y}px, 0) translate(-50%, -50%) scale(${scale})`;
    }

    private applyDepth(username: UsernameElement): void {
        username.element.style.zIndex = `${Math.round(username.depth)}`;
    }

    private removeUsernameElement(username: UsernameElement): void {
        username.element.remove();
    }
}
