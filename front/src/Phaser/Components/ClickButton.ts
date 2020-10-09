import {SpeechBubble} from "../Entity/SpeechBubble";
import {PlayerAnimationNames} from "../Player/Animation";
import Container = Phaser.GameObjects.Container;
import Image = Phaser.GameObjects.Image;
import BitmapText = Phaser.GameObjects.BitmapText;

export class ClickButton extends Container {
    private button!: Image;
    private text!: BitmapText;
    private buttonSelected!: Image;
    //private textSelected!: BitmapText;
    private selected: boolean = false;
    private callback: (() => void)|null = null;
    private pointerOverCallback: (() => void)|null = null;
    private pointerOutCallback: (() => void)|null = null;

    constructor(scene: Phaser.Scene,
                x: number,
                y: number,
                label: string,
                texture: string,
                textureSelected: string,
    ) {
        super(scene, x, y/*, texture, frame*/);

        this.button = new Image(scene, 0, 0, texture);
        this.buttonSelected = new Image(scene, 0, 0, textureSelected);
        this.buttonSelected.setVisible(false);
        this.text = new BitmapText(scene, 0, 0, 'main_font', label, 8);
        this.text.setOrigin(0.5, 0.5);
        //this.textSelected = new BitmapText(scene, 0, 0, 'main_font', label, 8);
        //this.textSelected.setOrigin(0.5, 0.5);
        this.add(this.button);
        this.add(this.buttonSelected);
        this.add(this.text);

        this.button.setInteractive();
        this.buttonSelected.setInteractive();

        this.button.on("pointerover", () => {
            if (this.pointerOverCallback === null) {
                return;
            }
            this.pointerOverCallback();
        });

        this.buttonSelected.on("pointerout", () => {
            if (this.pointerOutCallback === null) {
                return;
            }
            this.pointerOutCallback();
        });

        this.buttonSelected.on('pointerup', () => {
            if (this.callback === null) {
                return;
            }
            this.callback();
        });
        this.button.on('pointerup', () => {
            if (this.callback === null) {
                return;
            }
            this.callback();
        });
    }

    public select(): void {
        this.selected = true;
        this.switchToSelected();
    }

    private switchToSelected(): void {
        this.button.setVisible(false);
        this.buttonSelected.setVisible(true);
    }

    public unselect(): void {
        this.selected = false;
        this.switchToNotSelected();
    }

    private switchToNotSelected(): void {
        this.button.setVisible(true);
        this.buttonSelected.setVisible(false);
    }

    public onClick(callback: () => void) {
        this.callback = callback;
    }

    public onPointerOver(callback: () => void) {
        this.pointerOverCallback = callback;
    }

    public onPointerOut(callback: () => void) {
        this.pointerOutCallback = callback;
    }

    public click(): void {
        if (this.callback !== null) {
            this.callback();
        }
    }
}
