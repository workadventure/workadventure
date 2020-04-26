
export class TextField extends Phaser.GameObjects.Text {
    constructor(scene: Phaser.Scene, x: number, y: number, text: string | string[]) {
        super(scene, x, y, text, { fontFamily: 'Arial', fontSize: "20px", color: '#ffffff'});
        this.scene.add.existing(this)
    }
}