import {getPlayerAnimations, playAnimation, PlayerAnimationNames} from "./Animation";
import {GameSceneInterface, Textures} from "../Game/GameScene";
import {ConnexionInstance} from "../Game/GameManager";
import {ActiveEventList, UserInputEvent} from "../UserInput/UserInputManager";
import {PlayableCaracter} from "../Entity/PlayableCaracter";

export class Player extends PlayableCaracter{
    
    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, Textures.Player, 1);
        this.setImmovable(false); //the current player model should be push away by other players to prevent conflict
        this.setSize(32, 32); //edit the hitbox to better match the caracter model
    }

    move(activeEvents: ActiveEventList){
        let speed = activeEvents.get(UserInputEvent.SpeedUp) ? 500 : 100;
        let haveMove = false;
        let direction = null;

        if(activeEvents.get(UserInputEvent.MoveUp)){
            this.setVelocity(0, -speed)
        } else if(activeEvents.get(UserInputEvent.MoveLeft)){
            this.setVelocity(-speed, 0)
        } else if(activeEvents.get(UserInputEvent.MoveDown)){
            this.setVelocity(0, speed)
        } else if(activeEvents.get(UserInputEvent.MoveRight)){
            this.setVelocity(speed, 0)
        } else {
            this.setVelocity(0, 0)
        }

        if (this.body.velocity.x > 0) { //moving right
            this.play("right", true);
        } else if (this.body.velocity.x < 0) { //moving left
            this.anims.playReverse("left", true);
        } else if (this.body.velocity.y < 0) { //moving up
            this.play("up", true);
        } else if (this.body.velocity.y > 0) { //moving down
            this.play("down", true);
        }
    }

    stop() {
        this.setVelocity(0, 0)
    }
}