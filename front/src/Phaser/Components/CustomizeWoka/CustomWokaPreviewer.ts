import { CustomizedCharacter } from "../../Entity/CustomizedCharacter";
import { PlayerAnimationDirections } from "../../Player/Animation";

export class CustomWokaPreviewer extends Phaser.GameObjects.Container {
    private background: Phaser.GameObjects.Rectangle;
    private character: CustomizedCharacter;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y);

        this.background = this.createBackground();
        this.character = new CustomizedCharacter(scene, 0, 0, ["body19", "clothes4"]);
        this.character.setScale(4);
        this.setSize(this.background.displayWidth, this.background.displayHeight);

        this.add([this.background, this.character]);

        this.scene.add.existing(this);
    }

    public update(): void {
        this.character.playAnimation(PlayerAnimationDirections.Down, true);
    }

    private createBackground(): Phaser.GameObjects.Rectangle {
        return this.scene.add.rectangle(0, 0, 150, 300, 0xbfbfbf, 0.5);
    }
}
