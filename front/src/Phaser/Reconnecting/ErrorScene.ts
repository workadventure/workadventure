import {TextField} from "../Components/TextField";
import Image = Phaser.GameObjects.Image;
import {ResizableScene} from "../Login/ResizableScene";

enum ReconnectingTextures {
    icon = "icon",
    mainFont = "main_font"
}

export class ErrorScene extends ResizableScene {
    private reconnectingField!: TextField;
    private catImage!: Phaser.Physics.Arcade.Sprite;
    private logo!: Image;
    private text: string = '';
    private status: number = 404;

    constructor(key: string) {
        super({
            key: key
        });
    }

    init(data: {status: number, text: string}){
        this.text = data.text;
        this .status = data.status;
    }

    preload() {
        this.load.image(ReconnectingTextures.icon, "resources/logos/tcm_full.png");
        // Note: arcade.png from the Phaser 3 examples at: https://github.com/photonstorm/phaser3-examples/tree/master/public/assets/fonts/bitmap
        this.load.bitmapFont(ReconnectingTextures.mainFont, 'resources/fonts/arcade.png', 'resources/fonts/arcade.xml');
        this.load.spritesheet(
            'cat',
            'resources/characters/pipoya/Cat 01-1.png',
            {frameWidth: 32, frameHeight: 32}
        );
    }

    create() {
        this.logo = new Image(this, this.game.renderer.width - 30, this.game.renderer.height - 20, ReconnectingTextures.icon);
        this.add.existing(this.logo);

        this.reconnectingField = new TextField(
            this,
            this.game.renderer.width / 2,
            this.game.renderer.height / 2,
            this.text);

        this.catImage = this.physics.add.sprite(
            this.game.renderer.width / 2,
            this.game.renderer.height / 2 - 70,
            'cat');

        this.anims.create({
            key: 'right',
            frames: this.anims.generateFrameNumbers('cat', {start: 6, end: 8}),
            frameRate: 10,
            repeat: -1
        });
        this.catImage.play('right');
    }

    onResize(){
        this.reconnectingField.x = this.game.renderer.width / 2;
        this.reconnectingField.y = this.game.renderer.height / 2;
        this.catImage.x = this.game.renderer.width / 2;
        this.catImage.y = this.game.renderer.height / 2 - 70;
        this.logo.x = this.game.renderer.width - 30;
        this.logo.y = this.game.renderer.height - 30;
    }
}
