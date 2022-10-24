import { DEPTH_INGAME_TEXT_INDEX } from "../Game/DepthIndexes";

export class PresentationModeIcon extends Phaser.GameObjects.Sprite {
    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, "layout_modes", 0);
        scene.add.existing(this);
        this.setScrollFactor(0, 0);
        this.setOrigin(0, 1);
        this.setInteractive();
        this.setVisible(false);
        this.setDepth(DEPTH_INGAME_TEXT_INDEX);
    }
}
