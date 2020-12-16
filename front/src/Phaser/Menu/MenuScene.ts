import {LoginScene, LoginSceneName} from "../Login/LoginScene";
import {SelectCharacterScene, SelectCharacterSceneName} from "../Login/SelectCharacterScene";
import {gameManager} from "../Game/GameManager";
import {localUserStore} from "../../Connexion/LocalUserStore";
import {mediaManager} from "../../WebRtc/MediaManager";

export const MenuSceneName = 'MenuScene';
const gameMenuKey = 'gameMenu';
const gameMenuIconKey = 'gameMenuIcon';
const gameSettingsMenuKey = 'gameSettingsMenu';

const closedSideMenuX = -200;
const openedSideMenuX = 0;

/**
 * The scene that manages the game menu, rendered using a DOM element.
 */
export class MenuScene extends Phaser.Scene {
    private menuElement!: Phaser.GameObjects.DOMElement;
    private gameQualityMenuElement!: Phaser.GameObjects.DOMElement;
    private sideMenuOpened = false;
    private settingsMenuOpened = false;
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
    }

    create() {
        this.menuElement = this.add.dom(closedSideMenuX, 30).createFromCache(gameMenuKey);
        this.menuElement.setOrigin(0);
        this.revealMenusAfterInit(this.menuElement, 'gameMenu');

        this.gameQualityMenuElement = this.add.dom(300, -400).createFromCache(gameSettingsMenuKey);
        this.revealMenusAfterInit(this.gameQualityMenuElement, 'gameQuality');
        
        this.input.keyboard.on('keyup-TAB', () => {
            this.sideMenuOpened ? this.closeSideMenu() : this.openSideMenu();
        });
        this.menuButton = this.add.dom(0, 0).createFromCache(gameMenuIconKey);
        this.menuButton.addListener('click');
        this.menuButton.on('click', () => {
            this.sideMenuOpened ? this.closeSideMenu() : this.openSideMenu();
        });
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
        this.menuButton.getChildByID('openMenuButton').innerHTML = 'Close'
        if (gameManager.getCurrentGameScene(this).connection.isAdmin()) {
            const adminSection = this.menuElement.getChildByID('adminConsoleSection') as HTMLElement;
            adminSection.hidden = false;
        }
        this.menuElement.addListener('click');
        this.menuElement.on('click', this.onMenuClick.bind(this));
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
        this.closeGameQualityMenu()
        this.menuButton.getChildByID('openMenuButton').innerHTML = 'Menu'
        this.tweens.add({
            targets: this.menuElement,
            x: closedSideMenuX,
            duration: 500,
            ease: 'Power3'
        });
        this.menuElement.removeListener('click');
    }



    private openGameSettingsMenu(): void {
        if (this.settingsMenuOpened) return;
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

        this.tweens.add({
            targets: this.gameQualityMenuElement,
            y: 100,
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
    
    
    
    private onMenuClick(event:MouseEvent) {
        event.preventDefault();
    
        switch ((event?.target as HTMLInputElement).id) {
            case 'changeNameButton':
                this.closeSideMenu();
                this.closeGameQualityMenu();
                gameManager.leaveGame(this, LoginSceneName, new LoginScene());
                break;
            case 'sparkButton':
                this.goToSpark();
                break;
            case 'changeSkinButton':
                this.closeSideMenu();
                gameManager.leaveGame(this, SelectCharacterSceneName, new SelectCharacterScene());
                break;
            case 'closeButton':
                this.closeSideMenu();
                break;
            case 'shareButton':
                this.shareUrl();
                break;
            case 'editGameSettingsButton':
                this.openGameSettingsMenu();
                break;
            case 'adminConsoleButton':
                gameManager.getCurrentGameScene(this).ConsoleGlobalMessageManager.activeMessageConsole();
                break;
        }
    }
    
    private async shareUrl() {
        await navigator.clipboard.writeText(location.toString());
        alert('URL was copy to your clipboard!');
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

    private goToSpark() {
        const sparkHost = 'https://'+window.location.host.replace('play.', 'admin.')+'/register';
        window.location.assign(sparkHost);
    }
}