import {MapManagerInterface} from "../Game/MapManager";
import {getPlayerAnimations, playAnimation, PlayerAnimationNames} from "./Animation";
import {GameSceneInterface} from "../Game/GameScene";
import {ConnexionInstance} from "../Game/GameManager";
import {CameraManagerInterface} from "../Game/CameraManager";
import {MessageUserPositionInterface} from "../../Connexion";

export class Player extends Phaser.GameObjects.Sprite{
    userId : string;
    MapManager : MapManagerInterface;
    PlayerValue : string;
    CameraManager: CameraManagerInterface;

    constructor(
        userId: string,
        Scene : GameSceneInterface,
        x : number,
        y : number,
        CameraManager: CameraManagerInterface,
        MapManager: MapManagerInterface,
        PlayerValue : string = "player"
    ) {
        super(Scene, x, y, PlayerValue);
        this.userId = userId;
        this.PlayerValue = PlayerValue;
        Scene.add.existing(this);
        this.MapManager = MapManager;
        this.CameraManager = CameraManager;
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
        let direction = null;

        if((this.MapManager.keyZ.isDown || this.MapManager.keyUp.isDown)){
            if(!this.CanMoveUp()){
                return;
            }
            playAnimation(this, PlayerAnimationNames.WalkUp);
            this.setY(this.y - (2 * speedMultiplier));
            haveMove = true;
            direction = PlayerAnimationNames.WalkUp;
        }
        if((this.MapManager.keyQ.isDown || this.MapManager.keyLeft.isDown)){
            if(!this.CanMoveLeft()){
                return;
            }
            playAnimation(this, PlayerAnimationNames.WalkLeft);
            this.setX(this.x - (2 * speedMultiplier));
            haveMove = true;
            direction = PlayerAnimationNames.WalkLeft;
        }
        if((this.MapManager.keyS.isDown || this.MapManager.keyDown.isDown)){
            if(!this.CanMoveDown()){
                return;
            }
            playAnimation(this, PlayerAnimationNames.WalkDown);
            this.setY(this.y + (2 * speedMultiplier));
            haveMove = true;
            direction = PlayerAnimationNames.WalkDown;
        }
        if((this.MapManager.keyD.isDown || this.MapManager.keyRight.isDown)){
            if(!this.CanMoveRight()){
                return;
            }
            playAnimation(this, PlayerAnimationNames.WalkRight);
            this.setX(this.x + (2 * speedMultiplier));
            haveMove = true;
            direction = PlayerAnimationNames.WalkRight;
        }
        if(!haveMove){
            playAnimation(this, PlayerAnimationNames.None);
            direction = PlayerAnimationNames.None;
        }
        this.sharePosition(direction);
        this.CameraManager.moveCamera(this);
    }

    private sharePosition(direction : string){
        if(ConnexionInstance) {
            ConnexionInstance.sharePosition((this.scene as GameSceneInterface).RoomId, this.x, this.y, direction);
        }
    }

    private CanMoveUp(){
        return this.y > 0;
    }

    private CanMoveLeft(){
        return this.x > 0;
    }

    private CanMoveDown(){
        return this.MapManager.Map.heightInPixels > this.y;
    }

    private CanMoveRight(){
        return this.MapManager.Map.widthInPixels > this.x;
    }

    updatePosition(MessageUserPosition : MessageUserPositionInterface){
        playAnimation(this, MessageUserPosition.position.direction);
        this.setX(MessageUserPosition.position.x);
        this.setY(MessageUserPosition.position.y);
    }
}