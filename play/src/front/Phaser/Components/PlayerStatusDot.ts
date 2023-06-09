import { AvailabilityStatus } from "@workadventure/messages";
import { Easing } from "../../types";

export class PlayerStatusDot extends Phaser.GameObjects.Container {
    private statusImage: Phaser.GameObjects.Image;
    private statusImageOutline: Phaser.GameObjects.Image;

    private _availabilityStatus: AvailabilityStatus;

    private animationTween?: Phaser.Tweens.Tween;

    private readonly COLORS: Record<AvailabilityStatus, { filling: number; outline: number }> = {
        [AvailabilityStatus.AWAY]: { filling: 0xf5931e, outline: 0x875d13 },
        [AvailabilityStatus.ONLINE]: { filling: 0x8cc43f, outline: 0x427a25 },
        [AvailabilityStatus.SPEAKER]: { filling: 0x8cc43f, outline: 0x427a25 },
        [AvailabilityStatus.SILENT]: { filling: 0xe74c3c, outline: 0xc0392b },
        [AvailabilityStatus.JITSI]: { filling: 0x8cc43f, outline: 0x427a25 },
        [AvailabilityStatus.BBB]: { filling: 0x8cc43f, outline: 0x427a25 },
        [AvailabilityStatus.DENY_PROXIMITY_MEETING]: { filling: 0xffffff, outline: 0x404040 },
        [AvailabilityStatus.UNRECOGNIZED]: { filling: 0xffffff, outline: 0xffffff },
        [AvailabilityStatus.UNCHANGED]: { filling: 0xffffff, outline: 0xffffff },
    };

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y);

        this._availabilityStatus = AvailabilityStatus.ONLINE;

        this.statusImage = this.scene.add.image(0, 0, "iconStatusIndicatorInside");
        this.statusImageOutline = this.scene.add.image(0, 0, "iconStatusIndicatorOutline");

        this.add([this.statusImage, this.statusImageOutline]);

        this.redraw();

        this.scene.add.existing(this);
    }

    public setAvailabilityStatus(availabilityStatus: AvailabilityStatus, instant = false): void {
        if (this._availabilityStatus === availabilityStatus || availabilityStatus === AvailabilityStatus.UNCHANGED) {
            return;
        }
        this._availabilityStatus = availabilityStatus;
        if (instant) {
            this.redraw();
        } else {
            this.playStatusChangeAnimation();
        }
    }

    private playStatusChangeAnimation(): void {
        if (!this.scene) {
            this.redraw();
            return;
        }
        this.scale = 1;
        this.animationTween?.stop();
        this.animationTween = this.scene.tweens.add({
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
        const colors = this.COLORS[this._availabilityStatus];
        this.statusImage.setTintFill(colors.filling);
        this.statusImageOutline.setTintFill(colors.outline);
    }

    get availabilityStatus(): AvailabilityStatus {
        return this._availabilityStatus;
    }
}
