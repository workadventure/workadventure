import {discussionManager} from "../../WebRtc/DiscussionManager";
import {DEPTH_INGAME_TEXT_INDEX} from "../Game/DepthIndexes";

export const openChatIconName = 'openChatIcon';
export class OpenChatIcon extends Phaser.GameObjects.Image {
    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, openChatIconName, 3);
        scene.add.existing(this);
        this.setScrollFactor(0, 0);
        this.setOrigin(0, 1);
        this.setInteractive();
        this.setVisible(false);
        this.setDepth(DEPTH_INGAME_TEXT_INDEX);

        this.on("pointerup", () => discussionManager.showDiscussionPart());
    }
}