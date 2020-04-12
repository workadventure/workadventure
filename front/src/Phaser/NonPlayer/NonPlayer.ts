import {PlayableCaracter} from "../Entity/PlayableCaracter";
import {Textures} from "../Game/GameScene";
import {UserInputEvent} from "../UserInput/UserInputManager";
import {Player} from "../Player/Player";

export class NonPlayer extends PlayableCaracter {
    
    isFleeing: boolean = false;
    fleeingDirection:any = null //todo create a vector class
    
    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, Textures.Player, 1);
        this.setSize(32, 32); //edit the hitbox to better match the caracter model
    }

    fleeFrom(player:Player) {
        if (this.isFleeing) return;
        this.isFleeing = true;
        
        setTimeout(() => {
            console.log("I escaped");
            this.isFleeing = false
            this.fleeingDirection = null
        }, 3000);
        
        let vectorX = this.x - player.x; 
        let vectorY = this.y - player.y;
        this.fleeingDirection = {x: vectorX, y: vectorY}
    }
}