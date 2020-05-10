import {gameManager} from "../Game/GameManager";
import {TextField} from "../Components/TextField";
import {TextInput} from "../Components/TextInput";
import {ClickButton} from "../Components/ClickButton";
import {GameScene, GameSceneInterface} from "../Game/GameScene";
import Image = Phaser.GameObjects.Image;
import Rectangle = Phaser.GameObjects.Rectangle;
import {PLAYER_RESOURCES} from "../Entity/PlayableCaracter";
import {cypressAsserter} from "../../Cypress/CypressAsserter";
import {GroupCreatedUpdatedMessageInterface, MessageUserPositionInterface} from "../../Connexion";
import {MAP_FILE_URL} from "../../Enum/EnvironmentVariable";

export function getMapKeyByUrl(mapUrlStart: string){
    let tab = mapUrlStart.split("/");
    return tab[tab.length -1].substr(0, tab[tab.length -1].indexOf(".json"));
}

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

    constructor() {
        super({
            key: LoginSceneName
        });
    }

    preload() {
        cypressAsserter.preloadStarted();
        //this.load.image(LoginTextures.playButton, "resources/objects/play_button.png");
        this.load.image(LoginTextures.icon, "resources/logos/tcm_full.png");
        // Note: arcade.png from the Phaser 3 examples at: https://github.com/photonstorm/phaser3-examples/tree/master/public/assets/fonts/bitmap
        this.load.bitmapFont(LoginTextures.mainFont, 'resources/fonts/arcade.png', 'resources/fonts/arcade.xml');
        cypressAsserter.preloadFinished();
        //add player png
        PLAYER_RESOURCES.forEach((playerResource: any) => {
            this.load.spritesheet(
                playerResource.name,
                playerResource.img,
                {frameWidth: 32, frameHeight: 32}
            );
        });
    }

    create() {
        cypressAsserter.initStarted();

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
        cypressAsserter.initFinished();
    }

    update(time: number, delta: number): void {
        if (this.nameInput.getText() == '') {
            this.pressReturnField.setVisible(false);
        } else {
            this.pressReturnField.setVisible(!!(Math.floor(time / 500) % 2));
        }
    }

    private async login(name: string) {
        return gameManager.connect(name, this.selectedPlayer.texture.key).then(() => {
            return gameManager.loadMaps().then((scene : any) => {
                if (!scene) {
                    return;
                }
                let key = getMapKeyByUrl(scene.mapUrlStart);
                let game = new GameScene(key,`${MAP_FILE_URL}${scene.mapUrlStart}`);
                this.scene.add(key, game, false);
                this.scene.start(key);
                return scene;
            }).catch((err) => {
                console.error(err);
                throw err;
            });
        }).catch((err) => {
            console.error(err);
            throw err;
        });
    }

    Map: Phaser.Tilemaps.Tilemap;

    initAnimation(): void {
        throw new Error("Method not implemented.");
    }

    createCurrentPlayer(UserId: string): void {
        for (let i = 0; i <PLAYER_RESOURCES.length; i++) {
            let playerResource = PLAYER_RESOURCES[i];
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
        this.selectedPlayer.play(PLAYER_RESOURCES[0].name);
    }

    shareUserPosition(UsersPosition: import("../../Connexion").MessageUserPositionInterface[]): void {
        throw new Error("Method not implemented.");
    }

    deleteGroup(groupId: string): void {
        throw new Error("Method not implemented.");
    }

    shareGroupPosition(groupPositionMessage: GroupCreatedUpdatedMessageInterface): void {
        throw new Error("Method not implemented.");
    }

    updateOrCreateMapPlayer(UsersPosition: Array<MessageUserPositionInterface>): void {
        throw new Error("Method not implemented.");
    }
}
