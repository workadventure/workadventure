import {MapManagerInterface, MapManager} from "./MapManager";
import {GameManagerInterface} from "./GameManager";

export interface GameSceneInterface extends Phaser.Scene {
    RoomId : string;
    sharedUserPosition(data : []): void;
}
export class GameScene extends Phaser.Scene implements GameSceneInterface{
    private MapManager : MapManagerInterface;
    RoomId : string;

    constructor(RoomId : string, GameManager : GameManagerInterface) {
        super({
            key: "GameScene"
        });
        this.RoomId = RoomId;
    }

    //hook preload scene
    preload(): void {
        this.load.image('tiles', 'maps/tiles.png');
        this.load.tilemapTiledJSON('map', 'maps/map2.json');
        this.load.spritesheet('player',
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
    }

    //hook update
    update(dt: number): void {
        this.MapManager.update();
    }

    sharedUserPosition(data: []): void {
        //TODO share position of all user
        //console.log("sharedUserPosition", data);
    }
}
