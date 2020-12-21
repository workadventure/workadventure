import {LoginScene, LoginSceneName} from "../Login/LoginScene";
import {SelectCharacterScene, SelectCharacterSceneName} from "../Login/SelectCharacterScene";
import {gameManager} from "../Game/GameManager";
import {localUserStore} from "../../Connexion/LocalUserStore";
import {mediaManager} from "../../WebRtc/MediaManager";
import {coWebsiteManager} from "../../WebRtc/CoWebsiteManager";

export const MenuSceneName = 'MenuScene';
const gameMenuKey = 'gameMenu';
const gameMenuIconKey = 'gameMenuIcon';
const gameSettingsMenuKey = 'gameSettingsMenu';
const gameLogin = 'gameLogin';
const gameForgotPassword = 'gameForgotPassword';
const gameRegister = 'gameRegister';
const gameShare = 'gameShare';

const closedSideMenuX = -200;
const openedSideMenuX = 0;

/**
 * The scene that manages the game menu, rendered using a DOM element.
 */
export class MenuScene extends Phaser.Scene {
    private menuElement!: Phaser.GameObjects.DOMElement;
    private gameQualityMenuElement!: Phaser.GameObjects.DOMElement;
    private gameLoginElement!: Phaser.GameObjects.DOMElement;
    private gameForgotPasswordElement!: Phaser.GameObjects.DOMElement;
    private gameRegisterElement!: Phaser.GameObjects.DOMElement;
    private gameShareElement!: Phaser.GameObjects.DOMElement;
    private sideMenuOpened = false;
    private settingsMenuOpened = false;
    private gameLoginMenuOpened = false;
    private gameShareOpened = false;
    private gameQualityValue: number;
    private videoQualityValue: number;
    private menuButton!: Phaser.GameObjects.DOMElement;

    constructor() {
        super({key: MenuSceneName});

        this.gameQualityValue = localUserStore.getGameQualityValue();
        this.videoQualityValue = localUserStore.getVideoQualityValue();
    }

    preload () {
        this.load.html(gameMenuKey, 'resources/html/gameMenu.html');
        this.load.html(gameMenuIconKey, 'resources/html/gameMenuIcon.html');
        this.load.html(gameSettingsMenuKey, 'resources/html/gameQualityMenu.html');
        this.load.html(gameLogin, 'resources/html/gameLogin.html');
        this.load.html(gameForgotPassword, 'resources/html/gameForgotPassword.html');
        this.load.html(gameRegister, 'resources/html/gameRegister.html');
        this.load.html(gameShare, 'resources/html/gameShare.html');
    }

    create() {
        this.menuElement = this.add.dom(closedSideMenuX, 30).createFromCache(gameMenuKey);
        this.menuElement.setOrigin(0);
        this.revealMenusAfterInit(this.menuElement, 'gameMenu');

        const middleX = (window.innerWidth / 3) - 298;
        this.gameQualityMenuElement = this.add.dom(middleX, -400).createFromCache(gameSettingsMenuKey);
        this.revealMenusAfterInit(this.gameQualityMenuElement, 'gameQuality');

        this.gameLoginElement = this.add.dom(middleX, -400).createFromCache(gameLogin);
        this.revealMenusAfterInit(this.gameLoginElement, gameLogin);
        this.gameLoginElement.addListener('click');
        this.gameLoginElement.on('click',  (event:MouseEvent) => {
            event.preventDefault();
            if((event?.target as HTMLInputElement).id === 'gameLoginFormCancel') {
                this.closeGameLogin();
            }else if((event?.target as HTMLInputElement).id === 'gameLoginFormSubmit') {
                this.login();
            }else if((event?.target as HTMLInputElement).id === 'gameLoginFormForgotPassword') {
                this.closeGameLogin();
                this.openGameForgotPassword();
            }else if((event?.target as HTMLInputElement).id === 'gameLoginFormRegister') {
                this.closeGameLogin();
                this.openGameRegister();
            }
        });

        this.gameForgotPasswordElement = this.add.dom(middleX, -400).createFromCache(gameForgotPassword);
        this.revealMenusAfterInit(this.gameForgotPasswordElement, gameForgotPassword);
        this.gameForgotPasswordElement.addListener('click');
        this.gameForgotPasswordElement.on('click',  (event:MouseEvent) => {
            event.preventDefault();
            if((event?.target as HTMLInputElement).id === 'gameLoginFormForgotPasswordSubmit') {
                this.sendEmail();
            }else if((event?.target as HTMLInputElement).id === 'gameLoginFormForgotPasswordCancel') {
                this.closeGameForgotPassword();
                this.openGameLogin();
            }
        });

        this.gameRegisterElement = this.add.dom(middleX, -400).createFromCache(gameRegister);
        this.revealMenusAfterInit(this.gameRegisterElement, gameRegister);
        this.gameRegisterElement.addListener('click');
        this.gameRegisterElement.on('click',  (event:MouseEvent) => {
            event.preventDefault();
            if((event?.target as HTMLInputElement).id === 'gameRegisterFormSubmit') {
                this.register();
            }else if((event?.target as HTMLInputElement).id === 'gameRegisterFormCancel') {
                this.closeGameRegister();
                this.openGameLogin();
            }
        });

        this.gameShareElement = this.add.dom(middleX, -400).createFromCache(gameShare);
        this.revealMenusAfterInit(this.gameShareElement, gameShare);
        this.gameShareElement.addListener('click');
        this.gameShareElement.on('click',  (event:MouseEvent) => {
            event.preventDefault();
            if((event?.target as HTMLInputElement).id === 'gameShareFormSubmit') {
                this.copyLink();
            }else if((event?.target as HTMLInputElement).id === 'gameShareFormCancel') {
                this.closeGameShare();
            }
        });

        this.input.keyboard.on('keyup-TAB', () => {
            this.sideMenuOpened ? this.closeSideMenu() : this.openSideMenu();
        });
        this.menuButton = this.add.dom(0, 0).createFromCache(gameMenuIconKey);
        this.menuButton.addListener('click');
        this.menuButton.on('click', () => {
            this.sideMenuOpened ? this.closeSideMenu() : this.openSideMenu();
        });

        this.menuElement.addListener('click');
        this.menuElement.on('click', this.onMenuClick.bind(this));
    }

    private revealMenusAfterInit(menuElement: Phaser.GameObjects.DOMElement, rootDomId: string) {
        //Dom elements will appear inside the viewer screen when creating before being moved out of it, which create a flicker effect.
        //To prevent this, we put a 'hidden' attribute on the root element, we remove it only after the init is done.
        setTimeout(() => {
            (menuElement.getChildByID(rootDomId) as HTMLElement).hidden = false;
        }, 250);
    }

    public revealMenuIcon(): void {
        (this.menuButton.getChildByID('menuIcon') as HTMLElement).hidden = false
    }

    openSideMenu() {
        if (this.sideMenuOpened) return;
        this.sideMenuOpened = true;
        this.menuButton.getChildByID('openMenuButton').innerHTML = 'X';
        if (gameManager.getCurrentGameScene(this).connection && gameManager.getCurrentGameScene(this).connection.isAdmin()) {
            const adminSection = this.menuElement.getChildByID('adminConsoleSection') as HTMLElement;
            adminSection.hidden = false;
        }
        this.tweens.add({
            targets: this.menuElement,
            x: openedSideMenuX,
            duration: 500,
            ease: 'Power3'
        });
    }

    private closeSideMenu(): void {
        if (!this.sideMenuOpened) return;
        this.sideMenuOpened = false;
        this.closeGameQualityMenu();
        this.closeGameForgotPassword();
        this.closeGameLogin();
        this.closeGameRegister();
        this.closeGameShare();
        this.menuButton.getChildByID('openMenuButton').innerHTML = `<img src="/static/images/menu.svg">`;
        gameManager.getCurrentGameScene(this).ConsoleGlobalMessageManager.disabledMessageConsole();
        this.tweens.add({
            targets: this.menuElement,
            x: closedSideMenuX,
            duration: 500,
            ease: 'Power3'
        });
    }



    private openGameSettingsMenu(): void {
        if (this.settingsMenuOpened) {
            this.closeGameQualityMenu();
            return;
        }
        this.settingsMenuOpened = true;

        const gameQualitySelect = this.gameQualityMenuElement.getChildByID('select-game-quality') as HTMLInputElement;
        gameQualitySelect.value = ''+this.gameQualityValue;
        const videoQualitySelect = this.gameQualityMenuElement.getChildByID('select-video-quality') as HTMLInputElement;
        videoQualitySelect.value = ''+this.videoQualityValue;

        this.gameQualityMenuElement.addListener('click');
        this.gameQualityMenuElement.on('click',  (event:MouseEvent) => {
            event.preventDefault();
            if ((event?.target as HTMLInputElement).id === 'gameQualityFormSubmit') {
                const gameQualitySelect = this.gameQualityMenuElement.getChildByID('select-game-quality') as HTMLInputElement;
                const videoQualitySelect = this.gameQualityMenuElement.getChildByID('select-video-quality') as HTMLInputElement;
                this.saveSetting(parseInt(gameQualitySelect.value), parseInt(videoQualitySelect.value));
            } else if((event?.target as HTMLInputElement).id === 'gameQualityFormCancel') {
                this.closeGameQualityMenu();
            }
        });

        let middleY = (window.innerHeight / 3) - (257);
        if(middleY < 0){
            middleY = 0;
        }
        let middleX = (window.innerWidth / 3) - 298;
        if(middleX < 0){
            middleX = 0;
        }
        this.tweens.add({
            targets: this.gameQualityMenuElement,
            y: middleY,
            x: middleX,
            duration: 1000,
            ease: 'Power3'
        });
    }

    private closeGameQualityMenu(): void {
        if (!this.settingsMenuOpened) return;
        this.settingsMenuOpened = false;

        this.gameQualityMenuElement.removeListener('click');
        this.tweens.add({
            targets: this.gameQualityMenuElement,
            y: -400,
            duration: 1000,
            ease: 'Power3'
        });
    }

    private openGameLogin(): void{
        this.closeGameRegister();
        this.closeGameForgotPassword();
        if (this.gameLoginMenuOpened) {
            this.closeGameLogin();
            return;
        }
        this.gameLoginMenuOpened = true;

        let middleY = (window.innerHeight / 3) - (257);
        if(middleY < 0){
            middleY = 0;
        }
        let middleX = (window.innerWidth / 3) - 298;
        if(middleX < 0){
            middleX = 0;
        }
        this.tweens.add({
            targets: this.gameLoginElement,
            y: middleY,
            x: middleX,
            duration: 1000,
            ease: 'Power3'
        });
    }

    private closeGameLogin(): void{
        this.gameLoginMenuOpened = false;
        this.tweens.add({
            targets: this.gameLoginElement,
            y: -400,
            duration: 1000,
            ease: 'Power3'
        });
    }

    private openGameShare(): void{
        if (this.gameShareOpened) {
            this.closeGameShare();
            return;
        }

        const gameShareLink = this.gameShareElement.getChildByID('gameShareLink') as HTMLInputElement;
        gameShareLink.value = location.toString();

        this.gameShareOpened = true;

        let middleY = (window.innerHeight / 3) - (257);
        if(middleY < 0){
            middleY = 0;
        }
        let middleX = (window.innerWidth / 3) - 298;
        if(middleX < 0){
            middleX = 0;
        }
        this.tweens.add({
            targets: this.gameShareElement,
            y: middleY,
            x: middleX,
            duration: 1000,
            ease: 'Power3'
        });
    }

    private closeGameShare(): void{
        const gameShareInfo = this.gameShareElement.getChildByID('gameShareInfo') as HTMLParagraphElement;
        gameShareInfo.innerText = '';
        gameShareInfo.style.display = 'none';
        this.gameShareOpened = false;
        this.tweens.add({
            targets: this.gameShareElement,
            y: -400,
            duration: 1000,
            ease: 'Power3'
        });
    }

    private login(): void{
        let errorForm = false;
        const gameLoginEmail = this.gameLoginElement.getChildByID('gameLoginEmail') as HTMLInputElement;
        const gameLoginPassword = this.gameLoginElement.getChildByID('gameLoginPassword') as HTMLInputElement;
        const gameLoginError = this.gameLoginElement.getChildByID('gameLoginError') as HTMLInputElement;

        gameLoginError.innerText = '';
        gameLoginError.style.display = 'none';

        if (!gameLoginEmail.value || gameLoginEmail.value === '') {
            gameLoginEmail.style.borderColor = 'red';
            errorForm = true;
        }else{
            gameLoginEmail.style.borderColor = 'black';
        }

        if (!gameLoginPassword.value || gameLoginPassword.value === '') {
            gameLoginPassword.style.borderColor = 'red';
            errorForm = true;
        }else{
            gameLoginPassword.style.borderColor = 'black';
        }

        if(errorForm){return;}

        gameLoginError.innerText = 'Login or password incorrect';
        gameLoginError.style.display = 'block';
        //TODO login user in back
    }

    private sendEmail(){
        const gameForgotPasswordInfo = this.gameForgotPasswordElement.getChildByID('gameForgotPasswordInfo') as HTMLParagraphElement;
        gameForgotPasswordInfo.style.display = 'none';
        gameForgotPasswordInfo.innerText = '';

        const gameForgotPasswordError = this.gameForgotPasswordElement.getChildByID('gameForgotPasswordError') as HTMLParagraphElement;
        gameForgotPasswordError.style.display = 'none';
        gameForgotPasswordError.innerText = '';

        const gameLoginForgotPasswordEmail = this.gameForgotPasswordElement.getChildByID('gameLoginForgotPasswordEmail') as HTMLInputElement;
        gameLoginForgotPasswordEmail.style.borderColor = 'black';
        if(!gameLoginForgotPasswordEmail.value || gameLoginForgotPasswordEmail.value === ''){
            gameForgotPasswordError.innerText = 'The email field is required.';
            gameForgotPasswordError.style.display = 'block';
            gameLoginForgotPasswordEmail.style.borderColor = 'red';
            return;
        }
        //TODO send email
        gameForgotPasswordInfo.style.display = 'block';
        gameForgotPasswordInfo.innerText = 'We have emailed your password reset link!';
    }

    private register(){
        const gameRegisterName = this.gameRegisterElement.getChildByID('gameRegisterName') as HTMLInputElement;
        gameRegisterName.style.borderColor = 'black';
        const gameRegisterEmail = this.gameRegisterElement.getChildByID('gameRegisterEmail') as HTMLInputElement;
        gameRegisterEmail.style.borderColor = 'black';
        const gameRegisterPassword = this.gameRegisterElement.getChildByID('gameRegisterPassword') as HTMLInputElement;
        gameRegisterPassword.style.borderColor = 'black';
        const gameRegisterConfirmPassword = this.gameRegisterElement.getChildByID('gameRegisterConfirmPassword') as HTMLInputElement;
        gameRegisterConfirmPassword.style.borderColor = 'black';

        let hasError = false;
        if(!gameRegisterName.value || gameRegisterName.value === ''){
            gameRegisterName.style.borderColor = 'red';
            hasError = true;
        }
        if(!gameRegisterEmail.value || gameRegisterEmail.value === ''){
            gameRegisterEmail.style.borderColor = 'red';
            hasError = true;
        }
        if(!gameRegisterPassword.value || gameRegisterPassword.value === ''){
            gameRegisterPassword.style.borderColor = 'red';
            hasError = true;
        }
        if(
            !gameRegisterConfirmPassword.value
            || gameRegisterConfirmPassword.value === ''
            || gameRegisterConfirmPassword.value !== gameRegisterPassword.value
        ){
            gameRegisterConfirmPassword.style.borderColor = 'red';
            hasError = true;
        }

        const gameRegisterInfo = this.gameRegisterElement.getChildByID('gameRegisterInfo') as HTMLParagraphElement;
        gameRegisterInfo.style.display = 'none';
        gameRegisterInfo.innerText = '';

        const gameRegisterError = this.gameRegisterElement.getChildByID('gameRegisterError') as HTMLParagraphElement;
        gameRegisterError.style.display = 'none';
        gameRegisterError.innerText = '';

        if(hasError){return;}
    }

    private openGameForgotPassword(): void{
        let middleY = (window.innerHeight / 3) - (257);
        if(middleY < 0){
            middleY = 0;
        }
        let middleX = (window.innerWidth / 3) - 298;
        if(middleX < 0){
            middleX = 0;
        }
        this.tweens.add({
            targets: this.gameForgotPasswordElement,
            y: middleY,
            x: middleX,
            duration: 1000,
            ease: 'Power3'
        });
    }

    private closeGameForgotPassword(): void{
        this.tweens.add({
            targets: this.gameForgotPasswordElement,
            y: -400,
            duration: 1000,
            ease: 'Power3'
        });
    }

    private openGameRegister(): void{
        let middleY = (window.innerHeight / 3) - (257);
        if(middleY < 0){
            middleY = 0;
        }
        let middleX = (window.innerWidth / 3) - 298;
        if(middleX < 0){
            middleX = 0;
        }
        this.tweens.add({
            targets: this.gameRegisterElement,
            y: middleY,
            x: middleX,
            duration: 1000,
            ease: 'Power3'
        });
    }

    private closeGameRegister(): void{
        this.tweens.add({
            targets: this.gameRegisterElement,
            y: -400,
            duration: 1000,
            ease: 'Power3'
        });
    }

    private onMenuClick(event:MouseEvent) {
        event.preventDefault();

        switch ((event?.target as HTMLInputElement).id) {
            case 'changeNameButton':
                this.closeSideMenu();
                gameManager.leaveGame(this, LoginSceneName, new LoginScene());
                break;
            case 'sparkButton':
                this.gotToCreateMapPage();
                break;
            case 'changeSkinButton':
                this.closeSideMenu();
                gameManager.leaveGame(this, SelectCharacterSceneName, new SelectCharacterScene());
                break;
            case 'closeButton':
                this.closeSideMenu();
                break;
            case 'shareButton':
                this.openGameShare();
                break;
            case 'editGameSettingsButton':
                this.openGameSettingsMenu();
                break;
            case 'adminConsoleButton':
                gameManager.getCurrentGameScene(this).ConsoleGlobalMessageManager.activeMessageConsole();
                break;
            case 'gameLoginMenu':
                this.openGameLogin();
                break;
        }
    }

    private async copyLink() {
        await navigator.clipboard.writeText(location.toString());
        const gameShareInfo = this.gameShareElement.getChildByID('gameShareInfo') as HTMLParagraphElement;
        gameShareInfo.innerText = 'Link copied, you can share it now!';
        gameShareInfo.style.display = 'block';
    }

    private saveSetting(valueGame: number, valueVideo: number){
        if (valueGame !== this.gameQualityValue) {
            this.gameQualityValue = valueGame;
            localUserStore.setGameQualityValue(valueGame);
            window.location.reload();
        }
        if (valueVideo !== this.videoQualityValue) {
            this.videoQualityValue = valueVideo;
            localUserStore.setVideoQualityValue(valueVideo);
            mediaManager.updateCameraQuality(valueVideo);
        }
        this.closeGameQualityMenu();
    }

    private gotToCreateMapPage() {
        const sparkHost = 'https://'+window.location.host.replace('play.', '')+'/choose-map.html';
        window.open(sparkHost, '_blank');
    }
}
