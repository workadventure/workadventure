
export class TextInput extends Phaser.GameObjects.Text {
    private underLineLength = 10;
    private underLine: Phaser.GameObjects.Text;
    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, '', { fontFamily: 'Arial', fontSize: "20px", color: '#ffffff'});
        this.scene.add.existing(this);

        this.underLine = this.scene.add.text(x, y+1, '__________', { fontFamily: 'Arial', fontSize: "20px", color: '#ffffff'})

        
        let keySpace = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        let keyBackspace = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.BACKSPACE);
        this.scene.input.keyboard.on('keydown', (event: any) => {
            if (event.keyCode === 8 && this.text.length > 0) {
                this.deleteLetter();
            } else if (event.keyCode === 32 || (event.keyCode >= 48 && event.keyCode < 90)) {
                this.addLetter(event.key);
            }
        });
    }
    
    private deleteLetter() {
        this.text = this.text.substr(0, this.text.length - 1);
        if (this.underLine.text.length > this.underLineLength) {
            this.underLine.text = this.underLine.text.substr(0, this.underLine.text.length - 1);
        }
    }


    private addLetter(letter: string) {
        this.text += letter;
        if (this.text.length > this.underLineLength) {
            this.underLine.text +=  '_';
        }
    }

    getText(): string {
        return this.text;
    }


}