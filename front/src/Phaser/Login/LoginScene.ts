import {gameManager} from "../Game/GameManager";
import {SelectCharacterSceneName} from "./SelectCharacterScene";
import {ResizableScene} from "./ResizableScene";
import { localUserStore } from "../../Connexion/LocalUserStore";
import {MenuScene} from "../Menu/MenuScene";
import { isUserNameValid } from "../../Connexion/LocalUser";
import { RESOLUTION } from "../../Enum/EnvironmentVariable";

export const LoginSceneName = "LoginScene";

const loginSceneKey = 'loginScene';

export class LoginScene extends ResizableScene {

    private loginSceneElement!: Phaser.GameObjects.DOMElement;
    private name: string = '';

    constructor() {
        super({
            key: LoginSceneName
        });
        this.name = gameManager.getPlayerName() || '';
    }

    preload() {
        this.load.html(loginSceneKey, 'resources/html/loginScene.html');
    }

    create() {
        const middleX = this.getMiddleX();
        this.loginSceneElement = this.add.dom(middleX, 0).createFromCache(loginSceneKey);
        MenuScene.revealMenusAfterInit(this.loginSceneElement, loginSceneKey);

        const pErrorElement = this.loginSceneElement.getChildByID('errorLoginScene') as HTMLInputElement;
        const inputElement = this.loginSceneElement.getChildByID('loginSceneName') as HTMLInputElement;
        inputElement.value = localUserStore.getName() ?? '';
        inputElement.focus();
        inputElement.addEventListener('keypress', (event: KeyboardEvent) => {
            if(inputElement.value.length > 7){
                event.preventDefault();
                return;
            }
            pErrorElement.innerHTML = '';
            if(inputElement.value && !isUserNameValid(inputElement.value)){
                pErrorElement.innerHTML = 'Invalid user name: only letters and numbers are allowed. No spaces.';
            }
            if (event.key === 'Enter') {
                event.preventDefault();
                this.login(inputElement);
                return;
            }
        });

        const continuingButton = this.loginSceneElement.getChildByID('loginSceneFormSubmit') as HTMLButtonElement;
        continuingButton.addEventListener('click', (e) => {
            e.preventDefault();
            this.login(inputElement);
        });
    }

    private login(inputElement: HTMLInputElement): void {
        const pErrorElement = this.loginSceneElement.getChildByID('errorLoginScene') as HTMLInputElement;
        this.name = inputElement.value;
        if (this.name === '') {
            pErrorElement.innerHTML = 'The name is empty';
            return
        }
        if(!isUserNameValid(this.name)){
            pErrorElement.innerHTML = 'Invalid user name: only letters and numbers are allowed. No spaces.';
            return
        }
        if (this.name === '') return
        gameManager.setPlayerName(this.name);

        this.scene.stop(LoginSceneName)
        gameManager.tryResumingGame(this, SelectCharacterSceneName);
        this.scene.remove(LoginSceneName)
    }

    update(time: number, delta: number): void {
        const middleX = this.getMiddleX();
        this.tweens.add({
            targets: this.loginSceneElement,
            x: middleX,
            duration: 1000,
            ease: 'Power3'
        });
    }

    public onResize(ev: UIEvent): void {
        const middleX = this.getMiddleX();
        this.tweens.add({
            targets: this.loginSceneElement,
            x: middleX,
            duration: 1000,
            ease: 'Power3'
        });
    }

    private getMiddleX() : number{
        const middleX = ((window.innerWidth) - ((this.loginSceneElement && this.loginSceneElement.width > 0 ? this.loginSceneElement.width : 200 /*FIXME to use a const will be injected in HTMLElement*/)*2)) / 2;
        return (middleX > 0 ? (middleX / 2) : 0);
    }
}
