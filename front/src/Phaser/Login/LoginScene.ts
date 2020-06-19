import {gameManager} from "../Game/GameManager";
import {TextField} from "../Components/TextField";
import {TextInput} from "../Components/TextInput";
import {ClickButton} from "../Components/ClickButton";
import Image = Phaser.GameObjects.Image;
import Rectangle = Phaser.GameObjects.Rectangle;
import {PLAYER_RESOURCES, PlayerResourceDescriptionInterface} from "../Entity/Character";
import {cypressAsserter} from "../../Cypress/CypressAsserter";
import {SelectCharacterSceneInitDataInterface, SelectCharacterSceneName} from "./SelectCharacterScene";

//todo: put this constants in a dedicated file
export const LoginSceneName = "LoginScene";
enum LoginTextures {
    icon = "icon",
    mainFont = "main_font"
}

export class LoginScene extends Phaser.Scene {
    private nameInput: TextInput|null = null;
    private textField: TextField|null = null;
    private infoTextField: TextField|null = null;
    private pressReturnField: TextField|null = null;
    private logo: Image|null = null;
    private name: string = '';

    constructor() {
        super({
            key: LoginSceneName
        });
        if (window.localStorage) {
            this.name = window.localStorage.getItem('playerName') ?? '';
        }
    }

    preload() {
        cypressAsserter.preloadStarted();
        //this.load.image(LoginTextures.playButton, "resources/objects/play_button.png");
        this.load.image(LoginTextures.icon, "resources/logos/tcm_full.png");
        // Note: arcade.png from the Phaser 3 examples at: https://github.com/photonstorm/phaser3-examples/tree/master/public/assets/fonts/bitmap
        this.load.bitmapFont(LoginTextures.mainFont, 'resources/fonts/arcade.png', 'resources/fonts/arcade.xml');
        cypressAsserter.preloadFinished();
        //add player png
        PLAYER_RESOURCES.forEach((playerResource: PlayerResourceDescriptionInterface) => {
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
        this.nameInput = new TextInput(this, this.game.renderer.width / 2 - 64, 70, 4, this.name,(text: string) => {
            this.name = text;
            if (window.localStorage) {
                window.localStorage.setItem('playerName', text);
            }
        });

        this.pressReturnField = new TextField(this, this.game.renderer.width / 2, 130, 'Press enter to start');
        this.pressReturnField.setOrigin(0.5).setCenterAlign()

        this.logo = new Image(this, this.game.renderer.width - 30, this.game.renderer.height - 20, LoginTextures.icon);
        this.add.existing(this.logo);

        const infoText = "Commands: \n - Arrows or Z,Q,S,D to move\n - SHIFT to run";
        this.infoTextField = new TextField(this, 10, this.game.renderer.height - 35, infoText);

        this.input.keyboard.on('keyup-ENTER', () => {
            if (this.name === '') {
                return
            }
            this.login(this.name);
        });

        cypressAsserter.initFinished();
    }

    update(time: number, delta: number): void {
        if (this.name == '') {
            this.pressReturnField?.setVisible(false);
        } else {
            this.pressReturnField?.setVisible(!!(Math.floor(time / 500) % 2));
        }
    }

    private login(name: string): void {
        this.scene.start(SelectCharacterSceneName, { name } as SelectCharacterSceneInitDataInterface);
    }
}
