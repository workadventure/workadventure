
export class TextInput extends Phaser.GameObjects.BitmapText {
    private minUnderLineLength = 4;
    private underLine: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, x: number, y: number, maxLength: number, text: string, onChange: (text: string) => void) {
        super(scene, x, y, 'main_font', text, 32);
        this.setOrigin(0.5).setCenterAlign()
        this.scene.add.existing(this);

        this.underLine = this.scene.add.text(x, y+1, this.getUnderLineBody(text.length), { fontFamily: 'Arial', fontSize: "32px", color: '#ffffff'})
        this.underLine.setOrigin(0.5)


        this.scene.input.keyboard.on('keydown', (event: KeyboardEvent) => {
            if (event.keyCode === 8 && this.text.length > 0) {
                this.deleteLetter();
            } else if ((event.keyCode === 32 || (event.keyCode >= 48 && event.keyCode <= 90)) && this.text.length < maxLength) {
                this.addLetter(event.key);
            }
            this.underLine.text = this.getUnderLineBody(this.text.length);
            onChange(this.text);
        });
    }
    
    private getUnderLineBody(textLength:number): string {
        if (textLength < this.minUnderLineLength) textLength = this.minUnderLineLength;
        let text = '_______';
        for (let i = this.minUnderLineLength; i < textLength; i++) {
            text += '__'
        }
        return text;
    }

    private deleteLetter() {
        this.text = this.text.substr(0, this.text.length - 1);
    }


    private addLetter(letter: string) {
        this.text += letter;
    }

    getText(): string {
        return this.text;
    }

    setX(x: number): this {
        super.setX(x);
        this.underLine.x = x;
        return this;
    }

    setY(y: number): this {
        super.setY(y);
        this.underLine.y = y+1;
        return this;
    }
}
