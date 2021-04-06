import Image = Phaser.GameObjects.Image;
import Rectangle = Phaser.GameObjects.Rectangle;
import { addLoader } from "../Components/Loader";
import { gameManager} from "../Game/GameManager";
import { ResizableScene } from "./ResizableScene";
import { TextField } from "../Components/TextField";
import { EnableCameraSceneName } from "./EnableCameraScene";
import { localUserStore } from "../../Connexion/LocalUserStore";
import { CompanionResourceDescriptionInterface } from "../Companion/CompanionTextures";
import { getAllCompanionResources } from "../Companion/CompanionTexturesLoadingManager";

export const SelectCompanionSceneName = "SelectCompanionScene";

enum LoginTextures {
    playButton = "play_button",
    icon = "icon",
    mainFont = "main_font"
}

export class SelectCompanionScene extends ResizableScene {
    private logo!: Image;
    private textField!: TextField;
    private pressReturnField!: TextField;
    private readonly nbCharactersPerRow = 7;

    private selectedRectangle!: Rectangle;
    
    private selectedCompanion!: Phaser.Physics.Arcade.Sprite;
    private companions: Array<Phaser.Physics.Arcade.Sprite> = new Array<Phaser.Physics.Arcade.Sprite>();
    private companionModels: Array<CompanionResourceDescriptionInterface|null> = [null];

    constructor() {
        super({
            key: SelectCompanionSceneName
        });
    }

    preload() {
        addLoader(this);

        getAllCompanionResources(this.load).forEach(model => {
            this.companionModels.push(model);
        });

        this.load.image(LoginTextures.icon, "resources/logos/tcm_full.png");
        this.load.image(LoginTextures.playButton, "resources/objects/play_button.png");

        // Note: arcade.png from the Phaser 3 examples at: https://github.com/photonstorm/phaser3-examples/tree/master/public/assets/fonts/bitmap
        this.load.bitmapFont(LoginTextures.mainFont, 'resources/fonts/arcade.png', 'resources/fonts/arcade.xml');

        addLoader(this);
    }

    create() {
        this.textField = new TextField(this, this.game.renderer.width / 2, 50, 'Select your companion');

        this.pressReturnField = new TextField(
            this,
            this.game.renderer.width / 2,
            90 + 32 * Math.ceil(this.companionModels.length / this.nbCharactersPerRow),
            'Press enter to start'
        );

        const rectangleXStart = this.game.renderer.width / 2 - (this.nbCharactersPerRow / 2) * 32 + 16;
        this.selectedRectangle = this.add.rectangle(rectangleXStart, 90, 32, 32).setStrokeStyle(2, 0xFFFFFF);

        this.logo = new Image(this, this.game.renderer.width - 30, this.game.renderer.height - 20, LoginTextures.icon);
        this.add.existing(this.logo);

        // input events
        this.input.keyboard.on('keyup-ENTER', this.nextScene.bind(this));

        this.input.keyboard.on('keydown-RIGHT', this.selectNext.bind(this));
        this.input.keyboard.on('keydown-LEFT', this.selectPrevious.bind(this));
        this.input.keyboard.on('keydown-DOWN', this.jumpToNextRow.bind(this));
        this.input.keyboard.on('keydown-UP', this.jumpToPreviousRow.bind(this));

        this.createCurrentCompanion();
        this.selectCompanion(this.getCompanionIndex());
    }

    update(time: number, delta: number): void {
        this.pressReturnField.setVisible(!!(Math.floor(time / 500) % 2));
    }

    private jumpToPreviousRow(): void {
        const index = this.companions.indexOf(this.selectedCompanion) - this.nbCharactersPerRow;
        if (index >= 0) {
            this.selectCompanion(index);  
        }
    }

    private jumpToNextRow(): void {
        const index = this.companions.indexOf(this.selectedCompanion) + this.nbCharactersPerRow;
        if (index < this.companions.length) {
            this.selectCompanion(index);  
        }
    }

    private selectPrevious(): void {
        const index = this.companions.indexOf(this.selectedCompanion);
        this.selectCompanion(index - 1);  
    }

    private selectNext(): void {
        const index = this.companions.indexOf(this.selectedCompanion);
        this.selectCompanion(index + 1);  
    }

    private selectCompanion(index?: number): void {
        if (typeof index === 'undefined') {
            index = this.companions.indexOf(this.selectedCompanion);
        }

        // make sure index is inside possible range
        index = Math.min(this.companions.length - 1, Math.max(0, index));

        if (this.selectedCompanion === this.companions[index]) {
            return;
        }

        this.selectedCompanion.anims.pause();
        this.selectedCompanion = this.companions[index];

        this.selectedRectangle.setVisible(true);
        this.selectedRectangle.setX(this.selectedCompanion.x);
        this.selectedRectangle.setY(this.selectedCompanion.y);
        this.selectedRectangle.setSize(32, 32);

        const model = this.companionModels[index];

        if (model !== null) {
            this.selectedCompanion.anims.play(model.name);
        }
    }

    private storeCompanionSelection(): string|null {
        const index = this.companions.indexOf(this.selectedCompanion);
        const model = this.companionModels[index];
        const companion = model === null ? null : model.name;

        localUserStore.setCompanion(companion);

        return companion;
    }

    private nextScene(): void {
        const companion = this.storeCompanionSelection();

        // next scene
        this.scene.stop(SelectCompanionSceneName);

        gameManager.setCompanion(companion);
        gameManager.tryResumingGame(this, EnableCameraSceneName);

        this.scene.remove(SelectCompanionSceneName);
    }

    private createCurrentCompanion(): void {
        for (let i = 0; i < this.companionModels.length; i++) {
            const companionResource = this.companionModels[i];

            const col = i % this.nbCharactersPerRow;
            const row = Math.floor(i / this.nbCharactersPerRow);

            const [x, y] = this.getCharacterPosition(col, row);

            let name = "null";
            if (companionResource !== null) {
                name = companionResource.name;
            }

            const companion = this.physics.add.sprite(x, y, name, 0);
            companion.setBounce(0.2);
            companion.setCollideWorldBounds(true);

            if (companionResource !== null) {
                this.anims.create({
                    key: name,
                    frames: this.anims.generateFrameNumbers(name, {start: 0, end: 2,}),
                    frameRate: 10,
                    repeat: -1
                });
            }

            companion.setInteractive().on("pointerdown", () => {
                this.selectCompanion(i);
            });

            this.companions.push(companion);
        }

        this.selectedCompanion = this.companions[0];
    }

    private getCharacterPosition(x: number, y: number): [number, number] {
        return [
            this.game.renderer.width / 2 + 16 + (x - this.nbCharactersPerRow / 2) * 32,
            y * 32 + 90
        ];
    }

    public onResize(ev: UIEvent): void {
        this.textField.x = this.game.renderer.width / 2;
        this.pressReturnField.x = this.game.renderer.width / 2;
        this.logo.x = this.game.renderer.width - 30;
        this.logo.y = this.game.renderer.height - 20;

        for (let i = 0; i < this.companionModels.length; i++) {
            const companion = this.companions[i];

            const col = i % this.nbCharactersPerRow;
            const row = Math.floor(i / this.nbCharactersPerRow);

            const [x, y] = this.getCharacterPosition(col, row);
            companion.x = x;
            companion.y = y;
        }

        this.selectCompanion();
    }

    private getCompanionIndex(): number {
        const companion = localUserStore.getCompanion();

        if (companion === null) {
            return 0;
        }

        return this.companionModels.findIndex(model => model !== null && model.name === companion);
    }
}
