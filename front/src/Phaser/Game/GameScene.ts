import {MapManagerInterface, MapManager} from "./MapManager";
import {GameManagerInterface, StatusGameManagerEnum} from "./GameManager";
import {MessageUserPositionInterface} from "../../Connexion";

export enum Textures {
    Rock = 'rock',
    Player = 'playerModel',
    Map = 'map',
    Tiles = 'tiles'
}

export interface GameSceneInterface extends Phaser.Scene {
    RoomId : string;
    createCurrentPlayer(UserId : string) : void;
    shareUserPosition(UsersPosition : Array<MessageUserPositionInterface>): void;
}
export class GameScene extends Phaser.Scene implements GameSceneInterface{
    private MapManager : MapManagerInterface;
    GameManager : GameManagerInterface;
    RoomId : string;

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
        //create map manager
        this.MapManager = new MapManager(this);
        //notify game manager can to create currentUser in map
        this.GameManager.createCurrentPlayer();
    }

    /**
     * Create current player
     * @param UserId
     */
    createCurrentPlayer(UserId : string): void {
        this.MapManager.createCurrentPlayer(UserId)
    }

    //hook update
    update(dt: number): void {
        if(this.GameManager.status === StatusGameManagerEnum.IN_PROGRESS){
            return;
        }
        this.MapManager.update();
    }

    /**
     * Share position in scene
     * @param UsersPosition
     */
    shareUserPosition(UsersPosition : Array<MessageUserPositionInterface>): void {
        this.MapManager.updateOrCreateMapPlayer(UsersPosition);
    }
}
