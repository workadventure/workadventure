import type { AvailabilityStatus } from "@workadventure/messages";
import { DEPTH_INGAME_TEXT_INDEX } from "../Game/DepthIndexes";
import { MegaphoneIcon } from "./MegaphoneIcon";
import { PlayerStatusDot } from "./PlayerStatusDot";

export class UsernameDisplay extends Phaser.GameObjects.Container {
    private readonly playerNameSprite: Phaser.GameObjects.Sprite;
    private readonly statusDot: PlayerStatusDot;
    private readonly megaphoneIcon: MegaphoneIcon;

    constructor(scene: Phaser.Scene, x: number, y: number, playerNameTextureKey: string) {
        super(scene, x, y);

        this.playerNameSprite = new Phaser.GameObjects.Sprite(scene, 0, 0, playerNameTextureKey)
            .setOrigin(0.5, 1)
            .setDepth(DEPTH_INGAME_TEXT_INDEX);
        this.statusDot = new PlayerStatusDot(scene, 0, -1);
        this.megaphoneIcon = new MegaphoneIcon(scene, 0, -1);

        this.megaphoneIcon.visible = false;

        this.add([this.playerNameSprite, this.statusDot, this.megaphoneIcon]);
        this.reflow();

        this.scene.add.existing(this);
    }

    public setPlayerNameTexture(playerNameTextureKey: string): void {
        this.playerNameSprite.setTexture(playerNameTextureKey);
        this.reflow();
    }

    public setAvailabilityStatus(availabilityStatus: AvailabilityStatus, instant = false): void {
        this.statusDot.setAvailabilityStatus(availabilityStatus, instant);
    }

    public getAvailabilityStatus(): AvailabilityStatus {
        return this.statusDot.availabilityStatus;
    }

    public showMegaphone(show = true, forceClose = false): void {
        this.megaphoneIcon.visible = show;
        this.megaphoneIcon.show(show, forceClose);
        this.reflow();
    }

    private reflow(): void {
        const halfPlayerNameHeight = -this.playerNameSprite.displayHeight / 2;
        const halfPlayerNameWidth = this.playerNameSprite.displayWidth / 2;
        this.statusDot.setPosition(-halfPlayerNameWidth - 2, halfPlayerNameHeight);
        this.megaphoneIcon.setPosition(halfPlayerNameWidth + 2, halfPlayerNameHeight);
    }
}
