import {PlayableCaracter} from "../Entity/PlayableCaracter";
import {Textures} from "../Game/GameScene";
import {UserInputEvent} from "../UserInput/UserInputManager";
import {Player} from "../Player/Player";
import {MessageUserPositionInterface} from "../../ConnexionManager";
import {getPlayerAnimations, playAnimation} from "../Player/Animation";

export class NonPlayer extends PlayableCaracter {
    
    isFleeing: boolean = false;
    fleeingDirection:any = null
    private userId: string;

    //todo create a vector class
    
    constructor(userId:string, scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, Textures.Player, 1);
        this.userId = userId
        this.setSize(32, 32); //edit the hitbox to better match the caracter model
    }


    updatePosition(MessageUserPosition : MessageUserPositionInterface){
        playAnimation(this, MessageUserPosition.position.direction);
        this.setX(MessageUserPosition.position.x);
        this.setY(MessageUserPosition.position.y);
    }

    initAnimation(): void {
        getPlayerAnimations().forEach(d => {
            this.scene.anims.create({
                key: d.key,
                frames: this.scene.anims.generateFrameNumbers(d.frameModel, {start: d.frameStart, end: d.frameEnd}),
                frameRate: d.frameRate,
                repeat: d.repeat
            });
        })
    }

    /*fleeFrom(player:Player) {
        if (this.isFleeing) return;
        this.say("Don't touch me!");
        this.isFleeing = true;
        
        setTimeout(() => {
            this.say("Feww, I escaped.");
            this.isFleeing = false
            this.fleeingDirection = null
        }, 3000);
        
        let vectorX = this.x - player.x; 
        let vectorY = this.y - player.y;
        this.fleeingDirection = {x: vectorX, y: vectorY}
    }*/
}