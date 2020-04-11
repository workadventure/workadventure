import {GameSceneInterface, Textures} from "../Game/GameScene";
import {CameraManagerInterface} from "../Game/CameraManager";
import {MapManagerInterface} from "../Game/MapManager";

export class Rock extends Phaser.GameObjects.Image {
    private isMoving: boolean;

    constructor(
        Scene : GameSceneInterface,
        x : number,
        y : number,
    ) {
        super(Scene, x, y, Textures.Rock);
        Scene.add.existing(this);
        this.isMoving = false;
    }
    
    push() {
        console.log("the rock is pushed!")
    }
    
    move() {
        if(!this.isMoving) {
            return;
        }
    }
    
}