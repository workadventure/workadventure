import { AvailabilityStatus } from "@workadventure/messages";
import { StringUtils } from "../../Utils/StringUtils";
import { DEPTH_INGAME_TEXT_INDEX } from "../Game/DepthIndexes";
import { waScaleManager, WaScaleManagerEvent } from "../Services/WaScaleManager";
import { MegaphoneIcon } from "./MegaphoneIcon";
import { PlayerStatusDot } from "./PlayerStatusDot";

const DEFAULT_PLAYER_NAME_OUTLINE_COLOR = "#14304C";
const CORRECTION_RATE = 0.75;

export class UsernameDisplay extends Phaser.GameObjects.Container {
    private static nextPlayerNameTextureId = 0;
    private readonly playerNameSprite: Phaser.GameObjects.Sprite;
    private readonly playerName: string;
    private readonly playerNameFontSize: number;
    private playerNameTextureKey: string;
    private playerNameOutlineColor: number | undefined;
    private readonly statusDot: PlayerStatusDot;
    private readonly megaphoneIcon: MegaphoneIcon;
    private readonly onZoomChanged = (zoomModifier: number): void => {
        this.setScale(this.getDisplayScale(zoomModifier));
    };

    constructor(scene: Phaser.Scene, x: number, y: number, playerName: string, outlineColor: number | undefined) {
        super(scene, x, y);
        this.playerName = playerName;
        this.setDepth(DEPTH_INGAME_TEXT_INDEX);

        // Todo: Replace the font family with a better one
        // Use larger font size for non-Latin characters (Arabic, CJK, etc.) for better readability
        this.playerNameFontSize = StringUtils.containsNonLatinCharacters(playerName) ? 11 : 8;
        this.playerNameOutlineColor = outlineColor;
        this.playerNameTextureKey = this.createPlayerNameTexture(outlineColor);

        this.playerNameSprite = new Phaser.GameObjects.Sprite(scene, 0, 0, this.playerNameTextureKey)
            .setOrigin(0.5, 1)
            .setDepth(DEPTH_INGAME_TEXT_INDEX);
        this.statusDot = new PlayerStatusDot(scene, 0, -1);
        this.megaphoneIcon = new MegaphoneIcon(scene, 0, -1);

        this.megaphoneIcon.visible = false;

        this.add([this.playerNameSprite, this.statusDot, this.megaphoneIcon]);
        this.reflow();

        this.scene.add.existing(this);
        this.onZoomChanged(waScaleManager.zoomModifier);
        this.scene.game.events.on(WaScaleManagerEvent.ZoomChanged, this.onZoomChanged);
    }

    private getDisplayScale(zoomModifier: number): number {
        return Math.max(zoomModifier > 0 ? CORRECTION_RATE / zoomModifier : 1, 1);
    }

    private reflow(): void {
        const halfPlayerNameHeight = -this.playerNameSprite.displayHeight / 2;
        const halfPlayerNameWidth = this.playerNameSprite.displayWidth / 2;
        this.statusDot.setPosition(-halfPlayerNameWidth - 2, halfPlayerNameHeight);
        this.megaphoneIcon.setPosition(halfPlayerNameWidth + 2, halfPlayerNameHeight);
    }

    private createPlayerNameTexture(outlineColor: number | undefined): string {
        const textureKey = `player-name-${UsernameDisplay.nextPlayerNameTextureId++}`;
        const dynamicOutlineColor =
            outlineColor === undefined ? undefined : `#${outlineColor.toString(16).padStart(6, "0")}`;
        const strokeThickness = 2;
        const outlineThickness = 2;

        const measurementCanvas = document.createElement("canvas");
        const measurementContext = measurementCanvas.getContext("2d");
        if (!measurementContext) {
            throw new Error("Could not create canvas context for player name texture");
        }
        measurementContext.font = `${this.playerNameFontSize}px "Press Start 2P"`;
        const measuredWidth = measurementContext.measureText(this.playerName).width;
        const fullOutlineThickness = strokeThickness + outlineThickness * 2;
        const textureWidth = Math.max(1, Math.ceil(measuredWidth + fullOutlineThickness * 2));
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

        if (dynamicOutlineColor) {
            context.lineWidth = fullOutlineThickness;
            context.strokeStyle = dynamicOutlineColor;
            context.strokeText(this.playerName, textureWidth / 2, textureHeight / 2);
        }

        context.lineWidth = strokeThickness;
        context.strokeStyle = DEFAULT_PLAYER_NAME_OUTLINE_COLOR;
        context.fillStyle = "#ffffff";
        context.strokeText(this.playerName, textureWidth / 2, textureHeight / 2);
        context.fillText(this.playerName, textureWidth / 2, textureHeight / 2);
        texture.refresh();

        return textureKey;
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

        const nextTextureKey = this.createPlayerNameTexture(outlineColor);
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

    public override destroy(fromScene?: boolean): void {
        this.scene.game.events.off(WaScaleManagerEvent.ZoomChanged, this.onZoomChanged);
        if (this.playerNameTextureKey && this.scene.textures.exists(this.playerNameTextureKey)) {
            this.scene.textures.remove(this.playerNameTextureKey);
        }
        super.destroy(fromScene);
    }
}
