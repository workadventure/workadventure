import {PlayerAnimationNames} from "../Player/Animation";
import {SpeechBubble} from "./SpeechBubble";
import BitmapText = Phaser.GameObjects.BitmapText;

export class PlayableCaracter extends Phaser.Physics.Arcade.Sprite {
    private bubble: SpeechBubble;
    private playerName: BitmapText;

    constructor(scene: Phaser.Scene, x: number, y: number, texture: string, name: string, frame?: string | number) {
        super(scene, x, y, texture, frame);

        this.playerName = new BitmapText(scene, x, y - 25, 'main_font', name, 8);
        this.playerName.setOrigin(0.5).setCenterAlign();
        scene.add.existing(this.playerName);

        this.scene.sys.updateList.add(this);
        this.scene.sys.displayList.add(this);
        //this.setScale(2);
        this.scene.physics.world.enableBody(this);
        this.setImmovable(true);
        this.setCollideWorldBounds(true);
        this.setSize(16, 16); //edit the hitbox to better match the caracter model
        this.setOffset(8, 16);
    }

    move(x: number, y: number){

        this.setVelocity(x, y);

        //up or down animationss are prioritized over left and right
        if (this.body.velocity.y < 0) { //moving up
            this.play(PlayerAnimationNames.WalkUp, true);
        } else if (this.body.velocity.y > 0) { //moving down
            this.play(PlayerAnimationNames.WalkDown, true);
        } else if (this.body.velocity.x > 0) { //moving right
            this.play(PlayerAnimationNames.WalkRight, true);
        } else if (this.body.velocity.x < 0) { //moving left
            this.anims.playReverse(PlayerAnimationNames.WalkLeft, true);
        }

        if(this.bubble) {
            this.bubble.moveBubble(this.x, this.y);
        }
        this.updatePlayerNamePosition(this.x, this.y);
    }

    updatePlayerNamePosition(x: number, y: number){
        this.playerName.setPosition(x, y - 25);
    }

    stop(){
        this.setVelocity(0, 0);
        this.anims.stop();
    }

    say(text: string) {
        if (this.bubble) return;
        this.bubble = new SpeechBubble(this.scene, this, text)
        //todo make the bubble destroy on player movement?
        setTimeout(() => {
            this.bubble.destroy();
            this.bubble = null;
        }, 3000)
    }

    destroy(fromScene?: boolean): void {
        super.destroy(fromScene);
        this.playerName.destroy();
    }
}
