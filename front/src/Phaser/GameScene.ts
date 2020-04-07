import {MapManagerInterface, MapManager} from "./MapManager";

export class GameScene extends Phaser.Scene {
    private MapManager : MapManagerInterface;

    constructor() {
        super({
            key: "GameScene"
        });
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
    init(){};

    //hook create scene
    create(): void {
        //create map manager
        this.MapManager = new MapManager(this);
    }

    //hook update
    update(dt: number): void {
        this.MapManager.update();
    }
}
