import {CameraManager, CameraManagerInterface} from "./CameraManager";
import {RESOLUTION} from "../../Enum/EnvironmentVariable";
import {Player} from "../Player/Player";
import {GameSceneInterface} from "./GameScene";
import {MessageUserPositionInterface} from "../../Connexion";

export interface MapManagerInterface {
    keyZ: Phaser.Input.Keyboard.Key;
    keyQ: Phaser.Input.Keyboard.Key;
    keyS: Phaser.Input.Keyboard.Key;
    keyD: Phaser.Input.Keyboard.Key;
    keyRight: Phaser.Input.Keyboard.Key;
    keyLeft: Phaser.Input.Keyboard.Key;
    keyUp: Phaser.Input.Keyboard.Key;
    keyDown: Phaser.Input.Keyboard.Key;
    keyShift: Phaser.Input.Keyboard.Key;

    Map: Phaser.Tilemaps.Tilemap;
    Terrain: Phaser.Tilemaps.Tileset;
    Camera: CameraManagerInterface;
    Scene: GameSceneInterface;

    createCurrentPlayer(UserId : string): void;
    update(): void;
    updateOrCreateMapPlayer(UsersPosition : Array<MessageUserPositionInterface>): void;
}
export class MapManager implements MapManagerInterface{
    keyZ: Phaser.Input.Keyboard.Key;
    keyQ: Phaser.Input.Keyboard.Key;
    keyS: Phaser.Input.Keyboard.Key;
    keyD: Phaser.Input.Keyboard.Key;
    keyRight: Phaser.Input.Keyboard.Key;
    keyLeft: Phaser.Input.Keyboard.Key;
    keyUp: Phaser.Input.Keyboard.Key;
    keyDown: Phaser.Input.Keyboard.Key;
    keyShift: Phaser.Input.Keyboard.Key;

    Terrain : Phaser.Tilemaps.Tileset;
    Camera: CameraManagerInterface;
    CurrentPlayer: Player;
    MapPlayers : Player[];
    Scene: GameSceneInterface;
    Map: Phaser.Tilemaps.Tilemap;
    startX = (window.innerWidth / 2) / RESOLUTION;
    startY = (window.innerHeight / 2) / RESOLUTION;

    constructor(scene: GameSceneInterface){
        this.Scene = scene;

        //initalise map
        this.Map = this.Scene.add.tilemap("map");
        this.Terrain = this.Map.addTilesetImage("tiles", "tiles");
        this.Map.createStaticLayer("tiles", "tiles");
        this.Map.createStaticLayer("Calque 1", [this.Terrain], 0, 0);
        this.Map.createStaticLayer("Calque 2", [this.Terrain], 0, 0);

        //initialise keyboard
        this.initKeyBoard();
        //initialise camera
        this.Camera = new CameraManager(this.Scene, this.Scene.cameras.main, this);
        //initialise list of other player
        this.MapPlayers = new Array<Player>();
    }

    createCurrentPlayer(UserId : string){
        //initialise player
        this.CurrentPlayer = new Player(
            UserId,
            this.Scene,
            this.startX,
            this.startY,
            this.Camera,
            this
        );
        this.CurrentPlayer.initAnimation();
    }

    initKeyBoard() {
        this.keyShift = this.Scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

        this.keyZ = this.Scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
        this.keyQ = this.Scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
        this.keyS = this.Scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.keyD = this.Scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

        this.keyUp = this.Scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
        this.keyLeft = this.Scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
        this.keyDown = this.Scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
        this.keyRight = this.Scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    }

    update() : void {
        this.CurrentPlayer.move();
    }

    /**
     * Create new player and clean the player on the map
     * @param UsersPosition
     */
    updateOrCreateMapPlayer(UsersPosition : Array<MessageUserPositionInterface>){
        if(!this.CurrentPlayer){
            return;
        }

        //add or create new user
        UsersPosition.forEach((userPosition : MessageUserPositionInterface) => {
            if(userPosition.userId === this.CurrentPlayer.userId){
                return;
            }
            let player = this.MapPlayers.find((player: Player) => userPosition.userId === player.userId);
            if(!player){
                this.addPlayer(userPosition);
            }else{
                player.updatePosition(userPosition);
            }
        });

        //clean map
        let mapPlayers = new Array<Player>();
        this.MapPlayers.forEach((player: Player) => {
            if(UsersPosition.find((message : MessageUserPositionInterface) => message.userId === player.userId)){
                mapPlayers.push(player);
                return;
            }
            player.destroy();
        });
        this.MapPlayers = mapPlayers;
    }

    /**
     * Create new player
     * @param MessageUserPosition
     */
    addPlayer(MessageUserPosition : MessageUserPositionInterface){
        //initialise player
        let player = new Player(
            MessageUserPosition.userId,
            this.Scene,
            MessageUserPosition.position.x,
            MessageUserPosition.position.y,
            this.Camera,
            this
        );
        player.initAnimation();
        this.MapPlayers.push(player);
        player.updatePosition(MessageUserPosition)
    }
}