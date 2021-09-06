export class ClickButton extends Phaser.GameObjects.Image {
    constructor(scene: Phaser.Scene, x: number, y: number, textureName: string, callback: Function) {
        super(scene, x, y, textureName);
        this.scene.add.existing(this);
        this.setInteractive();
        this.on("pointerup", callback);
    }
}
