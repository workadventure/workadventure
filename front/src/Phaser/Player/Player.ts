import {getPlayerAnimations, playAnimation, PlayerAnimationNames} from "./Animation";
import {GameSceneInterface, Textures} from "../Game/GameScene";
import {ConnexionInstance} from "../Game/GameManager";
import {ActiveEventList, UserInputEvent} from "../UserInput/UserInputManager";
import {PlayableCaracter} from "../Entity/PlayableCaracter";

export class Player extends PlayableCaracter{
    
    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, Textures.Player, 26);
        this.setImmovable(false);
        this.setSize(32, 32); //edit the hitbox to better match the caracter model
    }

    move(activeEvents: ActiveEventList){
        let speed = activeEvents.get(UserInputEvent.SpeedUp) ? 500 : 100;
        let haveMove = false;
        let direction = null;

        if(activeEvents.get(UserInputEvent.MoveUp)){
            this.setVelocity(0, -speed)
            playAnimation(this, PlayerAnimationNames.WalkUp);
        } else if(activeEvents.get(UserInputEvent.MoveLeft)){
            this.setVelocity(-speed, 0)
        } else if(activeEvents.get(UserInputEvent.MoveDown)){
            playAnimation(this, PlayerAnimationNames.WalkDown);
            this.setVelocity(0, speed)
        } else if(activeEvents.get(UserInputEvent.MoveRight)){
            this.setVelocity(speed, 0)
        } else {
            this.setVelocity(0, 0)
            playAnimation(this, PlayerAnimationNames.None);
        }
    }

    stop() {
        this.setVelocity(0, 0)
    }

    /*private sharePosition(direction : string){
        if(ConnexionInstance) {
            ConnexionInstance.sharePosition((this.scene as GameSceneInterface).RoomId, this.x, this.y, direction);
        }
    }*/
}