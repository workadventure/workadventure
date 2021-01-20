
const IGNORED_KEYS = new Set([
    'Esc',
    'Escape',
    'Alt',
    'Meta',
    'Control',
    'Ctrl',
    'Space',
    'Backspace'
])

export class TextInput extends Phaser.GameObjects.BitmapText {
    private minUnderLineLength = 4;
    private underLine: Phaser.GameObjects.Text;
    private domInput = document.createElement('input');

    constructor(scene: Phaser.Scene, x: number, y: number, maxLength: number, text: string, onChange: (text: string) => void) {
        super(scene, x, y, 'main_font', text, 32);
        this.setOrigin(0.5).setCenterAlign()
        this.scene.add.existing(this);

        this.underLine = this.scene.add.text(x, y+1, this.getUnderLineBody(text.length), { fontFamily: 'Arial', fontSize: "32px", color: '#ffffff'})
        this.underLine.setOrigin(0.5)


        const { domInput } = this;
        document.body.append(domInput);
        domInput.maxLength = maxLength;
        domInput.style.opacity = "0";
        if (text) {
            domInput.value = text;
        }
        domInput.focus();

        domInput.addEventListener('keydown', event => {
            const { key } = event
            if (IGNORED_KEYS.has(key)) {
                return
            }

            const match = /[a-zA-Z0-9:.!&?()+-]/.exec(key)
            if (!match) {
                event.preventDefault()
            }
        })


        domInput.addEventListener('input', (event) => {
            if (event.defaultPrevented) {
                return
            }
            const { value } = domInput
            this.text = value;
            this.underLine.text = this.getUnderLineBody(this.text.length);
            onChange(this.text);
        })
    }

    private getUnderLineBody(textLength:number): string {
        if (textLength < this.minUnderLineLength) textLength = this.minUnderLineLength;
        let text = '_______';
        for (let i = this.minUnderLineLength; i < textLength; i++) {
            text += '__'
        }
        return text;
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

    focus() {
        this.domInput.focus();
    }

    destroy(): void {
        super.destroy();
        this.domInput.remove();
    }
}
