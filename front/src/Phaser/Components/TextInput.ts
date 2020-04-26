
export class TextInput extends Phaser.GameObjects.Text {
    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, '', { fontSize: '32px', fontStyle: 'Courier', color: '#fff'});
        this.scene.add.existing(this);

        
        let keySpace = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        let keyBackspace = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.BACKSPACE);
        this.scene.input.keyboard.on('keydown', (event: any) => {
            if (event.keyCode === 8 && this.text.length > 0) {
                this.text = this.text.substr(0, this.text.length - 1);
            } else if (event.keyCode === 32 || (event.keyCode >= 48 && event.keyCode < 90)) {
                this.text += event.key;
            }
        });
    }
    
    getText(): string {
        return this.text;
    }


}