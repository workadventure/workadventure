import {gameManager, HasMovedEvent} from "../Game/GameManager";
import {TextField} from "../Components/TextField";
import {TextInput} from "../Components/TextInput";
import {ClickButton} from "../Components/ClickButton";
import {GameSceneInterface, GameSceneName, Textures} from "../Game/GameScene";
import Image = Phaser.GameObjects.Image;
import {Player} from "../Player/Player";
import {getPlayerAnimations, PlayerAnimationNames} from "../Player/Animation";
import Rectangle = Phaser.GameObjects.Rectangle;

//todo: put this constants in a dedicated file
export const LoginSceneName = "LoginScene";
enum LoginTextures {
    //playButton = "play_button",
    icon = "icon",
    mainFont = "main_font"
}

export class LogincScene extends Phaser.Scene implements GameSceneInterface {
    private nameInput: TextInput;
    private textField: TextField;
    private playButton: ClickButton;
    private infoTextField: TextField;
    private pressReturnField: TextField;
    private logo: Image;

    private selectedRectangle: Rectangle;
    private selectedPlayer: Phaser.Physics.Arcade.Sprite;
    private players: Array<Phaser.Physics.Arcade.Sprite> = new Array<Phaser.Physics.Arcade.Sprite>();

    private playerResources: Array<any> = [
        {name: "male1", img: "resources/characters/pipoya/Male 01-1.png", x: 32, y: 32},
        {name: "male2", img: "resources/characters/pipoya/Male 02-2.png", x: 64, y: 32},
        {name: "male3", img: "resources/characters/pipoya/Male 03-4.png", x: 96, y: 32},
        {name: "male4", img: "resources/characters/pipoya/Male 09-1.png", x: 128, y: 32},

        {name: "male5", img: "resources/characters/pipoya/Male 10-3.png", x: 32, y: 64},
        {name: "male6", img: "resources/characters/pipoya/Male 17-2.png", x: 64, y: 64},
        {name: "male7", img: "resources/characters/pipoya/Male 18-1.png", x: 96, y: 64},
        {name: "male8", img: "resources/characters/pipoya/Male 16-4.png", x: 128, y: 64},

        {name: "Female1", img: "resources/characters/pipoya/Female 01-1.png", x: 32, y: 96},
        {name: "Female2", img: "resources/characters/pipoya/Female 02-2.png", x: 64, y: 96},
        {name: "Female3", img: "resources/characters/pipoya/Female 03-4.png", x: 96, y: 96},
        {name: "Female4", img: "resources/characters/pipoya/Female 09-1.png", x: 128, y: 96},

        {name: "Female5", img: "resources/characters/pipoya/Female 10-3.png", x: 32, y: 128},
        {name: "Female6", img: "resources/characters/pipoya/Female 17-2.png", x: 64, y: 128},
        {name: "Female7", img: "resources/characters/pipoya/Female 18-1.png", x: 96, y: 128},
        {name: "Female8", img: "resources/characters/pipoya/Female 16-4.png", x: 128, y: 128}
    ];

    constructor() {
        super({
            key: LoginSceneName
        });
    }

    preload() {
        //this.load.image(LoginTextures.playButton, "resources/objects/play_button.png");
        this.load.image(LoginTextures.icon, "resources/logos/tcm_full.png");
        // Note: arcade.png from the Phaser 3 examples at: https://github.com/photonstorm/phaser3-examples/tree/master/public/assets/fonts/bitmap
        this.load.bitmapFont(LoginTextures.mainFont, 'resources/fonts/arcade.png', 'resources/fonts/arcade.xml');
        //add player png
        this.playerResources.forEach((playerResource: any) => {
            this.load.spritesheet(
                playerResource.name,
                playerResource.img,
                {frameWidth: 32, frameHeight: 32}
            );
        });
    }

    create() {
        this.textField = new TextField(this, this.game.renderer.width / 2, 50, 'Enter your name:');
        this.textField.setOrigin(0.5).setCenterAlign()
        this.nameInput = new TextInput(this, this.game.renderer.width / 2 - 64, 70, 4);

        this.pressReturnField = new TextField(this, this.game.renderer.width / 2, 130, 'Press enter to start');
        this.pressReturnField.setOrigin(0.5).setCenterAlign()

        this.selectedRectangle = this.add.rectangle(32, 32, 32, 32).setStrokeStyle(2, 0xFFFFFF);

        this.logo = new Image(this, this.game.renderer.width - 30, this.game.renderer.height - 20, LoginTextures.icon);
        this.add.existing(this.logo);

        let infoText = "Commands: \n - Arrows or Z,Q,S,D to move\n - SHIFT to run";
        this.infoTextField = new TextField(this, 10, this.game.renderer.height - 35, infoText);

        this.input.keyboard.on('keyup-ENTER', () => {
            let name = this.nameInput.getText();
            if (name === '') {
                return
            }
            return this.login(name);
        });

        /*create user*/
        this.createCurrentPlayer("test");
    }

    update(time: number, delta: number): void {
        if (this.nameInput.getText() == '') {
            this.pressReturnField.setVisible(false);
        } else {
            this.pressReturnField.setVisible(!!(Math.floor(time / 500) % 2));
        }
    }

    private async login(name: string) {
        gameManager.connect(name).then(() => {
            this.scene.start(GameSceneName);
        });
    }

    Map: Phaser.Tilemaps.Tilemap;

    initAnimation(): void {

    }

    createCurrentPlayer(UserId: string): void {
        for (let i = 0; i < this.playerResources.length; i++) {
            let playerResource = this.playerResources[i];
            let player = this.physics.add.sprite(playerResource.x, playerResource.y, playerResource.name, playerResource.name);
            player.setBounce(0.2);
            player.setCollideWorldBounds(true);
            this.anims.create({
                key: playerResource.name,
                frames: this.anims.generateFrameNumbers(playerResource.name, {start: 0, end: 2,}),
                frameRate: 10,
                repeat: -1
            });
            player.setInteractive().on("pointerdown", () => {
                this.selectedPlayer.anims.pause();
                this.selectedRectangle.setY(player.y);
                this.selectedRectangle.setX(player.x);
                player.play(playerResource.name);
                this.selectedPlayer = player;
            });
            this.players.push(player);
        }
        this.selectedPlayer = this.players[0];
        this.selectedPlayer.play(this.playerResources[0].name);
    }

    shareUserPosition(UsersPosition: import("../../Connexion").MessageUserPositionInterface[]): void {
        throw new Error("Method not implemented.");
    }
}
