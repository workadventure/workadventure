import KeyboardKeydownCallback = Phaser.Types.Input.Keyboard.KeyboardKeydownCallback;
import {connectionManager} from "../../ConnexionManager";
import {GameSceneName} from "../Game/GameScene";

export const LoginSceneName = "LoginScene";
enum LoginTextures {
    playButton = "play_button",
}

export class LogincScene extends Phaser.Scene {
    private playButton: Phaser.GameObjects.Image;
    private textEntry: Phaser.GameObjects.Text;
    constructor() {
        super({
            key: LoginSceneName
        });
    }
    
    preload() {
        this.load.image(LoginTextures.playButton, "resources/objects/play_button.png");
    }
    
    create() {
        this.add.text(10, 10, 'Enter your email:', { font: '32px Courier', fill: '#ffffff' });

        this.textEntry = this.add.text(10, 50, '', { font: '32px Courier', fill: '#ffff00' });
        let keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        let keyBackspace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.BACKSPACE);
        this.input.keyboard.on('keydown', (event: any) => {
            if (event.keyCode === 8 && this.textEntry.text.length > 0) {
                this.textEntry.text = this.textEntry.text.substr(0, this.textEntry.text.length - 1);
            } else if (event.keyCode === 32 || (event.keyCode >= 48 && event.keyCode < 90)) {
                this.textEntry.text += event.key;
            }
        });
        
        this.playButton = this.add.image(this.game.renderer.width / 2, this.game.renderer.height / 2, LoginTextures.playButton).setDepth(1);
        this.playButton.setInteractive();
        this.playButton.on("pointerup", this.login.bind(this));
    }
    
    update(time: number, delta: number): void {
        
    }
    
    async login() {
        let email = this.textEntry.text;
        if (!email) return;
        await connectionManager.createConnexion("a.poly@thecodingmachine.com");
        this.scene.start(GameSceneName);
    }
}