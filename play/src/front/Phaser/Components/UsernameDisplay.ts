import { AvailabilityStatus } from "@workadventure/messages";
import { DEPTH_INGAME_TEXT_INDEX } from "../Game/DepthIndexes";
import type { GameScene } from "../Game/GameScene";
import { waScaleManager, WaScaleManagerEvent } from "../Services/WaScaleManager";
import { UsernameMegaphoneDisplay } from "./UsernameMegaphoneDisplay";
import { UsernameStatusDisplay } from "./UsernameStatusDisplay";

const CORRECTION_RATE = 0.75;
const PLAYER_NAME_HEIGHT = 14;
const USERNAME_FONT_FAMILY = '"Press Start 2P"'; // Todo: Replace the font family with a better one
const USERNAME_FONT_SIZE = 8;
const USERNAME_SIZE_ANIMATION_DURATION = 375;
const USERNAME_SIZE_ANIMATION_EASING = "cubic-bezier(0.2, 0, 0, 1)";

type Position = { x: number; y: number };

export class UsernameDisplay extends Phaser.GameObjects.Container {
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
        this.setScale(this.displayScale);
        const textPosition = this.getDomPosition();
        this.gameScene.usernameDomLayer.updateUsernameScale(this.domUsernameId, this.displayScale, zoomModifier);
        this.gameScene.usernameDomLayer.updateUsernamePosition(this.domUsernameId, textPosition.x, textPosition.y);
    };

    constructor(scene: GameScene, x: number, y: number, playerName: string, outlineColor: number | undefined) {
        super(scene, x, y);
        this.playerName = playerName;
        this.setDepth(DEPTH_INGAME_TEXT_INDEX);
        this.displayScale = this.getDisplayScale(waScaleManager.zoomModifier);

        this.playerNameOutlineColor = outlineColor;
        this.statusDisplay = new UsernameStatusDisplay();
        this.megaphoneDisplay = new UsernameMegaphoneDisplay();
        this.playerNameElement = this.createPlayerNameElement();

        const textPosition = this.getDomPosition();
        this.element = this.gameScene.usernameDomLayer.addUsername(
            this.domUsernameId,
            textPosition.x,
            textPosition.y,
            this.depth,
            this.displayScale,
            waScaleManager.zoomModifier
        );
        this.element.append(this.statusDisplay.element, this.playerNameElement, this.megaphoneDisplay.element);
        this.gameScene.usernameDomLayer.updateUsernameBackgroundColor(this.domUsernameId, outlineColor);

        this.scene.add.existing(this);
        this.setScale(this.displayScale);
        this.scene.game.events.on(WaScaleManagerEvent.ZoomChanged, this.onZoomChanged);
    }

    private getDisplayScale(zoomModifier: number): number {
        return Math.max(zoomModifier > 0 ? CORRECTION_RATE / zoomModifier : 1, 1);
    }

    private showMegaphone(show = true, forceClose = false): void {
        this.animateSizeChange(() => {
            this.megaphoneDisplay.show(show, forceClose);
        }, show);
    }

    public setPlayerNameOutlineColor(outlineColor: number | undefined): void {
        if (this.playerNameOutlineColor === outlineColor) {
            return;
        }
        this.playerNameOutlineColor = outlineColor;

        this.gameScene.usernameDomLayer.updateUsernameBackgroundColor(this.domUsernameId, outlineColor);
    }

    public setAvailabilityStatus(availabilityStatus: AvailabilityStatus, instant = false, forceClose = false): void {
        this.statusDisplay.setAvailabilityStatus(availabilityStatus, instant);
        this.showMegaphone(availabilityStatus === AvailabilityStatus.SPEAKER, forceClose);
    }

    public getAvailabilityStatus(): AvailabilityStatus {
        return this.statusDisplay.availabilityStatus;
    }

    public setPlayerDepth(depth: number): void {
        this.gameScene.usernameDomLayer.updateUsernameDepth(this.domUsernameId, depth);
    }

    public override setPosition(x?: number, y?: number, z?: number, w?: number): this {
        if (x === this.x && y === this.y) {
            return this;
        }

        super.setPosition(x, y, z, w);
        this.updateDomPosition();
        return this;
    }

    public override destroy(fromScene?: boolean): void {
        this.stopSizeAnimation();
        this.gameScene.usernameDomLayer.removeUsername(this.domUsernameId);
        this.statusDisplay.destroy();
        this.megaphoneDisplay.destroy();
        this.scene.game.events.off(WaScaleManagerEvent.ZoomChanged, this.onZoomChanged);
        super.destroy(fromScene);
    }

    private get gameScene(): GameScene {
        return this.scene as GameScene;
    }

    private updateDomPosition(): void {
        this.scene.events.once(Phaser.Scenes.Events.RENDER, () => {
            const textPosition = this.getDomPosition();
            this.gameScene?.usernameDomLayer.updateUsernamePosition(this.domUsernameId, textPosition.x, textPosition.y);
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
        element.style.color = "#ffffff";
        element.style.fontFamily = USERNAME_FONT_FAMILY;
        element.style.fontSize = `calc(${USERNAME_FONT_SIZE}px * var(--username-dom-scale, 1))`;
        element.style.whiteSpace = "nowrap";
        element.style.pointerEvents = "none";

        return element;
    }
}
