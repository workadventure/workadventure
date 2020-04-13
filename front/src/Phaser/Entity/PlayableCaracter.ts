import {getPlayerAnimations, playAnimation, PlayerAnimationNames} from "../Player/Animation";
import {ActiveEventList, UserInputEvent} from "../UserInput/UserInputManager";
import {SpeechBubble} from "./SpeechBubble";

export class PlayableCaracter extends Phaser.Physics.Arcade.Sprite {
    private bubble: SpeechBubble;

    constructor(scene: Phaser.Scene, x: number, y: number, texture: string, frame?: string | number) {
        super(scene, x, y, texture, frame);

        this.scene.sys.updateList.add(this);
        this.scene.sys.displayList.add(this);
        this.setScale(2);
        this.scene.physics.world.enableBody(this);
        this.setImmovable(true);
        this.setCollideWorldBounds(true);
        this.setSize(32, 32); //edit the hitbox to better match the caracter model
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

        if(this.bubble) {
            this.bubble.moveBubble(this.x, this.y);
        }
    }
    
    say(text: string) {
        if (this.bubble) return;
        this.bubble = new SpeechBubble(this.scene, this, text)
        //todo make the buble destroy on player movement?
        setTimeout(() => {
            this.bubble.destroy();
            this.bubble = null;
        }, 3000)
    }
}