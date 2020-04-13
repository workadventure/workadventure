import {CameraManager, CameraManagerInterface} from "./CameraManager";
import {RESOLUTION} from "../../Enum/EnvironmentVariable";
import {CurrentGamerInterface, GamerInterface, Player} from "../Player/Player";
import {GameSceneInterface, Textures} from "./GameScene";
import {MessageUserPositionInterface} from "../../Connexion";
import {NonPlayer} from "../NonPlayer/NonPlayer";

export interface MapManagerInterface {
    Map: Phaser.Tilemaps.Tilemap;
    Terrain: Phaser.Tilemaps.Tileset;
    Camera: CameraManagerInterface;
    Scene: GameSceneInterface;

    createCurrentPlayer(UserId : string): void;
    update(): void;
    updateOrCreateMapPlayer(UsersPosition : Array<MessageUserPositionInterface>): void;
}
export class MapManager implements MapManagerInterface{
    Terrain : Phaser.Tilemaps.Tileset;
    Camera: CameraManagerInterface;
    CurrentPlayer: CurrentGamerInterface;
    MapPlayers : Phaser.Physics.Arcade.Group;
    Scene: GameSceneInterface;
    Map: Phaser.Tilemaps.Tilemap;
    BottomLayer: Phaser.Tilemaps.StaticTilemapLayer;
    TopLayer: Phaser.Tilemaps.StaticTilemapLayer;
    startX = (window.innerWidth / 2) / RESOLUTION;
    startY = (window.innerHeight / 2) / RESOLUTION;

    //entities
    private rock: Phaser.Physics.Arcade.Sprite;

    constructor(scene: GameSceneInterface){
        this.Scene = scene;

        //initalise map
        this.Map = this.Scene.add.tilemap("map");
        this.Terrain = this.Map.addTilesetImage("tiles", "tiles");
        this.Map.createStaticLayer("tiles", "tiles");
        this.BottomLayer = this.Map.createStaticLayer("Calque 1", [this.Terrain], 0, 0).setDepth(-2);
        this.TopLayer = this.Map.createStaticLayer("Calque 2", [this.Terrain], 0, 0).setDepth(-1);
        this.Scene.physics.world.setBounds(0,0, this.Map.widthInPixels, this.Map.heightInPixels);

        //add entitites
        this.rock = this.Scene.physics.add.sprite(200, 400, Textures.Rock, 26).setImmovable(true);

        //debug code
        //debug code to see the collision hitbox of the object in the top layer
        this.TopLayer.renderDebug(this.Scene.add.graphics(),{
            tileColor: null, //non-colliding tiles
            collidingTileColor: new Phaser.Display.Color(243, 134, 48, 200), // Colliding tiles,
            faceColor: new Phaser.Display.Color(40, 39, 37, 255) // Colliding face edges
        });

        //init event click
        this.EventToClickOnTile();

        //initialise camera
        this.Camera = new CameraManager(this.Scene, this.Scene.cameras.main, this);

        //initialise list of other player
        this.MapPlayers = this.Scene.physics.add.group({ immovable: true });
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

        //create collision
        this.Scene.physics.add.collider(this.CurrentPlayer, this.rock);
        //add collision layer
        this.Scene.physics.add.collider(this.CurrentPlayer, this.TopLayer);
        this.TopLayer.setCollisionByProperty({collides:true});
    }

    EventToClickOnTile(){
        // debug code to get a tile properties by clicking on it
        this.Scene.input.on("pointerdown", (pointer: Phaser.Input.Pointer)=>{
            //pixel position toz tile position
            let tile = this.Map.getTileAt(this.Map.worldToTileX(pointer.worldX), this.Map.worldToTileY(pointer.worldY));
            if(tile){
                //console.log("MapManager => tile => pointerdown", tile);
                this.CurrentPlayer.say("Your touch " + tile.layer.name);
            }
        });
    }

    update() : void {
        this.CurrentPlayer.moveUser();
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
            let player = this.findPlayerInMap(userPosition.userId);
            if(!player){
                this.addPlayer(userPosition);
            }else{
                player.updatePosition(userPosition);
            }
        });

        //clean map
        this.MapPlayers.getChildren().forEach((player: GamerInterface) => {
            if(UsersPosition.find((message : MessageUserPositionInterface) => message.userId === player.userId)){
                return;
            }
            player.destroy();
            this.MapPlayers.remove(player);
        });
    }

    private findPlayerInMap(UserId : string) : GamerInterface | null{
        let player = this.MapPlayers.getChildren().find((player: Player) => UserId === player.userId);
        if(!player){
            return null;
        }
        return (player as GamerInterface);
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
        this.MapPlayers.add(player);
        player.updatePosition(MessageUserPosition);

        //init colision
        this.Scene.physics.add.collider(this.CurrentPlayer, player, (CurrentPlayer: CurrentGamerInterface, MapPlayer: GamerInterface) => {
            MapPlayer.say("Hello, how are you ? ");
        });
    }
}