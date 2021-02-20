import {EnableCameraSceneName} from "./EnableCameraScene";
import {TextField} from "../Components/TextField";
import Image = Phaser.GameObjects.Image;
import Rectangle = Phaser.GameObjects.Rectangle;
import {loadAllLayers, loadCustomTexture} from "../Entity/PlayerTexturesLoadingManager";
import Sprite = Phaser.GameObjects.Sprite;
import Container = Phaser.GameObjects.Container;
import {gameManager} from "../Game/GameManager";
import {ResizableScene} from "./ResizableScene";
import {localUserStore} from "../../Connexion/LocalUserStore";
import {addLoader} from "../Components/Loader";
import {BodyResourceDescriptionInterface} from "../Entity/PlayerTextures";
import {AbstractCharacterScene} from "./AbstractCharacterScene";

export const CustomizeSceneName = "CustomizeScene";

enum CustomizeTextures{
    icon = "icon",
    arrowRight = "arrow_right",
    mainFont = "main_font",
    arrowUp = "arrow_up",
}

export class CustomizeScene extends AbstractCharacterScene {

    private textField!: TextField;
    private enterField!: TextField;

    private arrowRight!: Image;
    private arrowLeft!: Image;

    private arrowDown!: Image;
    private arrowUp!: Image;

    private Rectangle!: Rectangle;

    private mobileTapUP!: Rectangle;
    private mobileTapDOWN!: Rectangle;
    private mobileTapLEFT!: Rectangle;
    private mobileTapRIGHT!: Rectangle;

    private mobileTapENTER!: Rectangle;

    private logo!: Image;

    private selectedLayers: number[] = [0];
    private containersRow: Container[][] = [];
    private activeRow:number = 0;
    private layers: BodyResourceDescriptionInterface[][] = [];

    constructor() {
        super({
            key: CustomizeSceneName
        });
    }

    preload() {
        addLoader(this);

        this.layers = loadAllLayers(this.load);
        this.loadCustomSceneSelectCharacters().then((bodyResourceDescriptions) => {
            bodyResourceDescriptions.forEach((bodyResourceDescription) => {
                if(!bodyResourceDescription.level){
                    throw 'Texture level is null';
                }
                this.layers[bodyResourceDescription.level].unshift(bodyResourceDescription);
            });
        });

        this.load.image(CustomizeTextures.arrowRight, "resources/objects/arrow_right.png");
        this.load.image(CustomizeTextures.icon, "resources/logos/tcm_full.png");
        this.load.image(CustomizeTextures.arrowUp, "resources/objects/arrow_up.png");
        this.load.bitmapFont(CustomizeTextures.mainFont, 'resources/fonts/arcade.png', 'resources/fonts/arcade.xml');
    }

    create() {
        this.textField = new TextField(this, this.game.renderer.width / 2, 30, 'Customize your own Avatar!');

        this.enterField = new TextField(this, this.game.renderer.width / 2, 60, 'Start the game by pressing ENTER\n\n or touching the center rectangle');

        this.logo = new Image(this, this.game.renderer.width - 30, this.game.renderer.height - 20, CustomizeTextures.icon);
        this.add.existing(this.logo);


        this.arrowRight = new Image(this, this.game.renderer.width*0.9, this.game.renderer.height/2, CustomizeTextures.arrowRight);
        this.add.existing(this.arrowRight);
        this.mobileTapRIGHT = this.add
          .rectangle(
            this.game.renderer.width*0.9,
            this.game.renderer.height/2,
            32,
            32,
          )
          .setInteractive()
          .on("pointerdown", () => {
            this.moveCursorHorizontally(1);
          });

        this.arrowLeft = new Image(this, this.game.renderer.width/9, this.game.renderer.height/2, CustomizeTextures.arrowRight);
        this.arrowLeft.flipX = true;
        this.add.existing(this.arrowLeft);
        this.mobileTapLEFT = this.add
          .rectangle(
            this.game.renderer.width/9,
            this.game.renderer.height/2,
            32,
            32,
          )
          .setInteractive()
          .on("pointerdown", () => {
            this.moveCursorHorizontally(-1);
          });

        this.Rectangle = this.add.rectangle(this.cameras.main.worldView.x + this.cameras.main.width / 2, this.cameras.main.worldView.y + this.cameras.main.height / 2, 32, 33)
        this.Rectangle.setStrokeStyle(2, 0xFFFFFF);
        this.add.existing(this.Rectangle);
        this.mobileTapENTER = this.add
          .rectangle(
            this.cameras.main.worldView.x + this.cameras.main.width / 2,
            this.cameras.main.worldView.y + this.cameras.main.height / 2,
            32,
            32,
          )
          .setInteractive()
          .on("pointerdown", () => {
              const layers: string[] = [];
              let i = 0;
              for (const layerItem of this.selectedLayers) {
                  if (layerItem !== undefined) {
                      layers.push(this.layers[i][layerItem].name);
                  }
                  i++;
              }

              gameManager.setCharacterLayers(layers);

              this.scene.sleep(CustomizeSceneName);
              gameManager.tryResumingGame(this, EnableCameraSceneName);
          });

        this.arrowDown = new Image(this, this.game.renderer.width - 30, 100, CustomizeTextures.arrowUp);
        this.arrowDown.flipY = true;
        this.add.existing(this.arrowDown);
        this.mobileTapDOWN = this.add
          .rectangle(
            this.game.renderer.width - 30,
            100,
            32,
            32,
          )
          .setInteractive()
          .on("pointerdown", () => {
            this.moveCursorVertically(1);
          });

        this.arrowUp = new Image(this, this.game.renderer.width - 30, 60, CustomizeTextures.arrowUp);
        this.add.existing(this.arrowUp);
        this.mobileTapUP = this.add
          .rectangle(
            this.game.renderer.width - 30,
            60,
            32,
            32,
          )
          .setInteractive()
          .on("pointerdown", () => {
            this.moveCursorVertically(-1);
          });

        this.createCustomizeLayer(0, 0, 0);
        this.createCustomizeLayer(0, 0, 1);
        this.createCustomizeLayer(0, 0, 2);
        this.createCustomizeLayer(0, 0, 3);
        this.createCustomizeLayer(0, 0, 4);
        this.createCustomizeLayer(0, 0, 5);

        this.moveLayers();
        this.input.keyboard.on('keyup-ENTER', () => {
            const layers: string[] = [];
            let i = 0;
            for (const layerItem of this.selectedLayers) {
                if (layerItem !== undefined) {
                    layers.push(this.layers[i][layerItem].name);
                }
                i++;
            }

            gameManager.setCharacterLayers(layers);

            this.scene.sleep(CustomizeSceneName);
            gameManager.tryResumingGame(this, EnableCameraSceneName);
        });

        this.input.keyboard.on('keyup-RIGHT', () => this.moveCursorHorizontally(1));
        this.input.keyboard.on('keyup-LEFT', () => this.moveCursorHorizontally(-1));
        this.input.keyboard.on('keyup-DOWN', () => this.moveCursorVertically(1));
        this.input.keyboard.on('keyup-UP', () => this.moveCursorVertically(-1));

        const customCursorPosition = localUserStore.getCustomCursorPosition();
        if (customCursorPosition) {
            this.activeRow = customCursorPosition.activeRow;
            this.selectedLayers = customCursorPosition.selectedLayers;
            this.moveLayers();
            this.updateSelectedLayer();
        }
    }

    private moveCursorHorizontally(index: number): void {
        this.selectedLayers[this.activeRow] += index;
        if (this.selectedLayers[this.activeRow] < 0) {
            this.selectedLayers[this.activeRow] = 0
        } else if(this.selectedLayers[this.activeRow] > this.layers[this.activeRow].length - 1) {
            this.selectedLayers[this.activeRow] = this.layers[this.activeRow].length - 1
        }
        this.moveLayers();
        this.updateSelectedLayer();
        this.saveInLocalStorage();
    }

    private moveCursorVertically(index:number): void {
        this.activeRow += index;
        if (this.activeRow < 0) {
            this.activeRow = 0
        } else if (this.activeRow > this.layers.length - 1) {
            this.activeRow = this.layers.length - 1
        }
        this.moveLayers();
        this.saveInLocalStorage();
    }

    private saveInLocalStorage() {
        localUserStore.setCustomCursorPosition(this.activeRow, this.selectedLayers);
    }

    update(time: number, delta: number): void {
        super.update(time, delta);
        this.enterField.setVisible(!!(Math.floor(time / 500) % 2));
    }

    /**
     * @param x, the layer's vertical position
     * @param y, the layer's horizontal position
     * @param layerNumber, index of the this.layers array
     * create the layer and display it on the scene
     */
    private createCustomizeLayer(x: number, y: number, layerNumber: number): void {
        this.containersRow[layerNumber] = [];
        this.selectedLayers[layerNumber] = 0;
        let alpha = 0;
        let layerPosX = 0;
        for (let i = 0; i < this.layers[layerNumber].length; i++) {
            const container = this.generateCharacter(300 + x + layerPosX, y, layerNumber, i);

            this.containersRow[layerNumber][i] = container;
            this.add.existing(container);
            layerPosX += 30;
            alpha += 0.1;
        }
    }

    /**
     * Generates a character from the current selected items BUT replaces
     * one layer item with an item we pass in parameter.
     *
     * Current selected items are fetched from this.selectedLayers
     *
     * @param x,
     * @param y,
     * @param layerNumber, The selected layer number (0 for body...)
     * @param selectedItem, The number of the item select (0 for black body...)
     */
    private generateCharacter(x: number, y: number, layerNumber: number, selectedItem: number) {
        return new Container(this, x, y,this.getContainerChildren(layerNumber,selectedItem));
    }

    private getContainerChildren(layerNumber: number, selectedItem: number): Array<Sprite> {
        const children: Array<Sprite> = new Array<Sprite>();
        for (let j = 0; j <= layerNumber; j++) {
            if (j === layerNumber) {
                children.push(this.generateLayers(0, 0, this.layers[j][selectedItem].name));
            } else {
                const layer = this.selectedLayers[j];
                if (layer === undefined) {
                    continue;
                }
                children.push(this.generateLayers(0, 0, this.layers[j][layer].name));
            }
         }
        return children;
    }

    /**
     * Move the layer left, right, up and down and update the selected layer
     */
    private moveLayers(): void {
        const screenCenterX = this.cameras.main.worldView.x + this.cameras.main.width / 2;
        const screenCenterY = this.cameras.main.worldView.y + this.cameras.main.height / 2;
        const screenWidth = this.game.renderer.width;
        const screenHeight = this.game.renderer.height;
        for (let i = 0; i < this.containersRow.length; i++) {
            for (let j = 0; j < this.containersRow[i].length; j++) {
                    let selectedX = this.selectedLayers[i];
                    if (selectedX === undefined) {
                        selectedX = 0;
                    }
                    this.containersRow[i][j].x = screenCenterX + (j - selectedX) * 40;
                    this.containersRow[i][j].y = screenCenterY + (i - this.activeRow) * 40;
                    const alpha1 = Math.abs(selectedX - j)*47*2/screenWidth;
                    const alpha2 = Math.abs(this.activeRow - i)*49*2/screenHeight;
                    this.containersRow[i][j].setAlpha((1 -alpha1)*(1 - alpha2));
            }

        }
    }

    /**
     * @param x, the sprite's vertical position
     * @param y, the sprites's horizontal position
     * @param name, the sprite's name
     * @return a new sprite
     */
    private generateLayers(x: number, y: number, name: string): Sprite {
        return new Sprite(this, x, y, name);
    }

    private updateSelectedLayer() {
        for(let i = 0; i < this.containersRow.length; i++){
            for(let j = 0; j < this.containersRow[i].length; j++){
               const children = this.getContainerChildren(i, j);
               this.containersRow[i][j].removeAll(true);
                this.containersRow[i][j].add(children);
            }
        }
     }

     public onResize(): void {
        this.moveLayers();

        this.Rectangle.x = this.cameras.main.worldView.x + this.cameras.main.width / 2;
        this.mobileTapENTER.x = this.cameras.main.worldView.x + this.cameras.main.width / 2;
        this.Rectangle.y = this.cameras.main.worldView.y + this.cameras.main.height / 2;
        this.mobileTapENTER.y = this.cameras.main.worldView.y + this.cameras.main.height / 2;

        this.textField.x = this.game.renderer.width/2;

        this.logo.x = this.game.renderer.width - 30;
        this.logo.y = this.game.renderer.height - 20;

        this.arrowUp.x = this.game.renderer.width - 30;
        this.mobileTapUP.x = this.game.renderer.width - 30;
        this.arrowUp.y = 60;
        this.mobileTapUP.y = 60;

        this.arrowDown.x = this.game.renderer.width - 30;
        this.mobileTapDOWN.x = this.game.renderer.width - 30;
        this.arrowDown.y = 100;
        this.mobileTapDOWN.y = 100;

        this.arrowLeft.x = this.game.renderer.width/9;
        this.mobileTapLEFT.x = this.game.renderer.width/9;
        this.arrowLeft.y = this.game.renderer.height/2;
        this.mobileTapLEFT.y = this.game.renderer.height/2;

        this.arrowRight.x = this.game.renderer.width*0.9;
        this.mobileTapRIGHT.x = this.game.renderer.width*0.9;
        this.arrowRight.y = this.game.renderer.height/2;
        this.mobileTapRIGHT.y = this.game.renderer.height/2;


     }
}
