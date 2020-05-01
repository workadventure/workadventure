import {gameManager} from "../Game/GameManager";
import {TextField} from "../Components/TextField";
import {TextInput} from "../Components/TextInput";
import {ClickButton} from "../Components/ClickButton";
import {GameSceneName} from "../Game/GameScene";
import Image = Phaser.GameObjects.Image;

//todo: put this constants in a dedicated file
export const LoginSceneName = "LoginScene";
enum LoginTextures {
    playButton = "play_button",
    icon = "icon"
}

export class LogincScene extends Phaser.Scene {
    private emailInput: TextInput;
    private textField: TextField;
    private playButton: ClickButton;
    private infoTextField: TextField;
    private logo: Image;

    constructor() {
        super({
            key: LoginSceneName
        });
    }

    preload() {
        this.load.image(LoginTextures.playButton, "resources/objects/play_button.png");
        this.load.image(LoginTextures.icon, "resources/logos/tcm_full.png");
    }

    create() {
        this.textField = new TextField(this, 10, 10, 'Enter your name:');
        this.emailInput = new TextInput(this, 10, 50);

        let x = this.game.renderer.width / 2;
        let y = this.game.renderer.height / 2;
        this.playButton = new ClickButton(this, x, y, LoginTextures.playButton, this.login.bind(this));

        this.logo = new Image(this, this.game.renderer.width - 30, this.game.renderer.height - 20, LoginTextures.icon);
        this.add.existing(this.logo);


        let infoText = "Commands: \n - Arrows or Z,Q,S,D to move\n - SHIFT to run";
        this.infoTextField = new TextField(this, 10, this.game.renderer.height - 60, infoText);
    }

    update(time: number, delta: number): void {

    }

    async login() {
        let email = this.emailInput.text;
        if (!email) return;
        gameManager.connect(email).then(() => {
            this.scene.start(GameSceneName);
        });
    }
}
