import {PlayableCaracter} from "../Entity/PlayableCaracter";
import {Textures} from "../Game/GameScene";

export class NonPlayer extends PlayableCaracter {
    
    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, Textures.Player, 1);
        this.setSize(32, 32); //edit the hitbox to better match the caracter model
    }
}