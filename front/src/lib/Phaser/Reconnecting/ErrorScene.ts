import { TextField } from "../Components/TextField";
import { gameManager } from "../Game/GameManager";
import Image = Phaser.GameObjects.Image;
import Sprite = Phaser.GameObjects.Sprite;
import Text = Phaser.GameObjects.Text;
import ScenePlugin = Phaser.Scenes.ScenePlugin;

export const ErrorSceneName = "ErrorScene";
enum Textures {
    icon = "icon",
    mainFont = "main_font",
}

export class ErrorScene extends Phaser.Scene {
    private titleField!: TextField;
    private subTitleField!: TextField;
    private messageField!: Text;
    private logo!: Image;
    private cat!: Sprite;
    private title!: string;
    private subTitle!: string;
    private message!: string;

    constructor() {
        super({
            key: ErrorSceneName,
        });
    }

    init({ title, subTitle, message }: { title?: string; subTitle?: string; message?: string }) {
        this.title = title ? title : "";
        this.subTitle = subTitle ? subTitle : "";
        this.message = message ? message : "";
    }

    preload() {
        this.load.image(Textures.icon, "static/images/favicons/favicon-32x32.png");
        // Note: arcade.png from the Phaser 3 examples at: https://github.com/photonstorm/phaser3-examples/tree/master/public/assets/fonts/bitmap
        if (!this.cache.bitmapFont.has("main_font")) {
            // We put this inside a "if" because despite the cache, Phaser will make a query to the XML file. And if there is no connection (which
            // is not unlikely given the fact we are in an error scene), this will cause an error.
            this.load.bitmapFont(Textures.mainFont, "resources/fonts/arcade.png", "resources/fonts/arcade.xml");
        }
        this.load.spritesheet("cat", "resources/characters/pipoya/Cat 01-1.png", { frameWidth: 32, frameHeight: 32 });
    }

    create() {
        this.logo = new Image(this, this.game.renderer.width - 30, this.game.renderer.height - 20, Textures.icon);
        this.add.existing(this.logo);

        this.titleField = new TextField(this, this.game.renderer.width / 2, this.game.renderer.height / 2, this.title);

        this.subTitleField = new TextField(
            this,
            this.game.renderer.width / 2,
            this.game.renderer.height / 2 + 24,
            this.subTitle
        );

        this.messageField = this.add.text(
            this.game.renderer.width / 2,
            this.game.renderer.height / 2 + 48,
            this.message,
            {
                fontFamily: 'Georgia, "Goudy Bookletter 1911", Times, serif',
                fontSize: "10px",
            }
        );
        this.messageField.setOrigin(0.5, 0.5);

        this.cat = this.physics.add.sprite(this.game.renderer.width / 2, this.game.renderer.height / 2 - 32, "cat", 6);
        this.cat.flipY = true;

        if (gameManager.currentStartedRoom.backgroundColor != undefined) {
            this.cameras.main.setBackgroundColor(gameManager.currentStartedRoom.backgroundColor);
        }
    }

    /**
     * Displays the error page, with an error message matching the "error" parameters passed in.
     */
    public static startErrorPage(title: string, subTitle: string, message: string, scene: ScenePlugin): void {
        scene.start(ErrorSceneName, {
            title,
            subTitle,
            message,
        });
    }
}
