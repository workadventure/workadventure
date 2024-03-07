import { AvailabilityStatus } from "@workadventure/messages";
import { Easing } from "../../types";
import { getColorOfStatus } from "../../Utils/AvailabilityStatus";

export class PlayerStatusDot extends Phaser.GameObjects.Container {
    private statusImage: Phaser.GameObjects.Image;
    private statusImageOutline: Phaser.GameObjects.Image;

    private _availabilityStatus: AvailabilityStatus;

    private animationTween?: Phaser.Tweens.Tween;

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
        const colors = getColorOfStatus(this._availabilityStatus);
        this.statusImage.setTintFill(colors.filling);
        this.statusImageOutline.setTintFill(colors.outline);
    }

    get availabilityStatus(): AvailabilityStatus {
        return this._availabilityStatus;
    }
}
