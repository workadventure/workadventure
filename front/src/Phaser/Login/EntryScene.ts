import {gameManager} from "../Game/GameManager";
import {TextField} from "../Components/TextField";
import {TextInput} from "../Components/TextInput";
import {ClickButton} from "../Components/ClickButton";
import Image = Phaser.GameObjects.Image;
import Rectangle = Phaser.GameObjects.Rectangle;
import {PLAYER_RESOURCES, PlayerResourceDescriptionInterface} from "../Entity/Character";
import {cypressAsserter} from "../../Cypress/CypressAsserter";
import {SelectCharacterSceneName} from "./SelectCharacterScene";
import {ResizableScene} from "./ResizableScene";
import {Scene} from "phaser";
import {LoginSceneName} from "./LoginScene";
import {FourOFourSceneName} from "../Reconnecting/FourOFourScene";

export const EntrySceneName = "EntryScene";

/**
 * The EntryScene is not a real scene. It is the first scene loaded and is only used to initialize the gameManager
 * and to route to the next correct scene.
 */
export class EntryScene extends Scene {
    constructor() {
        super({
            key: EntrySceneName
        });
    }

    preload() {
    }

    create() {
        gameManager.init(this.scene).then(() => {
            this.scene.start(LoginSceneName);
        }).catch((err) => {
            console.error(err)
            this.scene.start(FourOFourSceneName, {
                url: window.location.pathname.toString()
            });
        });
    }
}
