import {TextField} from "../Components/TextField";
import Image = Phaser.GameObjects.Image;
import Sprite = Phaser.GameObjects.Sprite;
import Text = Phaser.GameObjects.Text;

export const FourOFourSceneName = "FourOFourScene";
enum Textures {
    icon = "icon",
    mainFont = "main_font"
}

export class FourOFourScene extends Phaser.Scene {
    private mapNotFoundField!: TextField;
    private couldNotFindField!: TextField;
    private fileNameField!: Text;
    private logo!: Image;
    private cat!: Sprite;
    private file: string|undefined;
    private url: string|undefined;

    constructor() {
        super({
            key: FourOFourSceneName
        });
    }

    init({ file, url }: { file?: string, url?: string }) {
        this.file = file;
        this.url = url;
    }

    preload() {
        this.load.image(Textures.icon, "resources/logos/tcm_full.png");
        // Note: arcade.png from the Phaser 3 examples at: https://github.com/photonstorm/phaser3-examples/tree/master/public/assets/fonts/bitmap
        this.load.bitmapFont(Textures.mainFont, 'resources/fonts/arcade.png', 'resources/fonts/arcade.xml');
        this.load.spritesheet(
            'cat',
            'resources/characters/pipoya/Cat 01-1.png',
            {frameWidth: 32, frameHeight: 32}
        );
    }

    create() {
        this.logo = new Image(this, this.game.renderer.width - 30, this.game.renderer.height - 20, Textures.icon);
        this.add.existing(this.logo);

        this.mapNotFoundField = new TextField(this, this.game.renderer.width / 2, this.game.renderer.height / 2, "404 - File not found");
        this.mapNotFoundField.setOrigin(0.5, 0.5).setCenterAlign();

        let text: string = '';
        if (this.file !== undefined) {
            text = "Could not load map"
        }
        if (this.url !== undefined) {
            text = "Invalid URL"
        }

        this.couldNotFindField = new TextField(this, this.game.renderer.width / 2, this.game.renderer.height / 2 + 24, text);
        this.couldNotFindField.setOrigin(0.5, 0.5).setCenterAlign();

        const url = this.file ? this.file : this.url;
        if (url !== undefined) {
            this.fileNameField = this.add.text(this.game.renderer.width / 2, this.game.renderer.height / 2 + 38, url, { fontFamily: 'Georgia, "Goudy Bookletter 1911", Times, serif', fontSize: '10px' });
            this.fileNameField.setOrigin(0.5, 0.5);
        }

        this.cat = this.physics.add.sprite(this.game.renderer.width / 2, this.game.renderer.height / 2 - 32, 'cat', 6);
        this.cat.flipY=true;
        /*this.anims.create({
            key: 'right',
            frames: this.anims.generateFrameNumbers('cat', { start: 6, end: 8 }),
            frameRate: 10,
            repeat: -1
        });
        cat.play('right');*/

    }
}
