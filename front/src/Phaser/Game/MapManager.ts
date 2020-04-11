import {CameraManager, CameraManagerInterface} from "./CameraManager";
import {RESOLUTION} from "../../Enum/EnvironmentVariable";
import {Player} from "../Player/Player";
import {Rock} from "../Rock/Rock";
import {GameSceneInterface} from "./GameScene";
import {UserInputEvent, UserInputManager} from "../UserInput/UserInputManager";

export interface MapManagerInterface {
    Map: Phaser.Tilemaps.Tilemap;
    Terrain: Phaser.Tilemaps.Tileset;
    Camera: CameraManagerInterface;
    Scene: GameSceneInterface;
    userInputManager: UserInputManager;
    update(): void;
}
export class MapManager implements MapManagerInterface{
    Terrain : Phaser.Tilemaps.Tileset;
    Camera: CameraManagerInterface;
    CurrentPlayer: Player;
    Scene: GameSceneInterface;
    Map: Phaser.Tilemaps.Tilemap;
    startX = (window.innerWidth / 2) / RESOLUTION;
    startY = (window.innerHeight / 2) / RESOLUTION;
    userInputManager: UserInputManager;
    private rock: Rock;

    constructor(scene: GameSceneInterface){
        this.Scene = scene;

        //initalise map
        this.Map = this.Scene.add.tilemap("map");
        this.Terrain = this.Map.addTilesetImage("tiles", "tiles");
        this.Map.createStaticLayer("tiles", "tiles");
        this.Map.createStaticLayer("Calque 1", [this.Terrain], 0, 0);
        this.Map.createStaticLayer("Calque 2", [this.Terrain], 0, 0);

        //initialise camera
        this.Camera = new CameraManager(this.Scene, this.Scene.cameras.main, this);
        this.userInputManager = new UserInputManager(this.Scene);
        //initialise player
        this.CurrentPlayer = new Player(
            this.Scene,
            this.startX,
            this.startY,
            this.Camera,
            this
        );
        this.CurrentPlayer.initAnimation();
        this.rock = new Rock(
            this.Scene,
            100,
            300,
        );
        //this.rock.set()
    }

    update() : void {
        let activeEvents = this.userInputManager.getEventListForGameTick();
        
        this.CurrentPlayer.move(activeEvents);
        
        /*if (activeEvents.get(UserInputEvent.Interact)) {
            
        }*/
    }
}