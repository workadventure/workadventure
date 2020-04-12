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

    move(x: number, y: number){

        this.setVelocity(x, y);

        //todo improve animations to better account for diagonal movement
        if (this.body.velocity.x > 0) { //moving right
            this.play(PlayerAnimationNames.WalkRight, true);
        } else if (this.body.velocity.x < 0) { //moving left
            this.anims.playReverse(PlayerAnimationNames.WalkLeft, true);
        } else if (this.body.velocity.y < 0) { //moving up
            this.play(PlayerAnimationNames.WalkUp, true);
        } else if (this.body.velocity.y > 0) { //moving down
            this.play(PlayerAnimationNames.WalkDown, true);
        }
    }
}