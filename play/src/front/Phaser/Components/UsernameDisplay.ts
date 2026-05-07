import { AvailabilityStatus } from "@workadventure/messages";
import type { Subscription } from "rxjs";
import { DEPTH_INGAME_TEXT_INDEX } from "../Game/DepthIndexes";
import type { GameScene } from "../Game/GameScene";
import { waScaleManager, WaScaleManagerEvent } from "../Services/WaScaleManager";
import { MegaphoneIcon } from "./MegaphoneIcon";
import { PlayerStatusDot } from "./PlayerStatusDot";

const CORRECTION_RATE = 0.75;
/** Design system `brand-blue` — fond du pseudo (tous les joueurs), léger alpha pour laisser voir le décor. */
const PLAYER_NAME_BACKGROUND_COLOR = "rgba(27, 42, 65, 0.5)";
const PLAYER_NAME_BACKGROUND_RADIUS = 8;
const PLAYER_NAME_HEIGHT = 16;
const PLAYER_NAME_PADDING = 6;
const PLAYER_NAME_GAP = 4;
const USERNAME_FONT_SIZE = 8;
const USERNAME_FONT = `${USERNAME_FONT_SIZE}px "Press Start 2P"`; // Todo: Replace the font family with a better one

type Position = { x: number; y: number };

type PlayerNameLayout = {
    textureWidth: number;
    textureHeight: number;
    textureLeft: number;
    spriteX: number;
    textTextureX: number;
    textLocalX: number;
    statusDotX: number;
    megaphoneX: number;
};

export class UsernameDisplay extends Phaser.GameObjects.Container {
    private static nextPlayerNameTextureId = 0;
    private static nextDomUsernameId = 0;
    private readonly domUsernameId = UsernameDisplay.nextDomUsernameId++;
    private readonly playerNameSprite: Phaser.GameObjects.Sprite;
    private readonly playerName: string;
    private playerNameTextureKey: string;
    private playerNameOutlineColor: number | undefined;
    private megaphoneShown = false;
    private renderingAsDOM = false;
    private readonly renderingModeSubscription: Subscription;
    private displayScale: number;
    private readonly statusDot: PlayerStatusDot;
    private readonly megaphoneIcon: MegaphoneIcon;
    private readonly onZoomChanged = (zoomModifier: number): void => {
        this.displayScale = this.getDisplayScale(zoomModifier);
        this.setScale(this.displayScale);
        if (this.renderingAsDOM) {
            const textPosition = this.getDomTextPosition();
            this.gameScene.usernameDomLayer.updateUsernameScale(this.domUsernameId, this.displayScale);
            this.gameScene.usernameDomLayer.updateUsernamePosition(this.domUsernameId, textPosition.x, textPosition.y);
        }
    };

    constructor(scene: GameScene, x: number, y: number, playerName: string, outlineColor: number | undefined) {
        super(scene, x, y);
        this.playerName = playerName;
        this.setDepth(DEPTH_INGAME_TEXT_INDEX);
        this.displayScale = this.getDisplayScale(waScaleManager.zoomModifier);

        this.playerNameOutlineColor = outlineColor;
        this.statusDot = new PlayerStatusDot(scene, 0, -1);
        this.megaphoneIcon = new MegaphoneIcon(scene, 0, -1);
        this.playerNameTextureKey = this.createPlayerNameTexture(outlineColor, this.renderingAsDOM);

        this.playerNameSprite = new Phaser.GameObjects.Sprite(scene, 0, 0, this.playerNameTextureKey)
            .setOrigin(0.5, 1)
            .setDepth(DEPTH_INGAME_TEXT_INDEX);

        this.megaphoneIcon.visible = false;

        this.add([this.playerNameSprite, this.statusDot, this.megaphoneIcon]);
        this.reflow();

        this.scene.add.existing(this);
        this.setScale(this.displayScale);
        this.scene.game.events.on(WaScaleManagerEvent.ZoomChanged, this.onZoomChanged);
        this.renderingModeSubscription = scene.usernameRenderingAsDOM$.subscribe((renderingAsDOM) => {
            this.setRenderingAsDOM(renderingAsDOM);
        });
    }

    private getDisplayScale(zoomModifier: number): number {
        return Math.max(zoomModifier > 0 ? CORRECTION_RATE / zoomModifier : 1, 1);
    }

    private reflow(): void {
        const layout = this.getPlayerNameLayout();
        const halfPlayerNameHeight = -layout.textureHeight / 2;
        this.playerNameSprite.setX(layout.spriteX);
        this.statusDot.setPosition(layout.statusDotX, halfPlayerNameHeight);
        this.megaphoneIcon.setPosition(layout.megaphoneX, halfPlayerNameHeight);
    }

    private getPlayerNameLayout(): PlayerNameLayout {
        const textWidth = this.measurePlayerNameWidth();
        const statusWidth = this.statusDot.getDefaultDisplayWidth();
        const megaphoneWidth = this.megaphoneIcon.getDefaultDisplayWidth();

        const baseContentWidth = statusWidth + PLAYER_NAME_GAP + textWidth;
        const baseWidth = PLAYER_NAME_PADDING * 2 + baseContentWidth;
        const textureLeft = -baseWidth / 2;
        let cursor = textureLeft + PLAYER_NAME_PADDING;
        const statusDotX = cursor + statusWidth / 2;

        cursor += statusWidth + PLAYER_NAME_GAP;
        const textLocalX = cursor + textWidth / 2;

        cursor += textWidth;
        const megaphoneX = cursor + PLAYER_NAME_GAP + megaphoneWidth / 2;
        if (this.megaphoneShown) {
            cursor += PLAYER_NAME_GAP + megaphoneWidth;
        }

        const textureRight = cursor + PLAYER_NAME_PADDING;
        const textureWidth = Math.max(1, Math.ceil(textureRight - textureLeft));

        return {
            textureWidth,
            textureHeight: PLAYER_NAME_HEIGHT,
            textureLeft,
            spriteX: textureLeft + textureWidth / 2,
            textTextureX: textLocalX - textureLeft,
            textLocalX,
            statusDotX,
            megaphoneX,
        };
    }

    private measurePlayerNameWidth(): number {
        const measurementCanvas = document.createElement("canvas");
        const measurementContext = measurementCanvas.getContext("2d");
        if (!measurementContext) {
            throw new Error("Could not create canvas context for player name texture");
        }
        measurementContext.font = USERNAME_FONT;
        return measurementContext.measureText(this.playerName).width;
    }

    private createPlayerNameTexture(outlineColor: number | undefined, renderingAsDOM: boolean): string {
        const textureKey = `player-name-${UsernameDisplay.nextPlayerNameTextureId++}`;
        const dynamicOutlineColor =
            outlineColor === undefined ? undefined : `#${outlineColor.toString(16).padStart(6, "0")}`;
        const layout = this.getPlayerNameLayout();

        const texture = this.scene.textures.createCanvas(textureKey, layout.textureWidth, layout.textureHeight);
        if (!texture) {
            throw new Error("Could not create texture for player name");
        }

        const context = texture.getContext();
        context.clearRect(0, 0, layout.textureWidth, layout.textureHeight);
        context.font = USERNAME_FONT;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.lineJoin = "round";
        context.fillStyle = dynamicOutlineColor ?? PLAYER_NAME_BACKGROUND_COLOR;
        context.beginPath();
        const roundRect = (
            context as CanvasRenderingContext2D & {
                roundRect?: (x: number, y: number, w: number, h: number, radii?: number | number[]) => void;
            }
        ).roundRect;
        if (roundRect) {
            roundRect.call(context, 0, 0, layout.textureWidth, layout.textureHeight, PLAYER_NAME_BACKGROUND_RADIUS);
        } else {
            context.rect(0, 0, layout.textureWidth, layout.textureHeight);
        }
        context.fill();

        if (!renderingAsDOM) {
            context.fillStyle = "#ffffff";
            context.fillText(this.playerName, layout.textTextureX, layout.textureHeight / 2);
        }
        texture.refresh();

        return textureKey;
    }

    private setRenderingAsDOM(renderingAsDOM: boolean): void {
        if (this.renderingAsDOM === renderingAsDOM) {
            return;
        }

        this.renderingAsDOM = renderingAsDOM;

        this.refreshPlayerNameTexture();

        if (renderingAsDOM) {
            const textPosition = this.getDomTextPosition();
            this.gameScene.usernameDomLayer.addUsername(
                this.domUsernameId,
                this.playerName,
                textPosition.x,
                textPosition.y,
                USERNAME_FONT_SIZE,
                this.displayScale
            );
        } else {
            this.gameScene.usernameDomLayer.removeUsername(this.domUsernameId);
        }
    }

    private showMegaphone(show = true, forceClose = false): void {
        if (this.megaphoneShown !== show) {
            this.megaphoneShown = show;
            this.refreshPlayerNameTexture();
        }
        this.megaphoneIcon.visible = show;
        this.megaphoneIcon.show(show, forceClose);
        this.reflow();
    }

    public setPlayerNameOutlineColor(outlineColor: number | undefined): void {
        if (this.playerNameOutlineColor === outlineColor) {
            return;
        }
        this.playerNameOutlineColor = outlineColor;

        this.refreshPlayerNameTexture();
    }

    private refreshPlayerNameTexture(): void {
        const nextTextureKey = this.createPlayerNameTexture(this.playerNameOutlineColor, this.renderingAsDOM);
        const previousTextureKey = this.playerNameTextureKey;
        this.playerNameTextureKey = nextTextureKey;
        this.playerNameSprite.setTexture(nextTextureKey);

        if (previousTextureKey && this.scene.textures.exists(previousTextureKey)) {
            this.scene.textures.remove(previousTextureKey);
        }
        this.reflow();
        this.updateDomTextPosition();
    }

    public setAvailabilityStatus(availabilityStatus: AvailabilityStatus, instant = false, forceClose = false): void {
        this.statusDot.setAvailabilityStatus(availabilityStatus, instant);
        this.showMegaphone(availabilityStatus === AvailabilityStatus.SPEAKER, forceClose);
    }

    public getAvailabilityStatus(): AvailabilityStatus {
        return this.statusDot.availabilityStatus;
    }

    public override setPosition(x?: number, y?: number, z?: number, w?: number): this {
        super.setPosition(x, y, z, w);
        if (this.renderingAsDOM) {
            const textPosition = this.getDomTextPosition();
            this.gameScene.usernameDomLayer.updateUsernamePosition(this.domUsernameId, textPosition.x, textPosition.y);
        }
        return this;
    }

    public override destroy(fromScene?: boolean): void {
        this.renderingModeSubscription.unsubscribe();
        this.gameScene.usernameDomLayer.removeUsername(this.domUsernameId);
        this.scene.game.events.off(WaScaleManagerEvent.ZoomChanged, this.onZoomChanged);
        if (this.playerNameTextureKey && this.scene.textures.exists(this.playerNameTextureKey)) {
            this.scene.textures.remove(this.playerNameTextureKey);
        }
        super.destroy(fromScene);
    }

    private get gameScene(): GameScene {
        return this.scene as GameScene;
    }

    private updateDomTextPosition(): void {
        if (!this.renderingAsDOM) {
            return;
        }
        const textPosition = this.getDomTextPosition();
        this.gameScene.usernameDomLayer.updateUsernamePosition(this.domUsernameId, textPosition.x, textPosition.y);
    }

    private getDomTextPosition(): Position {
        const layout = this.getPlayerNameLayout();
        return {
            x: this.x + layout.textLocalX * this.displayScale,
            y: this.y - (this.playerNameSprite.height / 2) * this.displayScale,
        };
    }
}
