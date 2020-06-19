
export class TextInput extends Phaser.GameObjects.BitmapText {
    private underLineLength = 10;
    private underLine: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, x: number, y: number, maxLength: number, text: string, onChange: (text: string) => void) {
        super(scene, x, y, 'main_font', text, 32);
        this.scene.add.existing(this);

        this.underLine = this.scene.add.text(x, y+1, '_______', { fontFamily: 'Arial', fontSize: "32px", color: '#ffffff'})


        const keySpace = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        const keyBackspace = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.BACKSPACE);
        this.scene.input.keyboard.on('keydown', (event: KeyboardEvent) => {
            if (event.keyCode === 8 && this.text.length > 0) {
                this.deleteLetter();
            } else if ((event.keyCode === 32 || (event.keyCode >= 48 && event.keyCode <= 90)) && this.text.length < maxLength) {
                this.addLetter(event.key);
            }
            onChange(this.text);
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
