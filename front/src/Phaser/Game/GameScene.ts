import {GameManagerInterface, StatusGameManagerEnum} from "./GameManager";
import {MessageUserPositionInterface} from "../../Connexion";
import {CameraManager, CameraManagerInterface} from "./CameraManager";
import {CurrentGamerInterface, GamerInterface, Player} from "../Player/Player";
import {RESOLUTION} from "../../Enum/EnvironmentVariable";
import Tile = Phaser.Tilemaps.Tile;

export enum Textures {
    Rock = 'rock',
    Player = 'playerModel',
    Map = 'map',
    Tiles = 'tiles'
}

export interface GameSceneInterface extends Phaser.Scene {
    RoomId : string;
    Map: Phaser.Tilemaps.Tilemap;
    createCurrentPlayer(UserId : string) : void;
    shareUserPosition(UsersPosition : Array<MessageUserPositionInterface>): void;
}
export class GameScene extends Phaser.Scene implements GameSceneInterface{
    GameManager : GameManagerInterface;
    RoomId : string;
    Terrain : Phaser.Tilemaps.Tileset;
    Camera: CameraManagerInterface;
    CurrentPlayer: CurrentGamerInterface;
    MapPlayers : Phaser.Physics.Arcade.Group;
    Map: Phaser.Tilemaps.Tilemap;
    Layers : Array<Phaser.Tilemaps.StaticTilemapLayer>;
    Objects : Array<Phaser.Physics.Arcade.Sprite>;
    startX = (window.innerWidth / 2) / RESOLUTION;
    startY = (window.innerHeight / 2) / RESOLUTION;

    constructor(RoomId : string, GameManager : GameManagerInterface) {
        super({
            key: "GameScene"
        });
        this.RoomId = RoomId;
        this.GameManager = GameManager;
    }

    //hook preload scene
    preload(): void {
        this.load.image(Textures.Tiles, 'maps/tiles.png');
        this.load.tilemapTiledJSON(Textures.Map, 'maps/map2.json');
        this.load.image(Textures.Rock, 'resources/objects/rockSprite.png');
        this.load.spritesheet(Textures.Player,
            'resources/characters/pipoya/Male 01-1.png',
            { frameWidth: 32, frameHeight: 32 }
        );
    }

    //hook initialisation
    init(){}

    //hook create scene
    create(): void {

        //initalise map
        this.Map = this.add.tilemap("map");
        this.Terrain = this.Map.addTilesetImage("tiles", "tiles");
        this.Map.createStaticLayer("tiles", "tiles");

        //permit to set bound collision
        this.physics.world.setBounds(0,0, this.Map.widthInPixels, this.Map.heightInPixels);

        //add layer on map
        this.Layers = new Array<Phaser.Tilemaps.StaticTilemapLayer>();
        this.addLayer( this.Map.createStaticLayer("bottom", [this.Terrain], 0, 0).setDepth(-2) );
        this.addLayer( this.Map.createStaticLayer("top", [this.Terrain], 0, 0).setDepth(-1) );

        //add entities
        this.Objects = new Array<Phaser.Physics.Arcade.Sprite>();
        this.addSpite(this.physics.add.sprite(200, 400, Textures.Rock, 26));

        //init event click
        this.EventToClickOnTile();

        //initialise camera
        this.Camera = new CameraManager(this, this.cameras.main);

        //initialise list of other player
        this.MapPlayers = this.physics.add.group({ immovable: true });

        //notify game manager can to create currentUser in map
        this.GameManager.createCurrentPlayer();
    }

    addLayer(Layer : Phaser.Tilemaps.StaticTilemapLayer){
        this.Layers.push(Layer);
    }

    createCollisionWithPlayer() {
        //add collision layer
        this.Layers.forEach((Layer: Phaser.Tilemaps.StaticTilemapLayer) => {
            this.physics.add.collider(this.CurrentPlayer, Layer, (object1: any, object2: any) => {
                //this.CurrentPlayer.say("Collision with layer : "+ (object2 as Tile).layer.name)
            });
            Layer.setCollisionByProperty({collides: true});
            //debug code
            //debug code to see the collision hitbox of the object in the top layer
            /*Layer.renderDebug(this.add.graphics(), {
                tileColor: null, //non-colliding tiles
                collidingTileColor: new Phaser.Display.Color(243, 134, 48, 200), // Colliding tiles,
                faceColor: new Phaser.Display.Color(40, 39, 37, 255) // Colliding face edges
            });*/
        });
    }

    addSpite(Object : Phaser.Physics.Arcade.Sprite){
        Object.setImmovable(true);
        this.Objects.push(Object);
    }

    createCollisionObject(){
        this.Objects.forEach((Object : Phaser.Physics.Arcade.Sprite) => {
            this.physics.add.collider(this.CurrentPlayer, Object, (object1: any, object2: any) => {
                //this.CurrentPlayer.say("Collision with object : " + (object2 as Phaser.Physics.Arcade.Sprite).texture.key)
            });
        })
    }

    createCurrentPlayer(UserId : string){
        //initialise player
        this.CurrentPlayer = new Player(
            UserId,
            this,
            this.startX,
            this.startY,
            this.Camera,
        );
        this.CurrentPlayer.initAnimation();

        //create collision
        this.createCollisionWithPlayer();
        this.createCollisionObject();
    }

    EventToClickOnTile(){
        // debug code to get a tile properties by clicking on it
        this.input.on("pointerdown", (pointer: Phaser.Input.Pointer)=>{
            //pixel position toz tile position
            let tile = this.Map.getTileAt(this.Map.worldToTileX(pointer.worldX), this.Map.worldToTileY(pointer.worldY));
            if(tile){
                this.CurrentPlayer.say("Your touch " + tile.layer.name);
            }
        });
    }

    update() : void {
        this.CurrentPlayer.moveUser();
    }

    /**
     * Share position in scene
     * @param UsersPosition
     */
    shareUserPosition(UsersPosition : Array<MessageUserPositionInterface>): void {
        this.updateOrCreateMapPlayer(UsersPosition);
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
            this,
            MessageUserPosition.position.x,
            MessageUserPosition.position.y,
            this.Camera,
        );
        player.initAnimation();
        this.MapPlayers.add(player);
        player.updatePosition(MessageUserPosition);

        //init colision
        this.physics.add.collider(this.CurrentPlayer, player, (CurrentPlayer: CurrentGamerInterface, MapPlayer: GamerInterface) => {
            CurrentPlayer.say("Hello, how are you ? ");
        });
    }
}
