
export class GameScene extends Phaser.Scene {

    constructor() {
        super({
            key: "GameScene"
        });
    }

    preload(): void {
        this.load.image('tiles', 'maps/tiles.png');
        this.load.tilemapTiledJSON('map', 'maps/map2.json');
    }

    init(): void {
    }

    create(): void {
        let mappy = this.add.tilemap("map");
        let terrain = mappy.addTilesetImage("tiles", "tiles");

        let bottomLayer = mappy.createStaticLayer("Calque 1", [terrain], 0, 0);
        let topLayer = mappy.createStaticLayer("Calque 2", [terrain], 0, 0);

    }

    private angle: number = 0;

    update(dt: number): void {
        this.cameras.main.scrollX = Math.floor(300 + 300 * Math.cos(this.angle));
        this.cameras.main.scrollY = Math.floor(300 + 300 * Math.sin(this.angle));

        this.angle = dt * 0.0001;
    }
}
