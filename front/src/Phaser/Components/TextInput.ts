
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

    constructor(scene: Phaser.Scene, x: number, y: number, maxLength: number, text: string,
                onChange: (text: string) => void) {
        super(scene, x, y, 'main_font', text, 32);
        this.setOrigin(0.5).setCenterAlign();
        this.scene.add.existing(this);

        const style = {fontFamily: 'Arial', fontSize: "32px", color: '#ffffff'};
        this.underLine = this.scene.add.text(x, y+1, this.getUnderLineBody(text.length), style);
        this.underLine.setOrigin(0.5);

        this.domInput.maxLength = maxLength;
        this.domInput.style.opacity = "0";
        if (text) {
            this.domInput.value = text;
        }

        this.domInput.addEventListener('keydown', event => {
            if (IGNORED_KEYS.has(event.key)) {
                return;
            }

            if (!/[a-zA-Z0-9:.!&?()+-]/.exec(event.key)) {
                event.preventDefault();
            }
        });

        this.domInput.addEventListener('input', (event) => {
            if (event.defaultPrevented) {
                return;
            }
            this.text = this.domInput.value;
            this.underLine.text = this.getUnderLineBody(this.text.length);
            onChange(this.text);
        });

        document.body.append(this.domInput);
        this.focus();
    }

    private getUnderLineBody(textLength:number): string {
        if (textLength < this.minUnderLineLength) textLength = this.minUnderLineLength;
        let text = '_______';
        for (let i = this.minUnderLineLength; i < textLength; i++) {
            text += '__';
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
