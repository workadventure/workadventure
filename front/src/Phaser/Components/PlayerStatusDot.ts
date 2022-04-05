export class PlayerStatusDot extends Phaser.GameObjects.Container {
    private graphics: Phaser.GameObjects.Graphics;

    private away: boolean;

    private readonly COLORS = {
        online: 0x00ff00,
        away: 0xffff00,
    };

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y);

        this.away = false;

        this.graphics = this.scene.add.graphics();
        this.add(this.graphics);
        this.redraw();

        this.scene.add.existing(this);
    }

    public setAway(away: boolean = true): void {
        if (this.away === away) {
            return;
        }
        this.away = away;
        this.redraw();
    }

    private redraw(): void {
        this.graphics.clear();
        this.graphics.fillStyle(this.away ? this.COLORS.away : this.COLORS.online);
        this.graphics.fillCircle(0, 0, 4);
    }
}
