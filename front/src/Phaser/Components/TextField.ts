
export class TextField extends Phaser.GameObjects.Text {
    constructor(scene: Phaser.Scene, x: number, y: number, text: string | string[]) {
        super(scene, x, y, text, { fontSize: '32px', fontStyle: 'Courier', color: '#ffffff'});
        this.scene.add.existing(this)
    }
}