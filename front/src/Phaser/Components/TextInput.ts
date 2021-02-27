import {HtmlUtils} from "../../WebRtc/HtmlUtils";

export class TextInput extends Phaser.GameObjects.BitmapText {
    private minUnderLineLength = 4;
    private underLine: Phaser.GameObjects.Text;
    private onChange: (text: string) => void;

    constructor(scene: Phaser.Scene, x: number, y: number, maxLength: number, text: string, onChange: (text: string) => void) {
        super(scene, x, y, 'main_font', text, 32);
        this.setOrigin(0.5).setCenterAlign()
        this.scene.add.existing(this);

        this.underLine = this.scene.add.text(x, y+1, this.getUnderLineBody(text.length), { fontFamily: 'Arial', fontSize: "32px", color: '#ffffff'})
        this.underLine.setOrigin(0.5)
        this.onChange = onChange;

        // Use a hidden input field so that on mobile browsers the virtual
        // keyboard will be displayed
        const mainContainer = HtmlUtils.getElementByIdOrFail<HTMLDivElement>('main-container');
        const inputElement = document.createElement('input');
        inputElement.id = 'playerName';
        inputElement.maxLength = maxLength
        // Make sure that now scolling is needed and that the input field is
        // not visible
        inputElement.setAttribute('style', 'opacity:0;position:absolute;bottom:0');
        mainContainer.appendChild(inputElement);

        inputElement.addEventListener('input', this.onInput.bind(this)  as EventListener);
    }

    private onInput(event: InputEvent) {
        const inputElement = <HTMLInputElement>event.target;
        // Truncate the text to the maximum length, this is needed for mobile
        // browsers that don't support the input field `maxLength` attribute
        this.text = inputElement.value.substr(0, inputElement.maxLength)
        this.onChange(this.text);
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
}
