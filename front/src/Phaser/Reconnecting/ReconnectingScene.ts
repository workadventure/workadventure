import {gameManager} from "../Game/GameManager";
import {TextField} from "../Components/TextField";
import {TextInput} from "../Components/TextInput";
import {ClickButton} from "../Components/ClickButton";
import Image = Phaser.GameObjects.Image;
import Rectangle = Phaser.GameObjects.Rectangle;
import {PLAYER_RESOURCES} from "../Entity/PlayableCaracter";
import {cypressAsserter} from "../../Cypress/CypressAsserter";

export const ReconnectingSceneName = "ReconnectingScene";
enum ReconnectingTextures {
    icon = "icon",
    mainFont = "main_font"
}

export class ReconnectingScene extends Phaser.Scene {
    private reconnectingField: TextField;
    private logo: Image;

    constructor() {
        super({
            key: ReconnectingSceneName
        });
    }

    preload() {
        this.load.image(ReconnectingTextures.icon, "resources/logos/tcm_full.png");
        // Note: arcade.png from the Phaser 3 examples at: https://github.com/photonstorm/phaser3-examples/tree/master/public/assets/fonts/bitmap
        this.load.bitmapFont(ReconnectingTextures.mainFont, 'resources/fonts/arcade.png', 'resources/fonts/arcade.xml');
    }

    create() {
        this.logo = new Image(this, this.game.renderer.width - 30, this.game.renderer.height - 20, ReconnectingTextures.icon);
        this.add.existing(this.logo);

        this.reconnectingField = new TextField(this, 10, this.game.renderer.height - 35, "Connection lost. Reconnecting...");
    }
}
