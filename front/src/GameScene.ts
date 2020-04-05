
export class GameScene extends Phaser.Scene {

    constructor() {
        super({
            key: "GameScene"
        });
    }

    preload(): void {
        this.load.image('tiles', 'maps/tiles.png');
        this.load.tilemapTiledJSON('map', 'maps/map2.json');
        this.load.spritesheet('player',
            'resources/characters/pipoya/Male 01-1.png',
            { frameWidth: 32, frameHeight: 32 }
        );
    }

    init(): void {
    }

    create(): void {
        let mappy = this.add.tilemap("map");
        let terrain = mappy.addTilesetImage("tiles", "tiles");

        let bottomLayer = mappy.createStaticLayer("Calque 1", [terrain], 0, 0);
        let topLayer = mappy.createStaticLayer("Calque 2", [terrain], 0, 0);

        // Let's manage animations of the player
        this.anims.create({
            key: 'down',
            frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: 'left',
            frames: this.anims.generateFrameNumbers('player', { start: 4, end: 8 }),
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: 'right',
            frames: this.anims.generateFrameNumbers('player', { start: 9, end: 12 }),
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: 'up',
            frames: this.anims.generateFrameNumbers('player', { start: 13, end: 16 }),
            frameRate: 10,
            repeat: -1
        });

        //let player = this.add.sprite(450, 450, 'player');
        //player.anims.play('down');
        //player.setBounce(0.2);
        //player.setCollideWorldBounds(true);


    }

    private angle: number = 0;

    update(dt: number): void {
        this.cameras.main.scrollX = Math.floor(300 + 300 * Math.cos(this.angle));
        this.cameras.main.scrollY = Math.floor(300 + 300 * Math.sin(this.angle));

        this.angle = dt * 0.0001;
    }
}
