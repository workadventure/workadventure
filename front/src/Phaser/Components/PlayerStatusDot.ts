import { Easing } from "../../types";

export class PlayerStatusDot extends Phaser.GameObjects.Container {
    private graphics: Phaser.GameObjects.Graphics;

    private away: boolean;

    private readonly COLORS = {
        // online: 0x00ff00,
        // away: 0xffff00,
        online: 0x8cc43f,
        onlineOutline: 0x427a25,
        away: 0xf5931e,
        awayOutline: 0x875d13,
    };

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y);

        this.away = false;

        this.graphics = this.scene.add.graphics();
        this.add(this.graphics);
        this.redraw();

        this.scene.add.existing(this);
    }

    public setAway(away: boolean = true, instant: boolean = false): void {
        if (this.away === away) {
            return;
        }
        this.away = away;
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
        this.graphics.clear();
        this.graphics.fillStyle(this.away ? this.COLORS.away : this.COLORS.online);
        this.graphics.lineStyle(1, this.away ? this.COLORS.awayOutline : this.COLORS.onlineOutline);
        this.graphics.fillCircle(0, 0, 4);
        this.graphics.strokeCircle(0, 0, 4);
    }
}
