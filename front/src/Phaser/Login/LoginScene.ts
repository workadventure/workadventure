import {gameManager} from "../Game/GameManager";
import {TextField} from "../Components/TextField";
import {TextInput} from "../Components/TextInput";
import Image = Phaser.GameObjects.Image;
import {SelectCharacterSceneName} from "./SelectCharacterScene";
import {ResizableScene} from "./ResizableScene";
import { localUserStore } from "../../Connexion/LocalUserStore";
import Rectangle = Phaser.GameObjects.Rectangle;

//todo: put this constants in a dedicated file
export const LoginSceneName = "LoginScene";
enum LoginTextures {
    icon = "icon",
    mainFont = "main_font"
}

export class LoginScene extends ResizableScene {
    private nameInput!: TextInput;
    private textField!: TextField;
    private infoTextField!: TextField;
    private pressReturnField!: TextField;
    private logo!: Image;
    private name: string = '';

    private mobileTapRectangle!: Phaser.GameObjects.Rectangle;
    constructor() {
        super({
            key: LoginSceneName
        });
        this.name = gameManager.getPlayerName() || '';
    }

    preload() {
        //this.load.image(LoginTextures.playButton, "resources/objects/play_button.png");
        this.load.image(LoginTextures.icon, "resources/logos/tcm_full.png");
        // Note: arcade.png from the Phaser 3 examples at: https://github.com/photonstorm/phaser3-examples/tree/master/public/assets/fonts/bitmap
        this.load.bitmapFont(LoginTextures.mainFont, 'resources/fonts/arcade.png', 'resources/fonts/arcade.xml');
    }

    create() {

        this.nameInput = new TextInput(this, this.game.renderer.width / 2, 70, 10, this.name,(text: string) => {
            this.name = text;
            localUserStore.setName(text);
        })
            .setInteractive()
            .on('pointerdown', () => {
                this.nameInput.focus();
            })

        this.textField = new TextField(this, this.game.renderer.width / 2, 50, 'Enter your name:')
            .setInteractive()
            .on('pointerdown', () => {
                this.nameInput.focus();
            })
        // For mobile purposes - we need a big enough touchable area.
        this.mobileTapRectangle = this.add.rectangle(
            this.game.renderer.width / 2,
            130,
            this.game.renderer.width / 2,
            60,
        ).setInteractive()
        .on('pointerdown', () => {
            this.login(this.name)
        })
        this.pressReturnField = new TextField(this, this.game.renderer.width / 2, 130, 'Touch here\n\n or \n\nPress enter to start')

        this.logo = new Image(this, this.game.renderer.width - 30, this.game.renderer.height - 20, LoginTextures.icon);
        this.add.existing(this.logo);

        const infoText = "Commands: \n - Arrows or W, A, S, D to move\n - SHIFT to run";
        this.infoTextField = new TextField(this, 10, this.game.renderer.height - 35, infoText, false);

        this.input.keyboard.on('keyup-ENTER', () => {
            if (this.name === '') {
                return
            }
            this.login(this.name);
        });
    }

    update(time: number, delta: number): void {
        if (this.name == '') {
            this.pressReturnField?.setVisible(false);
        } else {
            this.pressReturnField?.setVisible(!!(Math.floor(time / 500) % 2));
        }
    }

    private login(name: string): void {
        if (this.name === '') return
        gameManager.setPlayerName(name);

        this.scene.stop(LoginSceneName)
        gameManager.tryResumingGame(this, SelectCharacterSceneName);
        this.scene.remove(LoginSceneName)
    }

    public onResize(ev: UIEvent): void {
        this.textField.x = this.game.renderer.width / 2;
        this.nameInput.setX(this.game.renderer.width / 2 - 64);
        this.pressReturnField.x = this.game.renderer.width / 2;
        this.mobileTapRectangle.x = this.game.renderer.width / 2;
        this.logo.x = this.game.renderer.width - 30;
        this.logo.y = this.game.renderer.height - 20;
        this.infoTextField.y = this.game.renderer.height - 35;
    }

}
