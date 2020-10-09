import {gameManager} from "../Game/GameManager";
import {TextField} from "../Components/TextField";
import Image = Phaser.GameObjects.Image;
import {GameSceneInitInterface} from "../Game/GameScene";
import {StartMapInterface} from "../../Connexion/ConnexionModels";
import {mediaManager} from "../../WebRtc/MediaManager";
import {RESOLUTION} from "../../Enum/EnvironmentVariable";
import {SoundMeter} from "../Components/SoundMeter";
import {SoundMeterSprite} from "../Components/SoundMeterSprite";
import {ClickButton} from "../Components/ClickButton";
import {ResizableScene} from "./ResizableScene";

export const MenuSceneName = "MenuScene";
enum MenuTextures {
    mainFont = "main_font",
}

export class MenuScene extends ResizableScene {
    private buttons: ClickButton[] = [];
    private selected: number = 0;


    constructor() {
        super({
            key: MenuSceneName
        });
    }

    preload() {
        this.load.image('notSelectedButton', "resources/objects/button.png");
        this.load.image('selectedButton', "resources/objects/button_selected.png");
        this.load.bitmapFont(MenuTextures.mainFont, 'resources/fonts/arcade.png', 'resources/fonts/arcade.xml');
    }

    create() {
        const changeName = new ClickButton(this, this.game.renderer.width / 2, 50, 'Edit name', 'notSelectedButton', 'selectedButton');
        changeName.onClick(() => {
            console.log('Change name clicked')
        })
        this.add.existing(changeName);
        this.buttons.push(changeName);

        const changeCharacter = new ClickButton(this, this.game.renderer.width / 2, 100, 'Edit character', 'notSelectedButton', 'selectedButton');
        changeCharacter.onClick(() => {
            console.log('changeCharacter clicked')
        })
        this.add.existing(changeCharacter);
        this.buttons.push(changeCharacter);

        const setupCamera = new ClickButton(this, this.game.renderer.width / 2, 150, 'Setup webcam', 'notSelectedButton', 'selectedButton');
        setupCamera.onClick(() => {
            console.log('setupCamera clicked')
        })
        this.add.existing(setupCamera);
        this.buttons.push(setupCamera);

        const backToGame = new ClickButton(this, this.game.renderer.width / 2, 200, 'Back to game', 'notSelectedButton', 'selectedButton');
        backToGame.onClick(() => {
            console.log('backToGame clicked')
        })
        this.add.existing(backToGame);
        this.buttons.push(backToGame);

        for (let i = 0; i < this.buttons.length; i++) {
            const button = this.buttons[i];
            button.onPointerOver(() => {
                this.selected = i;
                this.select();
            });
        }

        this.select();

        this.input.keyboard.on('keydown-DOWN', () => {
            if (this.selected === this.buttons.length - 1) {
                return;
            }
            this.selected++;
            this.select();
        });
        this.input.keyboard.on('keydown-UP', () => {
            if (this.selected === 0) {
                return;
            }
            this.selected--;
            this.select();
        });
        this.input.keyboard.on('keydown-ENTER', () => {
            this.buttons[this.selected].click();
        });

    }

    onResize(ev: UIEvent): void {
        for (const button of this.buttons) {
            button.setX(this.game.renderer.width / 2);
        }
    }

    private select(): void {
        for (let i = 0; i < this.buttons.length; i++) {
            const button = this.buttons[i];
            if (i === this.selected) {
                button.select();
            } else {
                button.unselect();
            }
        }
    }
}
