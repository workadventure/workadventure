import {gameManager} from "../Game/GameManager";
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
import { SelectCharacterMobileScene } from "./SelectCharacterMobileScene";

//todo: put this constants in a dedicated file
export const SelectCharacterSceneName = "SelectCharacterScene";

const selectCharacterKey = 'selectCharacterScene';

export class SelectCharacterScene extends AbstractCharacterScene {
    protected readonly nbCharactersPerRow = 6;
    protected selectedPlayer!: Phaser.Physics.Arcade.Sprite|null; // null if we are selecting the "customize" option
    protected players: Array<Phaser.Physics.Arcade.Sprite> = new Array<Phaser.Physics.Arcade.Sprite>();
    protected playerModels!: BodyResourceDescriptionInterface[];

    protected selectedRectangle!: Rectangle;

    protected selectCharacterSceneElement!: Phaser.GameObjects.DOMElement;
    protected currentSelectUser = 0;

    constructor() {
        super({
            key: SelectCharacterSceneName,
        });
    }

    preload() {
        this.load.html(selectCharacterKey, 'resources/html/selectCharacterScene.html');

        this.loadSelectSceneCharacters().then((bodyResourceDescriptions) => {
            bodyResourceDescriptions.forEach((bodyResourceDescription) => {
                this.playerModels.push(bodyResourceDescription);
            });
        })
        this.playerModels = loadAllDefaultModels(this.load);

        //this function must stay at the end of preload function
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

        const rectangleXStart = this.game.renderer.width / 2 - (this.nbCharactersPerRow / 2) * 32 + 16;
        this.selectedRectangle = this.add.rectangle(rectangleXStart, 90, 32, 32).setStrokeStyle(2, 0xFFFFFF);
        this.selectedRectangle.setDepth(2);

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
        this.input.keyboard.on('keydown-UP', () => {
            this.moveToUp();
        });
        this.input.keyboard.on('keydown-DOWN', () => {
            this.moveToDown();
        });
    }

    protected nextSceneToCameraScene(): void {
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

    protected nextSceneToCustomizeScene(): void {
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
                frames: this.anims.generateFrameNumbers(playerResource.name, {start: 0, end: 11}),
                frameRate: 8,
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

    protected moveUser(){
        for(let i = 0; i < this.players.length; i++){
            const player = this.players[i];
            this.setUpPlayer(player, i);
        }
        this.updateSelectedPlayer();
    }

    protected moveToLeft(){
        if(this.currentSelectUser === 0){
            return;
        }
        this.currentSelectUser -= 1;
        this.moveUser();
    }

    protected moveToRight(){
        if(this.currentSelectUser === (this.players.length - 1)){
            return;
        }
        this.currentSelectUser += 1;
        this.moveUser();
    }

    protected moveToUp(){
        if(this.currentSelectUser < this.nbCharactersPerRow){
            return;
        }
        this.currentSelectUser -= this.nbCharactersPerRow;
        this.moveUser();
    }

    protected moveToDown(){
        if((this.currentSelectUser + this.nbCharactersPerRow) > (this.players.length - 1)){
            return;
        }
        this.currentSelectUser += this.nbCharactersPerRow;
        this.moveUser();
    }

    protected defineSetupPlayer(numero: number){
        const deltaX = 32;
        const deltaY = 32;
        let [playerX, playerY] = this.getCharacterPosition(); // player X and player y are middle of the

        playerX = ( (playerX - (deltaX * 2.5)) + ((deltaX) * (numero % this.nbCharactersPerRow)) ); // calcul position on line users
        playerY = ( (playerY - (deltaY * 2)) + ((deltaY) * ( Math.floor(numero / this.nbCharactersPerRow) )) ); // calcul position on column users

        const playerVisible = true;
        const playerScale = 1;
        const playserOpactity = 1;

        // if selected
        if( numero === this.currentSelectUser ){
            this.selectedRectangle.setX(playerX);
            this.selectedRectangle.setY(playerY);
        }

        return {playerX, playerY, playerScale, playserOpactity, playerVisible}
    }

    protected setUpPlayer(player: Phaser.Physics.Arcade.Sprite, numero: number){

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
    protected getCharacterPosition(): [number, number] {
        return [
            this.game.renderer.width / 2,
            this.game.renderer.height / 2.5
        ];
    }

    protected updateSelectedPlayer(): void {
        this.selectedPlayer?.anims.pause(this.selectedPlayer?.anims.currentAnim.frames[0]);
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

    protected getMiddleX() : number{
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
