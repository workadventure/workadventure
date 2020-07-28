import {TextField} from "../Components/TextField";
import Image = Phaser.GameObjects.Image;
import Sprite = Phaser.GameObjects.Sprite;
import {SelectCharacterSceneInitDataInterface} from "../Login/SelectCharacterScene";
import Text = Phaser.GameObjects.Text;

export const FourOFourSceneName = "FourOFourScene";
enum Textures {
    icon = "icon",
    mainFont = "main_font"
}

export class FourOFourScene extends Phaser.Scene {
    private mapNotFoundField: TextField;
    private couldNotFindField: TextField;
    private fileNameField: Text;
    private logo: Image;
    private cat: Sprite;
    private file: string;

    constructor() {
        super({
            key: FourOFourSceneName
        });
    }

    init({ file }: { file: string }) {
        this.file = file;
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

        this.couldNotFindField = new TextField(this, this.game.renderer.width / 2, this.game.renderer.height / 2 + 24, "Could not load file");
        this.couldNotFindField.setOrigin(0.5, 0.5).setCenterAlign();

        this.fileNameField = this.add.text(this.game.renderer.width / 2, this.game.renderer.height / 2 + 38, this.file, { fontFamily: 'Georgia, "Goudy Bookletter 1911", Times, serif', fontSize: '10px' });
        this.fileNameField.setOrigin(0.5, 0.5);

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
