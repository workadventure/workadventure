import {MapManagerInterface} from "../Game/MapManager";
import {getPlayerAnimations, playAnimation, PlayerAnimationNames} from "./Animation";
import {Connexion} from "../../Connexion";
import {GameSceneInterface} from "../Game/GameScene";
import {ConnexionInstance} from "../Game/GameManager";

export class Player extends Phaser.GameObjects.Sprite{
    MapManager : MapManagerInterface;
    PlayerValue : string;
    Connexion: Connexion;

    constructor(
        Scene : GameSceneInterface,
        x : number,
        y : number,
        MapManager: MapManagerInterface,
        PlayerValue : string = "player"
    ) {
        super(Scene, x, y, PlayerValue);
        this.PlayerValue = PlayerValue;
        Scene.add.existing(this);
        this.MapManager = MapManager;
    }


    initAnimation(){
        getPlayerAnimations(this.PlayerValue).forEach(d => {
            this.scene.anims.create({
                key: d.key,
                frames: this.scene.anims.generateFrameNumbers(d.frameModel, { start: d.frameStart, end: d.frameEnd }),
                frameRate: d.frameRate,
                repeat: d.repeat
            });
        })
    }

    move(){
        //if user client on shift, camera and player speed
        let speedMultiplier = this.MapManager.keyShift.isDown ? 5 : 1;
        let haveMove = false;

        if((this.MapManager.keyZ.isDown || this.MapManager.keyUp.isDown)){
            if(!this.CanToMoveUp()){
                return;
            }
            playAnimation(this, PlayerAnimationNames.WalkUp);
            this.setY(this.y - (2 * speedMultiplier));
            haveMove = true;
        }
        if((this.MapManager.keyQ.isDown || this.MapManager.keyLeft.isDown)){
            if(!this.CanToMoveLeft()){
                return;
            }
            playAnimation(this, PlayerAnimationNames.WalkLeft);
            this.setX(this.x - (2 * speedMultiplier));
            haveMove = true;
        }
        if((this.MapManager.keyS.isDown || this.MapManager.keyDown.isDown)){
            if(!this.CanToMoveDown()){
                return;
            }
            playAnimation(this, PlayerAnimationNames.WalkDown);
            this.setY(this.y + (2 * speedMultiplier));
            haveMove = true;
        }
        if((this.MapManager.keyD.isDown || this.MapManager.keyRight.isDown)){
            if(!this.CanToMoveRight()){
                return;
            }
            playAnimation(this, PlayerAnimationNames.WalkRight);
            this.setX(this.x + (2 * speedMultiplier));
            haveMove = true;
        }
        if(!haveMove){
            playAnimation(this, PlayerAnimationNames.None);
        }else{
            this.sharePosition();
        }
    }

    private sharePosition(){
        if(ConnexionInstance) {
            ConnexionInstance.sharePosition((this.scene as GameSceneInterface).RoomId, this.x, this.y);
        }
    }

    private CanToMoveUp(){
        return this.y > 0;
    }

    private CanToMoveLeft(){
        return this.x > 0;
    }

    private CanToMoveDown(){
        return this.MapManager.Map.heightInPixels > this.y;
    }

    private CanToMoveRight(){
        return this.MapManager.Map.widthInPixels > this.x;
    }
}