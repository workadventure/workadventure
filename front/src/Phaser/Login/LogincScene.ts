import {gameManager} from "../Game/GameManager";
import {TextField} from "../Components/TextField";
import {TextInput} from "../Components/TextInput";
import {ClickButton} from "../Components/ClickButton";
import {GameSceneName} from "../Game/GameScene";
import Image = Phaser.GameObjects.Image;
import {cypressAsserter} from "../../Cypress/CypressAsserter";

//todo: put this constants in a dedicated file
export const LoginSceneName = "LoginScene";
enum LoginTextures {
    //playButton = "play_button",
    icon = "icon",
    mainFont = "main_font"
}

export class LogincScene extends Phaser.Scene {
    private nameInput: TextInput;
    private textField: TextField;
    private playButton: ClickButton;
    private infoTextField: TextField;
    private pressReturnField: TextField;
    private logo: Image;

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
    }

    create() {
        cypressAsserter.initStarted();

        this.textField = new TextField(this, this.game.renderer.width / 2, 50, 'Enter your name:');
        this.textField.setOrigin(0.5).setCenterAlign()
        this.nameInput = new TextInput(this, this.game.renderer.width / 2 - 64, 70, 4);

        this.pressReturnField = new TextField(this, this.game.renderer.width / 2, 130, 'Press enter to start');
        this.pressReturnField.setOrigin(0.5).setCenterAlign()

        //let x = this.game.renderer.width / 2;
        //let y = this.game.renderer.height / 2;
        //this.playButton = new ClickButton(this, x, y, LoginTextures.playButton, this.login.bind(this));

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
        gameManager.connect(name).then(() => {
            this.scene.start(GameSceneName);
        });
    }
}
