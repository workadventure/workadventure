import {gameManager} from "../Game/GameManager";
import {TextField} from "../Components/TextField";
import Image = Phaser.GameObjects.Image;
import Rectangle = Phaser.GameObjects.Rectangle;
import {EnableCameraSceneName} from "./EnableCameraScene";
import {CustomizeSceneName} from "./CustomizeScene";
import {localUserStore} from "../../Connexion/LocalUserStore";
import {loadAllDefaultModels} from "../Entity/PlayerTexturesLoadingManager";
import {addLoader} from "../Components/Loader";
import {BodyResourceDescriptionInterface} from "../Entity/PlayerTextures";
import {AbstractCharacterScene} from "./AbstractCharacterScene";
import {areCharacterLayersValid} from "../../Connexion/LocalUser";
import {touchScreenManager} from "../../Touch/TouchScreenManager";
import {PinchManager} from "../UserInput/PinchManager";
import {MenuScene} from "../Menu/MenuScene";


//todo: put this constants in a dedicated file
export const SelectCharacterSceneName = "SelectCharacterScene";
enum LoginTextures {
    playButton = "play_button",
    icon = "icon",
    mainFont = "main_font",
    customizeButton = "customize_button",
    customizeButtonSelected = "customize_button_selected"
}

const selectCharacterKey = 'selectCharacterScene';

export class SelectCharacterScene extends AbstractCharacterScene {
    private readonly nbCharactersPerRow = 6;
    private selectedPlayer!: Phaser.Physics.Arcade.Sprite|null; // null if we are selecting the "customize" option
    private players: Array<Phaser.Physics.Arcade.Sprite> = new Array<Phaser.Physics.Arcade.Sprite>();
    private playerModels!: BodyResourceDescriptionInterface[];

    private selectCharacterSceneElement!: Phaser.GameObjects.DOMElement;
    private currentSelectUser = 0;

    constructor() {
        super({
            key: SelectCharacterSceneName,
        });
    }

    preload() {
        addLoader(this);

        this.load.html(selectCharacterKey, 'resources/html/selectCharacterScene.html');

        this.loadSelectSceneCharacters().then((bodyResourceDescriptions) => {
            bodyResourceDescriptions.forEach((bodyResourceDescription) => {
                this.playerModels.push(bodyResourceDescription);
            });
        })
        this.playerModels = loadAllDefaultModels(this.load);
        addLoader(this);
    }

    create() {
        const middleX = this.getMiddleX();
        this.selectCharacterSceneElement = this.add.dom(middleX, 0).createFromCache(selectCharacterKey);
        MenuScene.revealMenusAfterInit(this.selectCharacterSceneElement, selectCharacterKey);

        this.selectCharacterSceneElement.addListener('click');
        this.selectCharacterSceneElement.on('click',  (event:MouseEvent) => {
            event.preventDefault();
            if((event?.target as HTMLInputElement).id === 'selectCharacterButtonLeft') {
                this.moveToLeft();
            }else if((event?.target as HTMLInputElement).id === 'selectCharacterButtonRight') {
                this.moveToRight();
            }else if((event?.target as HTMLInputElement).id === 'selectCharacterSceneFormSubmit') {
                this.nextSceneToCameraScene();
            }else if((event?.target as HTMLInputElement).id === 'selectCharacterSceneFormCustomYourOwnSubmit') {
                this.nextSceneToCustomizeScene();
            }
        });

        if (touchScreenManager.supportTouchScreen) {
            new PinchManager(this);
        }

        /*create user*/
        this.createCurrentPlayer();
        const playerNumber = localUserStore.getPlayerCharacterIndex();

        this.input.keyboard.on('keyup-ENTER', () => {
            return this.nextSceneToCameraScene();
        });

        this.input.keyboard.on('keydown-RIGHT', () => {
            this.moveToRight();
        });
        this.input.keyboard.on('keydown-LEFT', () => {
            this.moveToLeft();
        });
    }

    private nextSceneToCameraScene(): void {
        if (this.selectedPlayer !== null && !areCharacterLayersValid([this.selectedPlayer.texture.key])) {
            return;
        }
        if(!this.selectedPlayer){
            return;
        }
        this.scene.stop(SelectCharacterSceneName);
        gameManager.setCharacterLayers([this.selectedPlayer.texture.key]);
        gameManager.tryResumingGame(this, EnableCameraSceneName);
        this.scene.remove(SelectCharacterSceneName);
    }

    private nextSceneToCustomizeScene(): void {
        if (this.selectedPlayer !== null && !areCharacterLayersValid([this.selectedPlayer.texture.key])) {
            return;
        }
        this.scene.sleep(SelectCharacterSceneName);
        this.scene.run(CustomizeSceneName);
    }

    createCurrentPlayer(): void {
        for (let i = 0; i <this.playerModels.length; i++) {
            const playerResource = this.playerModels[i];

            const [middleX, middleY] = this.getCharacterPosition();
            const player = this.physics.add.sprite(middleX, middleY, playerResource.name, 0);
            this.setUpPlayer(player, i);
            this.anims.create({
                key: playerResource.name,
                frames: this.anims.generateFrameNumbers(playerResource.name, {start: 0, end: 2,}),
                frameRate: 10,
                repeat: -1
            });
            player.setInteractive().on("pointerdown", () => {
                if(this.currentSelectUser === i){
                    return;
                }
                this.currentSelectUser = i;
                this.moveUser();
            });
            this.players.push(player);
        }

        this.selectedPlayer = this.players[this.currentSelectUser];
        this.selectedPlayer.play(this.playerModels[this.currentSelectUser].name);
    }

    private moveUser(){
        for(let i = 0; i < this.players.length; i++){
            const player = this.players[i];
            this.setUpPlayer(player, i);
        }
        this.updateSelectedPlayer();
    }

    private moveToLeft(){
        if(this.currentSelectUser === 0){
            return;
        }
        this.currentSelectUser -= 1;
        this.moveUser();
    }

    private moveToRight(){
        if(this.currentSelectUser === (this.players.length - 1)){
            return;
        }
        this.currentSelectUser += 1;
        this.moveUser();
    }

    private defineSetupPlayer(numero: number){
        const deltaX = 30;
        let [playerX, playerY] = this.getCharacterPosition();
        let playerVisible = true;
        let playerScale = 1.5;
        let playserOpactity = 1;
        if( this.currentSelectUser !== numero ){
            playerVisible = false;
        }
        if( numero === (this.currentSelectUser + 1) ){
            playerX += deltaX;
            playerScale = 0.8;
            playserOpactity = 0.6;
            playerVisible = true;
        }
        if( numero === (this.currentSelectUser + 2) ){
            playerX += (deltaX * 2);
            playerScale = 0.8;
            playserOpactity = 0.6;
            playerVisible = true;
        }
        if( numero === (this.currentSelectUser - 1) ){
            playerX -= deltaX;
            playerScale = 0.8;
            playserOpactity = 0.6;
            playerVisible = true;
        }
        if( numero === (this.currentSelectUser - 2) ){
            playerX -= (deltaX * 2);
            playerScale = 0.8;
            playserOpactity = 0.6;
            playerVisible = true;
        }
        return {playerX, playerY, playerScale, playserOpactity, playerVisible}
    }
    
    private setUpPlayer(player: Phaser.Physics.Arcade.Sprite, numero: number){

        const {playerX, playerY, playerScale, playserOpactity, playerVisible} = this.defineSetupPlayer(numero);
        player.setBounce(0.2);
        player.setCollideWorldBounds(true);
        player.setVisible( playerVisible );
        player.setScale(playerScale, playerScale);
        player.setAlpha(playserOpactity);
        player.setX(playerX);
        player.setY(playerY);
    }

    /**
     * Returns pixel position by on column and row number
     */
    private getCharacterPosition(): [number, number] {
        return [
            this.game.renderer.width / 2,
            this.game.renderer.height / 3
        ];
    }

    private updateSelectedPlayer(): void {
        this.selectedPlayer?.anims.pause();
        const player = this.players[this.currentSelectUser];
        player.play(this.playerModels[this.currentSelectUser].name);
        this.selectedPlayer = player;
        localUserStore.setPlayerCharacterIndex(this.currentSelectUser);
    }

    update(time: number, delta: number): void {
        const middleX = this.getMiddleX();
        this.tweens.add({
            targets: this.selectCharacterSceneElement,
            x: middleX,
            duration: 1000,
            ease: 'Power3'
        });
    }

    public onResize(ev: UIEvent): void {
        //move position of user
        this.moveUser();

        const middleX = this.getMiddleX();
        this.tweens.add({
            targets: this.selectCharacterSceneElement,
            x: middleX,
            duration: 1000,
            ease: 'Power3'
        });
    }

    private getMiddleX() : number{
        return (this.game.renderer.width / 2) -  
        (
            this.selectCharacterSceneElement
            && this.selectCharacterSceneElement.node
            && this.selectCharacterSceneElement.node.getBoundingClientRect().width > 0
            ? (this.selectCharacterSceneElement.node.getBoundingClientRect().width / 4)
            : 150
        );
    }
}
