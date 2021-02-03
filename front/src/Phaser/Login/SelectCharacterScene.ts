import {gameManager} from "../Game/GameManager";
import {TextField} from "../Components/TextField";
import Image = Phaser.GameObjects.Image;
import Rectangle = Phaser.GameObjects.Rectangle;
import {EnableCameraSceneName} from "./EnableCameraScene";
import {CustomizeSceneName} from "./CustomizeScene";
import {ResizableScene} from "./ResizableScene";
import {localUserStore} from "../../Connexion/LocalUserStore";
import {loadAllDefaultModels, loadCustomTexture} from "../Entity/PlayerTexturesLoadingManager";
import {addLoader} from "../Components/Loader";
import {BodyResourceDescriptionInterface} from "../Entity/PlayerTextures";
import {AbstractCharacterScene} from "./AbstractCharacterScene";


//todo: put this constants in a dedicated file
export const SelectCharacterSceneName = "SelectCharacterScene";
enum LoginTextures {
    playButton = "play_button",
    icon = "icon",
    mainFont = "main_font",
    customizeButton = "customize_button",
    customizeButtonSelected = "customize_button_selected"
}

export class SelectCharacterScene extends AbstractCharacterScene {
    private readonly nbCharactersPerRow = 6;
    private textField!: TextField;
    private pressReturnField!: TextField;
    private logo!: Image;
    private customizeButton!: Image;
    private customizeButtonSelected!: Image;

    private selectedRectangle!: Rectangle;
    private selectedRectangleXPos = 0; // Number of the character selected in the rows
    private selectedRectangleYPos = 0; // Number of the character selected in the columns
    private selectedPlayer!: Phaser.Physics.Arcade.Sprite|null; // null if we are selecting the "customize" option
    private players: Array<Phaser.Physics.Arcade.Sprite> = new Array<Phaser.Physics.Arcade.Sprite>();
    private mobileTapRectangle!: Rectangle;
    private playerModels!: BodyResourceDescriptionInterface[];

    constructor() {
        super({
            key: SelectCharacterSceneName
        });
    }

    preload() {
        addLoader(this);

        this.loadSelectSceneCharacters().then((bodyResourceDescriptions) => {
            bodyResourceDescriptions.forEach((bodyResourceDescription) => {
                this.playerModels.push(bodyResourceDescription);
            });
        })

        this.load.image(LoginTextures.playButton, "resources/objects/play_button.png");
        this.load.image(LoginTextures.icon, "resources/logos/tcm_full.png");
        // Note: arcade.png from the Phaser 3 examples at: https://github.com/photonstorm/phaser3-examples/tree/master/public/assets/fonts/bitmap
        this.load.bitmapFont(LoginTextures.mainFont, 'resources/fonts/arcade.png', 'resources/fonts/arcade.xml');
        this.playerModels = loadAllDefaultModels(this.load);
        this.load.image(LoginTextures.customizeButton, 'resources/objects/customize.png');
        this.load.image(LoginTextures.customizeButtonSelected, 'resources/objects/customize_selected.png');

        addLoader(this);
    }

    create() {
        this.textField = new TextField(this, this.game.renderer.width / 2, 50, 'Select your character');
        this.pressReturnField = new TextField(
            this,
            this.game.renderer.width / 2,
            90 + 32 * Math.ceil( this.playerModels.length / this.nbCharactersPerRow) + 60,
            'Touch here\n\n or \n\nPress enter to start');
        // For mobile purposes - we need a big enough touchable area.
        this.mobileTapRectangle = this.add
          .rectangle(
            this.game.renderer.width / 2,
            275,
            this.game.renderer.width / 2,
            50,
          )
          .setInteractive()
          .on("pointerdown", () => {
            this.nextScene();
          });

        const rectangleXStart = this.game.renderer.width / 2 - (this.nbCharactersPerRow / 2) * 32 + 16;

        this.selectedRectangle = this.add.rectangle(rectangleXStart, 90, 32, 32).setStrokeStyle(2, 0xFFFFFF);

        this.logo = new Image(this, this.game.renderer.width - 30, this.game.renderer.height - 20, LoginTextures.icon);
        this.add.existing(this.logo);

        this.input.keyboard.on('keyup-ENTER', () => {
            return this.nextScene();
        });

        this.input.keyboard.on('keydown-RIGHT', () => {
            if(this.selectedRectangleYPos * this.nbCharactersPerRow + (this.selectedRectangleXPos + 2))
            if (
                this.selectedRectangleXPos < this.nbCharactersPerRow - 1
                && ((this.selectedRectangleYPos * this.nbCharactersPerRow) + (this.selectedRectangleXPos + 1) + 1) <= this.playerModels.length
            ) {
                this.selectedRectangleXPos++;
            }
            this.updateSelectedPlayer();
        });
        this.input.keyboard.on('keydown-LEFT', () => {
            if (
                this.selectedRectangleXPos > 0
                && ((this.selectedRectangleYPos * this.nbCharactersPerRow) + (this.selectedRectangleXPos - 1) + 1) <= this.playerModels.length
            ) {
                this.selectedRectangleXPos--;
            }
            this.updateSelectedPlayer();
        });
        this.input.keyboard.on('keydown-DOWN', () => {
            if (
                this.selectedRectangleYPos < Math.ceil(this.playerModels.length / this.nbCharactersPerRow)
                && (
                    (((this.selectedRectangleYPos + 1) * this.nbCharactersPerRow) + this.selectedRectangleXPos + 1) <= this.playerModels.length // check if player isn't empty
                    || (this.selectedRectangleYPos + 1) === Math.ceil(this.playerModels.length / this.nbCharactersPerRow) // check if is custom rectangle
                )
            ) {
                this.selectedRectangleYPos++;
            }
            this.updateSelectedPlayer();
        });
        this.input.keyboard.on('keydown-UP', () => {
            if (
                this.selectedRectangleYPos > 0
                && (((this.selectedRectangleYPos - 1) * this.nbCharactersPerRow) + this.selectedRectangleXPos + 1) <= this.playerModels.length
            ) {
                this.selectedRectangleYPos--;
            }
            this.updateSelectedPlayer();
        });

        /*create user*/
        this.createCurrentPlayer();

        const playerNumber = localUserStore.getPlayerCharacterIndex();
        if (playerNumber && playerNumber !== -1) {
            this.selectedRectangleXPos = playerNumber % this.nbCharactersPerRow;
            this.selectedRectangleYPos = Math.floor(playerNumber / this.nbCharactersPerRow);
            this.updateSelectedPlayer();
        } else if (playerNumber === -1) {
            this.selectedRectangleYPos = Math.ceil(this.playerModels.length / this.nbCharactersPerRow);
            this.updateSelectedPlayer();
        }
    }

    update(time: number, delta: number): void {
        this.pressReturnField.setVisible(!!(Math.floor(time / 500) % 2));
    }

    private nextScene(): void {
        this.scene.stop(SelectCharacterSceneName);
        if (this.selectedPlayer !== null) {
            gameManager.setCharacterLayers([this.selectedPlayer.texture.key]);
            gameManager.tryResumingGame(this, EnableCameraSceneName);
        } else {
            this.scene.run(CustomizeSceneName);
        }
        this.scene.remove(SelectCharacterSceneName);
    }

    createCurrentPlayer(): void {
        for (let i = 0; i <this.playerModels.length; i++) {
            const playerResource = this.playerModels[i];

            const col = i % this.nbCharactersPerRow;
            const row = Math.floor(i / this.nbCharactersPerRow);

            const [x, y] = this.getCharacterPosition(col, row);
            const player = this.physics.add.sprite(x, y, playerResource.name, 0);
            player.setBounce(0.2);
            player.setCollideWorldBounds(true);
            this.anims.create({
                key: playerResource.name,
                frames: this.anims.generateFrameNumbers(playerResource.name, {start: 0, end: 2,}),
                frameRate: 10,
                repeat: -1
            });
            player.setInteractive().on("pointerdown", () => {
                this.selectedRectangleXPos = col;
                this.selectedRectangleYPos = row;
                this.updateSelectedPlayer();
            });
            this.players.push(player);
        }

        const maxRow = Math.ceil( this.playerModels.length / this.nbCharactersPerRow);
        this.customizeButton = new Image(this, this.game.renderer.width / 2, 90 + 32 * maxRow + 6, LoginTextures.customizeButton);
        this.customizeButton.setOrigin(0.5, 0.5);
        this.add.existing(this.customizeButton);
        this.customizeButtonSelected = new Image(this, this.game.renderer.width / 2, 90 + 32 * maxRow + 6, LoginTextures.customizeButtonSelected);
        this.customizeButtonSelected.setOrigin(0.5, 0.5);
        this.customizeButtonSelected.setVisible(false);
        this.add.existing(this.customizeButtonSelected);

        this.customizeButton.setInteractive().on("pointerdown", () => {
            this.selectedRectangleYPos = Math.ceil(this.playerModels.length / this.nbCharactersPerRow);
            this.updateSelectedPlayer();
        });

        this.selectedPlayer = this.players[0];
        this.selectedPlayer.play(this.playerModels[0].name);
    }

    /**
     * Returns pixel position by on column and row number
     */
    private getCharacterPosition(x: number, y: number): [number, number] {
        return [
            this.game.renderer.width / 2 + 16 + (x - this.nbCharactersPerRow / 2) * 32,
            y * 32 + 90
        ];
    }

    private updateSelectedPlayer(): void {
        this.selectedPlayer?.anims.pause();
        // If we selected the customize button
        if (this.selectedRectangleYPos === Math.ceil(this.playerModels.length / this.nbCharactersPerRow)) {
            this.selectedPlayer = null;
            this.selectedRectangle.setVisible(false);
            this.customizeButtonSelected.setVisible(true);
            this.customizeButton.setVisible(false);
            localUserStore.setPlayerCharacterIndex(-1);
            return;
        }
        this.customizeButtonSelected.setVisible(false);
        this.customizeButton.setVisible(true);
        const [x, y] = this.getCharacterPosition(this.selectedRectangleXPos, this.selectedRectangleYPos);
        this.selectedRectangle.setVisible(true);
        this.selectedRectangle.setX(x);
        this.selectedRectangle.setY(y);
        this.selectedRectangle.setSize(32, 32);
        const playerNumber = this.selectedRectangleXPos + this.selectedRectangleYPos * this.nbCharactersPerRow;
        const player = this.players[playerNumber];
        player.play(this.playerModels[playerNumber].name);
        this.selectedPlayer = player;
        localUserStore.setPlayerCharacterIndex(playerNumber);
    }

    public onResize(ev: UIEvent): void {
        this.textField.x = this.game.renderer.width / 2;
        this.pressReturnField.x = this.game.renderer.width / 2;
        this.logo.x = this.game.renderer.width - 30;
        this.logo.y = this.game.renderer.height - 20;
        this.customizeButton.x = this.game.renderer.width / 2;
        this.customizeButtonSelected.x = this.game.renderer.width / 2;

        for (let i = 0; i <this.playerModels.length; i++) {
            const player = this.players[i];

            const col = i % this.nbCharactersPerRow;
            const row = Math.floor(i / this.nbCharactersPerRow);

            const [x, y] = this.getCharacterPosition(col, row);
            player.x = x;
            player.y = y;
        }
        this.updateSelectedPlayer();
    }

}
