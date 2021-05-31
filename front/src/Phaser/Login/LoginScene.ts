import {gameManager} from "../Game/GameManager";
import {SelectCharacterSceneName} from "./SelectCharacterScene";
import {ResizableScene} from "./ResizableScene";
import { localUserStore } from "../../Connexion/LocalUserStore";
import {MenuScene} from "../Menu/MenuScene";
import { isUserNameValid } from "../../Connexion/LocalUser";

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
        this.loginSceneElement = this.add.dom(-1000, 0).createFromCache(loginSceneKey);
        this.centerXDomElement(this.loginSceneElement, 200);
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
                pErrorElement.innerHTML = 'Invalid user name: No spaces are allowed.';
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

    }

    public onResize(): void {
        this.centerXDomElement(this.loginSceneElement, 200);
    }
}
