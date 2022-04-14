import { AvailabilityStatus } from "../../Messages/ts-proto-generated/protos/messages";
import { Easing } from "../../types";

export class PlayerStatusDot extends Phaser.GameObjects.Container {
    private statusImage: Phaser.GameObjects.Image;
    private statusImageOutline: Phaser.GameObjects.Image;

    private status: AvailabilityStatus;

    private readonly COLORS = {
        online: 0x8cc43f,
        onlineOutline: 0x427a25,
        away: 0xf5931e,
        awayOutline: 0x875d13,
        silenced: 0xe74c3c,
        silencedOutline: 0xc0392b,
        never: 0xff00ff,
    };

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y);

        this.status = AvailabilityStatus.ONLINE;

        this.statusImage = this.scene.add.image(0, 0, "iconStatusIndicatorInside");
        this.statusImageOutline = this.scene.add.image(0, 0, "iconStatusIndicatorOutline");

        this.add([this.statusImage, this.statusImageOutline]);

        this.redraw();

        this.scene.add.existing(this);
    }

    public setStatus(status: AvailabilityStatus, instant: boolean = false): void {
        if (this.status === status) {
            return;
        }
        this.status = status;
        if (instant) {
            this.redraw();
        } else {
            this.playStatusChangeAnimation();
        }
    }

    private playStatusChangeAnimation(): void {
        this.scale = 1;
        this.scene.tweens.add({
            targets: [this],
            duration: 200,
            yoyo: true,
            ease: Easing.BackEaseIn,
            scale: 0,
            onYoyo: () => {
                this.redraw();
            },
            onComplete: () => {
                this.scale = 1;
            },
        });
    }

    private redraw(): void {
        const colors = this.getColors();
        this.statusImage.setTintFill(colors.filling);
        this.statusImageOutline.setTintFill(colors.outline);
    }

    private getColors(): { filling: number; outline: number } {
        switch (this.status) {
            case AvailabilityStatus.ONLINE:
                return { filling: this.COLORS.online, outline: this.COLORS.onlineOutline };
            case AvailabilityStatus.AWAY:
                return { filling: this.COLORS.away, outline: this.COLORS.awayOutline };
            case AvailabilityStatus.SILENT:
                return { filling: this.COLORS.silenced, outline: this.COLORS.silencedOutline };
            default:
                return { filling: this.COLORS.never, outline: this.COLORS.never };
        }
    }
}
