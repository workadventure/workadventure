export class TextField extends Phaser.GameObjects.BitmapText {
    constructor(scene: Phaser.Scene, x: number, y: number, text: string | string[], center = true) {
        super(scene, x, y, "main_font", text, 8);
        this.scene.add.existing(this);
        if (center) {
            this.setOrigin(0.5).setCenterAlign();
        }
    }
}
