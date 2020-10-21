import {TextField} from "../Components/TextField";
import Image = Phaser.GameObjects.Image;

enum ReconnectingTextures {
    icon = "icon",
    mainFont = "main_font"
}

export class WaitScene extends Phaser.Scene {
    private reconnectingField!: TextField;
    private logo!: Image;
    private text: string = '';

    constructor(key: string, private readonly status: number) {
        super({
            key: key
        });
        this.initialiseText();
    }

    initialiseText() {
        this.text = `${this.status}` + '\n' + '\n';
        switch (this.status) {
            case 302:
                this.text += 'Aie ! Work Adventure est victime de son succes, ' +
                    '\n' +
                    '\n' +
                    'le nombre maximum de joueurs a ete atteint !' +
                    '\n' +
                    '\n' +
                    `Reconnexion dans 30 secondes ...`;
                break;
        }
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

        const cat = this.physics.add.sprite(
            this.game.renderer.width / 2,
            this.game.renderer.height / 2 - 70,
            'cat');

        this.anims.create({
            key: 'right',
            frames: this.anims.generateFrameNumbers('cat', {start: 6, end: 8}),
            frameRate: 10,
            repeat: -1
        });
        cat.play('right');
    }
}
