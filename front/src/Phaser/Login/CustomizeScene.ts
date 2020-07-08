import {COLOR_RESOURCES,ColorResourceDescriptionInterface} from "../Entity/color_character";
import {EnableCameraSceneName} from "./EnableCameraScene";
import {SelectCharacterSceneInitDataInterface, SelectCharacterSceneName} from "./SelectCharacterScene";
import {gameManager} from "../Game/GameManager";
import {TextField} from "../Components/TextField";
import {ClickButton} from "../Components/ClickButton";
import Image = Phaser.GameObjects.Image;
import {cypressAsserter} from "../../Cypress/CypressAsserter";
import Rectangle = Phaser.GameObjects.Rectangle;

export const CustomizeSceneName = "CustomizeScene";

enum CustomizeTextures{
    icon = "icon",
    arrowRight = "arrow_right",
    mainFont = "main_font",
}

export interface CustomizeSceneInitDataInterface {
    name: string
}

export class CustomizeScene extends Phaser.Scene {

    private centerRectangle : Rectangle;

    private arrowRight: Image;
    private arrowLeft: Image;
    private logo: Image;

    private textField: TextField;
    private loginName : String;

    private selectedCharacterColor: Phaser.Physics.Arcade.Sprite;
    private selectedCharacterColorPosX = 0;

    private colors : Array<Phaser.Physics.Arcade.Sprite> = new Array<Phaser.Physics.Arcade.Sprite>();

    constructor() {
        super({
            key: CustomizeSceneName
        });
    }

    init({ name }: CustomizeSceneInitDataInterface) {
        this.loginName = name;
    }

    preload(){
        console.error('coucou')
        this.load.image(CustomizeTextures.arrowRight, "resources/objects/arrow_right.png");
        this.load.image(CustomizeTextures.icon, "resources/logos/tcm_full.png");
        this.load.bitmapFont(CustomizeTextures.mainFont, 'resources/fonts/arcade.png', 'resources/fonts/arcade.xml');

        //add characters color png
        COLOR_RESOURCES.forEach((ColorResource : ColorResourceDescriptionInterface) => {
            this.load.spritesheet(
                ColorResource.name,
                ColorResource.img
            );
        });


    }

    create(){

        this.textField = new TextField(this, this.game.renderer.width / 2, 50, 'Select the color of your character..');
        this.textField.setOrigin(0.5).setCenterAlign();
        this.textField.setVisible(true);

        this.logo = new Image(this, this.game.renderer.width - 30, this.game.renderer.height - 20, CustomizeTextures.icon);
        this.add.existing(this.logo);

        this.arrowRight = new Image(this, this.game.renderer.width - 50, this.game.renderer.height - 30, CustomizeTextures.arrowRight);
        this.arrowRight.setVisible(true);
        this.add.existing(this.arrowRight);

        this.arrowLeft = new Image(this, this.game.renderer.width - 380, this.game.renderer.height - 30, CustomizeTextures.arrowRight);
        this.arrowLeft.flipX = true;
        this.arrowLeft.setVisible(true);
        this.add.existing(this.arrowLeft)

        this.centerRectangle = this.add.rectangle(200, 150, 32, 60).setStrokeStyle(2, 0xFFFFFF);
    }
    update(time: number, delta: number): void {
        super.update(time, delta);
    }
}
