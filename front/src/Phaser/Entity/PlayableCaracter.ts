import {getPlayerAnimations, playAnimation, PlayerAnimationNames} from "../Player/Animation";
import {ActiveEventList, UserInputEvent} from "../UserInput/UserInputManager";

export class PlayableCaracter extends Phaser.Physics.Arcade.Sprite {

    constructor(scene: Phaser.Scene, x: number, y: number, texture: string, frame?: string | number) {
        super(scene, x, y, texture, frame);

        scene.sys.updateList.add(this);
        scene.sys.displayList.add(this);
        this.setScale(2);
        scene.physics.world.enableBody(this);
        this.setImmovable(true);
        this.setCollideWorldBounds(true)
    }
}