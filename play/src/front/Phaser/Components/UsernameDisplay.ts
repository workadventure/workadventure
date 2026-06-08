import { AvailabilityStatus } from "@workadventure/messages";
import type { GameScene } from "../Game/GameScene";
import { waScaleManager, WaScaleManagerEvent } from "../Services/WaScaleManager";
import { UsernameMegaphoneDisplay } from "./UsernameMegaphoneDisplay";
import { UsernameStatusDisplay } from "./UsernameStatusDisplay";

const CORRECTION_RATE = 0.65; // When one game pixel is smaller than one screen pixel (zoomed-out), we zoom out the Woka name, but only up to CORRECTION_RATE. After that, the Woka name will stay at its current screen size even if we zoom out more (to keep the text readable)
const USERNAME_FONT_FAMILY = "Roboto";
const USERNAME_FONT_SIZE = 10;
const USERNAME_FONT_WEIGHT = 500;
const USERNAME_SIZE_ANIMATION_DURATION = 375;
const USERNAME_SIZE_ANIMATION_EASING = "cubic-bezier(0.2, 0, 0, 1)";

const PLAYER_NAME_BACKGROUND_COLOR = "rgba(27, 42, 65, 0.5)";
const PLAYER_NAME_BACKGROUND_RADIUS = 8;
const PLAYER_NAME_HEIGHT = 14;
const PLAYER_NAME_PADDING = 4;
const PLAYER_NAME_GAP = 4;

type Position = { x: number; y: number };

export class UsernameDisplay {
    private static nextDomUsernameId = 0;
    private readonly domUsernameId = UsernameDisplay.nextDomUsernameId++;
    private readonly element: HTMLDivElement;
    private readonly playerNameElement: HTMLParagraphElement;
    private readonly playerName: string;
    private playerNameOutlineColor: number | undefined;
    private displayScale: number;
    private readonly statusDisplay: UsernameStatusDisplay;
    private readonly megaphoneDisplay: UsernameMegaphoneDisplay;
    private sizeAnimation: Animation | undefined;

    private readonly onZoomChanged = (zoomModifier: number): void => {
        this.displayScale = this.getDisplayScale(zoomModifier);
        this.applyStyles();
    };
    private toForeFront: boolean = false;
    private depth: number = 0;

    constructor(
        private scene: GameScene,
        private x: number,
        private y: number,
        playerName: string,
        outlineColor: number | undefined,
    ) {
        this.playerName = playerName;
        this.displayScale = this.getDisplayScale(waScaleManager.zoomModifier);

        this.playerNameOutlineColor = outlineColor;
        this.statusDisplay = new UsernameStatusDisplay();
        this.megaphoneDisplay = new UsernameMegaphoneDisplay();
        this.playerNameElement = this.createPlayerNameElement();

        this.element = document.createElement("div");

        this.element.ariaHidden = "true";
        this.element.className = "username-display";
        this.element.style.background = PLAYER_NAME_BACKGROUND_COLOR;

        this.applyStyles();
        this.updatePlayerDepth();
        this.element.append(this.statusDisplay.element, this.playerNameElement, this.megaphoneDisplay.element);
        this.updateUsernameBackgroundColor(outlineColor);

        this.gameScene.usernameDomLayer.addUsername(this.element);

        this.scene.game.events.on(WaScaleManagerEvent.ZoomChanged, this.onZoomChanged);
    }

    private getDisplayScale(zoomModifier: number): number {
        return Math.max(zoomModifier > 0 ? CORRECTION_RATE / zoomModifier : 1, 1);
    }

    private showMegaphone(show = true, forceClose = false): void {
        if (show === this.megaphoneDisplay.isShown()) {
            return;
        }
        this.animateSizeChange(() => {
            this.megaphoneDisplay.show(show, forceClose);
        }, show);
    }

    public setPlayerNameOutlineColor(outlineColor: number | undefined): void {
        if (this.playerNameOutlineColor === outlineColor) {
            return;
        }
        this.playerNameOutlineColor = outlineColor;

        this.updateUsernameBackgroundColor(outlineColor);
    }

    public setAvailabilityStatus(availabilityStatus: AvailabilityStatus, instant = false, forceClose = false): void {
        this.statusDisplay.setAvailabilityStatus(availabilityStatus, instant);
        this.showMegaphone(availabilityStatus === AvailabilityStatus.SPEAKER, forceClose);
    }

    public getAvailabilityStatus(): AvailabilityStatus {
        return this.statusDisplay.availabilityStatus;
    }

    public setPlayerDepth(depth: number): void {
        this.depth = depth;
        this.updatePlayerDepth();
    }

    private updatePlayerDepth(): void {
        this.element.style.zIndex = `${Math.round(this.depth + (this.toForeFront ? 2000000000 : 0))}`;
    }

    public setPosition(x: number, y: number): this {
        if (x === this.x && y === this.y) {
            return this;
        }

        this.x = x;
        this.y = y;
        this.updateDomPosition();
        return this;
    }

    public destroy(): void {
        this.stopSizeAnimation();
        this.element.remove();
        this.statusDisplay.destroy();
        this.megaphoneDisplay.destroy();
        this.scene.game.events.off(WaScaleManagerEvent.ZoomChanged, this.onZoomChanged);
    }

    private get gameScene(): GameScene {
        return this.scene;
    }

    private updateDomPosition(): void {
        this.scene.events.once(Phaser.Scenes.Events.RENDER, () => {
            this.applyTransform();
        });
    }

    private getDomPosition(): Position {
        return {
            x: this.x,
            y: this.y - (PLAYER_NAME_HEIGHT / 2) * this.displayScale,
        };
    }

    private animateSizeChange(changeElement: () => void, megaphoneShownAfterChange: boolean): void {
        this.stopSizeAnimation();

        const previousWidth = this.element.offsetWidth;
        changeElement();
        const nextWidth = megaphoneShownAfterChange ? this.element.offsetWidth : this.measureWidthWithoutMegaphone();

        if (previousWidth === nextWidth) {
            return;
        }

        this.element.style.overflow = "hidden";
        this.element.style.width = `${previousWidth}px`;

        this.sizeAnimation = this.element.animate([{ width: `${previousWidth}px` }, { width: `${nextWidth}px` }], {
            duration: USERNAME_SIZE_ANIMATION_DURATION,
            easing: USERNAME_SIZE_ANIMATION_EASING,
        });

        this.sizeAnimation.onfinish = () => {
            this.sizeAnimation = undefined;
            this.element.style.overflow = "";
            this.element.style.width = "";
        };
    }

    private stopSizeAnimation(): void {
        this.sizeAnimation?.cancel();
        this.sizeAnimation = undefined;
        this.element.style.overflow = "";
        this.element.style.width = "";
    }

    private measureWidthWithoutMegaphone(): number {
        const previousDisplay = this.megaphoneDisplay.element.style.display;

        this.megaphoneDisplay.element.style.display = "none";
        const width = this.element.offsetWidth;
        this.megaphoneDisplay.element.style.display = previousDisplay;

        return width;
    }

    private createPlayerNameElement(): HTMLParagraphElement {
        const element = document.createElement("p");

        element.textContent = this.playerName;
        element.style.margin = "0";
        element.style.marginRight = `calc(2px * var(--username-dom-scale, 1))`;
        element.style.color = "#ffffff";
        element.style.fontFamily = USERNAME_FONT_FAMILY;
        element.style.fontSize = `calc(${USERNAME_FONT_SIZE}px * var(--username-dom-scale, 1))`;
        element.style.fontWeight = `${USERNAME_FONT_WEIGHT}`;
        element.style.whiteSpace = "nowrap";
        element.style.pointerEvents = "none";

        return element;
    }

    /**
     * If true, the z-index is updated to be at the very top. Used when we hover over a Woka.
     */
    public setToForeFront(toForeFront: boolean): void {
        this.toForeFront = toForeFront;
        this.updatePlayerDepth();
    }

    private applyTransform(): void {
        const scale = 1 / waScaleManager.zoomModifier;
        const position = this.getDomPosition();
        this.element.style.transform = `translate3d(${position.x}px, ${position.y}px, 0) translate(-50%, -50%) scale(${scale})`;
    }

    private applyStyles(): void {
        const domScale = waScaleManager.zoomModifier * this.displayScale;
        this.element.style.setProperty("--username-dom-scale", domScale.toString());
        this.element.style.height = `${PLAYER_NAME_HEIGHT * domScale}px`;
        this.element.style.gap = `${PLAYER_NAME_GAP * domScale}px`;
        this.element.style.padding = `0 ${PLAYER_NAME_PADDING * domScale}px`;
        this.element.style.borderRadius = `${PLAYER_NAME_BACKGROUND_RADIUS * domScale}px`;
        this.applyTransform();
    }

    private updateUsernameBackgroundColor(color: number | undefined): void {
        this.element.style.background =
            color === undefined ? PLAYER_NAME_BACKGROUND_COLOR : `#${color.toString(16).padStart(6, "0")}`;
    }

    public setTalking(talking: boolean, isSpeaker: boolean): void {
        if (talking) {
            this.element.classList.add(isSpeaker ? "speaker" : "talking");
        } else {
            this.element.classList.remove("talking");
            this.element.classList.remove("speaker");
        }
    }
}
