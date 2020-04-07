import {RESOLUTION} from "../../Enum/EnvironmentVariable";
import {Player} from "../Player/Player";
import {MapManagerInterface} from "./MapManager";

export interface CameraManagerInterface {
    CurrentPlayer : Player;
    MapManager : MapManagerInterface;
    moveCamera() : void;
}

export class CameraManager implements CameraManagerInterface{
    Scene : Phaser.Scene;
    Camera : Phaser.Cameras.Scene2D.Camera;
    CurrentPlayer : Player;
    MapManager : MapManagerInterface;

    constructor(
        Scene: Phaser.Scene,
        Camera : Phaser.Cameras.Scene2D.Camera,
        MapManager: MapManagerInterface,
        CurrentPlayer: Player
    ) {
        this.Scene = Scene;
        this.MapManager = MapManager;
        this.Camera = Camera;
        this.CurrentPlayer = CurrentPlayer;
    }
    /**
     *
     * @param x
     * @param y
     * @param speedMultiplier
     */
    private moveCameraPosition(x:number, y:number, speedMultiplier: number): void {
        this.Camera.scrollX += speedMultiplier * 2 * x;
        this.Camera.scrollY += speedMultiplier * 2 * y;
    }

    /**
     *
     */
    moveCamera(): void {
        //center of camera
        let startX = ((window.innerWidth / 2) / RESOLUTION);
        let startY = ((window.innerHeight / 2) / RESOLUTION);

        //if user client on shift, camera and player speed
        let speedMultiplier = this.MapManager.keyShift.isDown ? 5 : 1;

        if (this.MapManager.keyZ.isDown || this.MapManager.keyUp.isDown) {
            if (!this.CanToMoveUp()) {
                this.Camera.scrollY = 0;
            }else if (this.CurrentPlayer.y < (this.MapManager.Map.widthInPixels - startY)) {
                this.moveCameraPosition(0, -1, speedMultiplier);
            }
        }
        if (this.MapManager.keyQ.isDown || this.MapManager.keyLeft.isDown) {
            if (!this.CanToMoveLeft()) {
                this.Camera.scrollX = 0;
            }else if (this.CurrentPlayer.x < (this.MapManager.Map.heightInPixels - startX)) {
                this.moveCameraPosition(-1, 0, speedMultiplier);
            }
        }
        if (this.MapManager.keyS.isDown || this.MapManager.keyDown.isDown) {
            if (!this.CanToMoveDown()) {
                this.Camera.scrollY = (this.MapManager.Map.heightInPixels - (window.innerHeight / RESOLUTION));
            } else if (this.CurrentPlayer.y > startY) {
                this.moveCameraPosition(0, 1, speedMultiplier);
            }
        }
        if (this.MapManager.keyD.isDown || this.MapManager.keyRight.isDown) {
            if (!this.CanToMoveRight()) {
                this.Camera.scrollX = (this.MapManager.Map.widthInPixels - (window.innerWidth / RESOLUTION));
            } else if (this.CurrentPlayer.x > startX) {
                this.moveCameraPosition(1, 0, speedMultiplier);
            }
        }
    }

    private CanToMoveUp(){
        return this.Camera.scrollY > 0;
    }

    private CanToMoveLeft(){
        return this.Camera.scrollX > 0;
    }

    private CanToMoveDown(){
        return this.MapManager.Map.heightInPixels > (this.Camera.scrollY + (window.innerHeight / RESOLUTION))
    }

    private CanToMoveRight(){
        return this.MapManager.Map.widthInPixels > (this.Camera.scrollX + (window.innerWidth / RESOLUTION))
    }
}