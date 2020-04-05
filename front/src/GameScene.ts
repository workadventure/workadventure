import Sprite = Phaser.GameObjects.Sprite;

export class GameScene extends Phaser.Scene {

    private player: Sprite;

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
            frames: this.anims.generateFrameNumbers('player', { start: 0, end: 2 }),
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: 'left',
            frames: this.anims.generateFrameNumbers('player', { start: 3, end: 5 }),
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: 'right',
            frames: this.anims.generateFrameNumbers('player', { start: 6, end: 8 }),
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: 'up',
            frames: this.anims.generateFrameNumbers('player', { start: 9, end: 12 }),
            frameRate: 10,
            repeat: -1
        });

        // TODO: create a Player class extending a Character class that itself extends from physics.Sprite.
        this.player = this.add.sprite(150, 130, 'player');
        this.player.anims.play('right');
        //player.setBounce(0.2);
        //player.setCollideWorldBounds(true);


    }

    private angle: number = 0;

    update(dt: number): void {
        this.cameras.main.scrollX = Math.floor(dt * 0.05);
        this.player.x = Math.floor(dt * 0.05) + 150;
        //this.cameras.main.scrollX = Math.floor(300 + 300 * Math.cos(this.angle));
        //this.cameras.main.scrollY = Math.floor(300 + 300 * Math.sin(this.angle));

        this.angle = dt * 0.0001;
    }
}
