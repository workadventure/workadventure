import {GameManagerInterface} from "./GameManager";
import {UserInputManager} from "../UserInput/UserInputManager";
import {getPlayerAnimations, PlayerAnimationNames} from "../Player/Animation";
import {Player} from "../Player/Player";
import {NonPlayer} from "../NonPlayer/NonPlayer";

export enum Textures {
    Rock = 'rock',
    Player = 'playerModel',
    Map = 'map',
    Tiles = 'tiles'
}

export interface GameSceneInterface extends Phaser.Scene {
    RoomId : string;
    sharedUserPosition(data : []): void;
}
export class GameScene extends Phaser.Scene implements GameSceneInterface{
    //private MapManager : MapManagerInterface;
    RoomId : string;
    private player: Player;
    private rock: Phaser.Physics.Arcade.Sprite;
    private userInputManager: UserInputManager;
    private otherPlayers: Phaser.Physics.Arcade.Group;

    constructor(RoomId : string, GameManager : GameManagerInterface) {
        super({
            key: "GameScene"
        });
        this.RoomId = RoomId;
    }

    //hook preload scene
    preload(): void {
        this.load.image(Textures.Rock, 'resources/objects/rockSprite.png');
        this.load.image(Textures.Tiles, 'maps/tiles.png');
        this.load.tilemapTiledJSON(Textures.Map, 'maps/map2.json');
        this.load.spritesheet(Textures.Player,
            'resources/characters/pipoya/Male 01-1.png',
            { frameWidth: 32, frameHeight: 32 }
        );
    }

    //hook create scene
    create(): void {
        //anims cannot be in preload because it needs to wait to the sprit to be loaded
        getPlayerAnimations().forEach(d => {
            this.anims.create({
                key: d.key,
                frames: this.anims.generateFrameNumbers(d.frameModel, { start: d.frameStart, end: d.frameEnd }),
                frameRate: d.frameRate,
                //repeat: d.repeat
            });
        });
        
        this.userInputManager = new UserInputManager(this);

        //create entities
        this.player = new Player(this, 400, 400);
        this.rock = this.physics.add.sprite(200, 400, Textures.Rock, 26).setImmovable(true);
        this.physics.add.collider(this.player, this.rock);
        
        this.otherPlayers = this.physics.add.group({ immovable: true });
        this.otherPlayers.add(new NonPlayer(this, 200, 600));
        this.otherPlayers.add(new NonPlayer(this, 400, 600));

        this.physics.add.collider(this.player, this.otherPlayers);
        
        //create map
        let currentMap = this.add.tilemap(Textures.Map);
        let terrain = currentMap.addTilesetImage(Textures.Tiles, "tiles");
        let bottomLayer = currentMap.createStaticLayer("Calque 1", [terrain], 0, 0).setDepth(-2);
        let topLayer =  currentMap.createStaticLayer("Calque 2", [terrain], 0, 0).setDepth(-1);
        this.physics.world.setBounds(0,0, currentMap.widthInPixels, currentMap.heightInPixels);
        
        this.physics.add.collider(this.player, topLayer);
        topLayer.setCollisionByProperty({collides:true});

        
        this.cameras.main.startFollow(this.player);

        
        
        //debug code
        //debug code to see the collision hitbox of the object in the top layer
        topLayer.renderDebug(this.add.graphics(),{
            tileColor: null, //non-colliding tiles
            collidingTileColor: new Phaser.Display.Color(243, 134, 48, 200), // Colliding tiles,
            faceColor: new Phaser.Display.Color(40, 39, 37, 255) // Colliding face edges
        })
        
        // debug code to get a tile properties by clicking on it
        this.input.on("pointerdown", (pointer: Phaser.Input.Pointer)=>{
            //pixel position to tile position
            let tile = currentMap.getTileAt(currentMap.worldToTileX(pointer.worldX), currentMap.worldToTileY(pointer.worldY));
            if(tile){
                console.log(tile);
            }
        });
    }

    //hook update
    update(dt: number): void {
        let eventList = this.userInputManager.getEventListForGameTick();
        
        this.player.move(eventList);
        
        this.otherPlayers.getChildren().forEach((otherPlayer: NonPlayer) => {
            //this.physics.accelerateToObject(otherPlayer, this.player); //this line make the models chase the player
            otherPlayer.setVelocity(20, 5);
        })
    }

    sharedUserPosition(data: []): void {
        //TODO share position of all user
        //console.log("sharedUserPosition", data);
    }
}
