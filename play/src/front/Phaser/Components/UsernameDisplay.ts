import { AvailabilityStatus } from "@workadventure/messages";
import type { Subscription } from "rxjs";
import { StringUtils } from "../../Utils/StringUtils";
import { DEPTH_INGAME_TEXT_INDEX } from "../Game/DepthIndexes";
import type { GameScene } from "../Game/GameScene";
import { waScaleManager, WaScaleManagerEvent } from "../Services/WaScaleManager";
import { MegaphoneIcon } from "./MegaphoneIcon";
import { PlayerStatusDot } from "./PlayerStatusDot";

const CORRECTION_RATE = 0.75;
/** Design system `brand-blue` — fond du pseudo (tous les joueurs), léger alpha pour laisser voir le décor. */
const PLAYER_NAME_BACKGROUND_COLOR = "rgba(27, 42, 65, 0.5)";
const PLAYER_NAME_BACKGROUND_RADIUS = 8;
const PLAYER_NAME_TEXT_OFFSET_X = 6;

export class UsernameDisplay extends Phaser.GameObjects.Container {
    private static nextPlayerNameTextureId = 0;
    private static nextDomUsernameId = 0;
    private readonly domUsernameId = UsernameDisplay.nextDomUsernameId++;
    private readonly playerNameSprite: Phaser.GameObjects.Sprite;
    private readonly playerName: string;
    private readonly playerNameFontSize: number;
    private playerNameTextureKey: string;
    private playerNameOutlineColor: number | undefined;
    private renderingAsDOM = false;
    private readonly renderingModeSubscription: Subscription;
    private displayScale: number;
    private readonly statusDot: PlayerStatusDot;
    private readonly megaphoneIcon: MegaphoneIcon;
    private readonly onZoomChanged = (zoomModifier: number): void => {
        this.displayScale = this.getDisplayScale(zoomModifier);
        this.setScale(this.displayScale);
        if (this.renderingAsDOM) {
            this.gameScene.usernameDomLayer.updateUsernameScale(this.domUsernameId, this.displayScale);
        }
    };

    constructor(scene: GameScene, x: number, y: number, playerName: string, outlineColor: number | undefined) {
        super(scene, x, y);
        this.playerName = playerName;
        this.setDepth(DEPTH_INGAME_TEXT_INDEX);
        this.displayScale = this.getDisplayScale(waScaleManager.zoomModifier);

        // Todo: Replace the font family with a better one
        // Use larger font size for non-Latin characters (Arabic, CJK, etc.) for better readability
        this.playerNameFontSize = StringUtils.containsNonLatinCharacters(playerName) ? 11 : 8;
        this.playerNameOutlineColor = outlineColor;
        this.playerNameTextureKey = this.createPlayerNameTexture(outlineColor, this.renderingAsDOM);

        this.playerNameSprite = new Phaser.GameObjects.Sprite(scene, 0, 0, this.playerNameTextureKey)
            .setOrigin(0.5, 1)
            .setDepth(DEPTH_INGAME_TEXT_INDEX);
        this.statusDot = new PlayerStatusDot(scene, 0, -1);
        this.megaphoneIcon = new MegaphoneIcon(scene, 0, -1);

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
        const halfPlayerNameHeight = -this.playerNameSprite.displayHeight / 2;
        const halfPlayerNameWidth = this.playerNameSprite.displayWidth / 2;
        this.statusDot.setPosition(-halfPlayerNameWidth + 10, halfPlayerNameHeight);
        this.megaphoneIcon.setPosition(halfPlayerNameWidth + 2, halfPlayerNameHeight);
    }

    private createPlayerNameTexture(outlineColor: number | undefined, renderingAsDOM: boolean): string {
        const textureKey = `player-name-${UsernameDisplay.nextPlayerNameTextureId++}`;
        const dynamicOutlineColor =
            outlineColor === undefined ? undefined : `#${outlineColor.toString(16).padStart(6, "0")}`;
        const strokeThickness = 1;
        const outlineThickness = 1;

        const measurementCanvas = document.createElement("canvas");
        const measurementContext = measurementCanvas.getContext("2d");
        if (!measurementContext) {
            throw new Error("Could not create canvas context for player name texture");
        }
        measurementContext.font = `${this.playerNameFontSize}px "Press Start 2P"`;
        const measuredWidth = measurementContext.measureText(this.playerName).width;
        const fullOutlineThickness = strokeThickness + outlineThickness * 2;
        const textureWidth = Math.max(1, Math.ceil(measuredWidth + fullOutlineThickness * 8));
        const textureHeight = Math.max(1, Math.ceil(this.playerNameFontSize + fullOutlineThickness * 2));

        const texture = this.scene.textures.createCanvas(textureKey, textureWidth, textureHeight);
        if (!texture) {
            throw new Error("Could not create texture for player name");
        }

        const context = texture.getContext();
        context.clearRect(0, 0, textureWidth, textureHeight);
        context.font = `${this.playerNameFontSize}px "Press Start 2P"`;
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
            roundRect.call(context, 0, 0, textureWidth, textureHeight, PLAYER_NAME_BACKGROUND_RADIUS);
        } else {
            context.rect(0, 0, textureWidth, textureHeight);
        }
        context.fill();

        if (!renderingAsDOM) {
            context.fillStyle = "#ffffff";
            context.fillText(this.playerName, textureWidth / 2 + 6, textureHeight / 2);
        }
        texture.refresh();

        return textureKey;
    }

    private setRenderingAsDOM(renderingAsDOM: boolean): void {
        if (this.renderingAsDOM === renderingAsDOM) {
            return;
        }

        this.renderingAsDOM = renderingAsDOM;

        const nextTextureKey = this.createPlayerNameTexture(this.playerNameOutlineColor, renderingAsDOM);
        const previousTextureKey = this.playerNameTextureKey;
        this.playerNameTextureKey = nextTextureKey;
        this.playerNameSprite.setTexture(nextTextureKey);

        if (previousTextureKey && this.scene.textures.exists(previousTextureKey)) {
            this.scene.textures.remove(previousTextureKey);
        }

        if (renderingAsDOM) {
            this.gameScene.usernameDomLayer.addUsername(
                this.domUsernameId,
                this.playerName,
                this.x + PLAYER_NAME_TEXT_OFFSET_X,
                this.y - this.playerNameSprite.displayHeight / 2,
                this.playerNameFontSize,
                this.displayScale
            );
        } else {
            this.gameScene.usernameDomLayer.removeUsername(this.domUsernameId);
        }

        this.reflow();
    }

    private showMegaphone(show = true, forceClose = false): void {
        this.megaphoneIcon.visible = show;
        this.megaphoneIcon.show(show, forceClose);
        this.reflow();
    }

    public setPlayerNameOutlineColor(outlineColor: number | undefined): void {
        if (this.playerNameOutlineColor === outlineColor) {
            return;
        }
        this.playerNameOutlineColor = outlineColor;

        const nextTextureKey = this.createPlayerNameTexture(outlineColor, this.renderingAsDOM);
        const previousTextureKey = this.playerNameTextureKey;
        this.playerNameTextureKey = nextTextureKey;
        this.playerNameSprite.setTexture(nextTextureKey);

        if (previousTextureKey && this.scene.textures.exists(previousTextureKey)) {
            this.scene.textures.remove(previousTextureKey);
        }
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
            this.gameScene.usernameDomLayer.updateUsernamePosition(
                this.domUsernameId,
                this.x + PLAYER_NAME_TEXT_OFFSET_X,
                this.y - this.playerNameSprite.displayHeight / 2
            );
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
}
