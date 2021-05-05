import Image = Phaser.GameObjects.Image;
import Rectangle = Phaser.GameObjects.Rectangle;
import { addLoader } from "../Components/Loader";
import { gameManager} from "../Game/GameManager";
import { ResizableScene } from "./ResizableScene";
import { EnableCameraSceneName } from "./EnableCameraScene";
import { localUserStore } from "../../Connexion/LocalUserStore";
import { CompanionResourceDescriptionInterface } from "../Companion/CompanionTextures";
import { getAllCompanionResources } from "../Companion/CompanionTexturesLoadingManager";
import {touchScreenManager} from "../../Touch/TouchScreenManager";
import {PinchManager} from "../UserInput/PinchManager";
import { MenuScene } from "../Menu/MenuScene";
import { RESOLUTION } from "../../Enum/EnvironmentVariable";

export const SelectCompanionSceneName = "SelectCompanionScene";

const selectCompanionSceneKey = 'selectCompanionScene';

export class SelectCompanionScene extends ResizableScene {
    private selectedCompanion!: Phaser.Physics.Arcade.Sprite;
    private companions: Array<Phaser.Physics.Arcade.Sprite> = new Array<Phaser.Physics.Arcade.Sprite>();
    private companionModels: Array<CompanionResourceDescriptionInterface> = [];

    private selectCompanionSceneElement!: Phaser.GameObjects.DOMElement;
    private currentCompanion = 0;

    constructor() {
        super({
            key: SelectCompanionSceneName
        });
    }

    preload() {
        this.load.html(selectCompanionSceneKey, 'resources/html/SelectCompanionScene.html');

        getAllCompanionResources(this.load).forEach(model => {
            this.companionModels.push(model);
        });

        //this function must stay at the end of preload function
        addLoader(this);
    }

    create() {

        const middleX = this.getMiddleX();
        this.selectCompanionSceneElement = this.add.dom(middleX, 0).createFromCache(selectCompanionSceneKey);
        MenuScene.revealMenusAfterInit(this.selectCompanionSceneElement, selectCompanionSceneKey);

        this.selectCompanionSceneElement.addListener('click');
        this.selectCompanionSceneElement.on('click',  (event:MouseEvent) => {
            event.preventDefault();
            if((event?.target as HTMLInputElement).id === 'selectCharacterButtonLeft') {
                this.moveToLeft();
            }else if((event?.target as HTMLInputElement).id === 'selectCharacterButtonRight') {
                this.moveToRight();
            }else if((event?.target as HTMLInputElement).id === 'selectCompanionSceneFormSubmit') {
                this.nextScene();
            }else if((event?.target as HTMLInputElement).id === 'selectCompanionSceneFormBack') {
                this._nextScene();
            }
        });

        if (touchScreenManager.supportTouchScreen) {
            new PinchManager(this);
        }

        // input events
        this.input.keyboard.on('keyup-ENTER', this.nextScene.bind(this));

        this.input.keyboard.on('keydown-RIGHT', this.moveToRight.bind(this));
        this.input.keyboard.on('keydown-LEFT', this.moveToLeft.bind(this));

        if(localUserStore.getCompanion()){
            const companionIndex = this.companionModels.findIndex((companion) => companion.name === localUserStore.getCompanion());
            if(companionIndex > -1 || companionIndex < this.companions.length){
                this.currentCompanion = companionIndex;
                this.selectedCompanion = this.companions[companionIndex];
            }
        }

        localUserStore.setCompanion(null);
        gameManager.setCompanion(null);

        this.createCurrentCompanion();
        this.updateSelectedCompanion();
    }

    update(time: number, delta: number): void {
        const middleX = this.getMiddleX();
        this.tweens.add({
            targets: this.selectCompanionSceneElement,
            x: middleX,
            duration: 1000,
            ease: 'Power3'
        });
    }

    private nextScene(): void {
        localUserStore.setCompanion(this.companionModels[this.currentCompanion].name);
        gameManager.setCompanion(this.companionModels[this.currentCompanion].name);

        this._nextScene();
    }

    private _nextScene(){
        // next scene
        this.scene.stop(SelectCompanionSceneName);
        gameManager.tryResumingGame(this, EnableCameraSceneName);
        this.scene.remove(SelectCompanionSceneName);
    }

    private createCurrentCompanion(): void {
        for (let i = 0; i < this.companionModels.length; i++) {
            const companionResource = this.companionModels[i]
            const [middleX, middleY] = this.getCompanionPosition();
            const companion = this.physics.add.sprite(middleX, middleY, companionResource.name, 0);
            this.setUpCompanion(companion, i);
            this.anims.create({
                key: companionResource.name,
                frames: this.anims.generateFrameNumbers(companionResource.name, {start: 0, end: 2,}),
                frameRate: 10,
                repeat: -1
            });

            companion.setInteractive().on("pointerdown", () => {
                this.currentCompanion = i;
                this.moveCompanion();
            });

            this.companions.push(companion);
        }
        this.selectedCompanion = this.companions[this.currentCompanion];
    }

    public onResize(ev: UIEvent): void {
        this.moveCompanion();

        const middleX = this.getMiddleX();
        this.tweens.add({
            targets: this.selectCompanionSceneElement,
            x: middleX,
            duration: 1000,
            ease: 'Power3'
        });
    }

    private updateSelectedCompanion(): void {
        this.selectedCompanion?.anims.pause();
        const companion = this.companions[this.currentCompanion];
        companion.play(this.companionModels[this.currentCompanion].name);
        this.selectedCompanion = companion;
    }

    private moveCompanion(){
        for(let i = 0; i < this.companions.length; i++){
            const companion = this.companions[i];
            this.setUpCompanion(companion, i);
        }
        this.updateSelectedCompanion();
    }

    private moveToLeft(){
        if(this.currentCompanion === 0){
            return;
        }
        this.currentCompanion -= 1;
        this.moveCompanion();
    }

    private moveToRight(){
        if(this.currentCompanion === (this.companions.length - 1)){
            return;
        }
        this.currentCompanion += 1;
        this.moveCompanion();
    }

    private defineSetupCompanion(numero: number){
        const deltaX = 30;
        const deltaY = 2;
        let [companionX, companionY] = this.getCompanionPosition();
        let companionVisible = true;
        let companionScale = 1.5;
        let companionOpactity = 1;
        if( this.currentCompanion !== numero ){
            companionVisible = false;
        }
        if( numero === (this.currentCompanion + 1) ){
            companionY -= deltaY;
            companionX += deltaX;
            companionScale = 0.8;
            companionOpactity = 0.6;
            companionVisible = true;
        }
        if( numero === (this.currentCompanion + 2) ){
            companionY -= deltaY;
            companionX += (deltaX * 2);
            companionScale = 0.8;
            companionOpactity = 0.6;
            companionVisible = true;
        }
        if( numero === (this.currentCompanion - 1) ){
            companionY -= deltaY;
            companionX -= deltaX;
            companionScale = 0.8;
            companionOpactity = 0.6;
            companionVisible = true;
        }
        if( numero === (this.currentCompanion - 2) ){
            companionY -= deltaY;
            companionX -= (deltaX * 2);
            companionScale = 0.8;
            companionOpactity = 0.6;
            companionVisible = true;
        }
        return {companionX, companionY, companionScale, companionOpactity, companionVisible}
    }

    /**
     * Returns pixel position by on column and row number
     */
    private getCompanionPosition(): [number, number] {
        return [
            this.game.renderer.width / 2,
            this.game.renderer.height / 3
        ];
    }

    private setUpCompanion(companion: Phaser.Physics.Arcade.Sprite, numero: number){

        const {companionX, companionY, companionScale, companionOpactity, companionVisible} = this.defineSetupCompanion(numero);
        companion.setBounce(0.2);
        companion.setCollideWorldBounds(true);
        companion.setVisible( companionVisible );
        companion.setScale(companionScale, companionScale);
        companion.setAlpha(companionOpactity);
        companion.setX(companionX);
        companion.setY(companionY);
    }

    private getMiddleX() : number{
        return (this.game.renderer.width / RESOLUTION) -
        (
            this.selectCompanionSceneElement
            && this.selectCompanionSceneElement.node
            && this.selectCompanionSceneElement.node.getBoundingClientRect().width > 0
            ? (this.selectCompanionSceneElement.node.getBoundingClientRect().width / (2*RESOLUTION))
            : 150
        );
    }
}
