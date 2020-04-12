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

    stop() {
        this.setVelocity(0, 0)
    }
}