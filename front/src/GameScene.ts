import {RESOLUTION} from "./Enum/EnvironmentVariable";

export class GameScene extends Phaser.Scene {
    private player: Phaser.GameObjects.Sprite;
    
    private keyZ: Phaser.Input.Keyboard.Key;
    private keyQ: Phaser.Input.Keyboard.Key;
    private keyS: Phaser.Input.Keyboard.Key;
    private keyD: Phaser.Input.Keyboard.Key;
    private keyRight: Phaser.Input.Keyboard.Key;
    private keyLeft: Phaser.Input.Keyboard.Key;
    private keyUp: Phaser.Input.Keyboard.Key;
    private keyDown: Phaser.Input.Keyboard.Key;
    private keyShift: Phaser.Input.Keyboard.Key;

    private Mappy : Phaser.Tilemaps.Tilemap;

    private startX = ((window.innerWidth / 2) / RESOLUTION);
    private startY = ((window.innerHeight / 2) / RESOLUTION);

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
        this.keyShift = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
        
        this.keyZ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
        this.keyQ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
        this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

        this.keyUp = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
        this.keyLeft = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
        this.keyDown = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
        this.keyRight = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    }
    
    private moveCamera(x:number, y:number, speedMultiplier: number): void {
        this.cameras.main.scrollX += speedMultiplier * 2 * x;
        this.cameras.main.scrollY += speedMultiplier * 2 * y;
    }

    create(): void {
        this.Mappy = this.add.tilemap("map");
        let terrain = this.Mappy.addTilesetImage("tiles", "tiles");

        let bottomLayer = this.Mappy.createStaticLayer("Calque 1", [terrain], 0, 0);
        let topLayer = this.Mappy.createStaticLayer("Calque 2", [terrain], 0, 0);

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
            frames: this.anims.generateFrameNumbers('player', { start: 9, end: 11 }),
            frameRate: 10,
            repeat: -1
        });

        //let player = this.add.sprite(450, 450, 'player');
        //player.anims.play('down');
        //player.setBounce(0.2);
        //player.setCollideWorldBounds(true);
        this.player = this.add.sprite(this.startX, this.startY, 'player');
    }

    private angle: number = 0;

    update(dt: number): void {
        let xCameraPosition = this.cameras.main.scrollX;
        let yCameraPosition = this.cameras.main.scrollY;

        let speedMultiplier = this.keyShift.isDown ? 5 : 1;

        if (this.keyZ.isDown || this.keyUp.isDown) {
            this.managePlayerAnimation('up');
            if (this.player.y > 0) {
                this.player.setY(this.player.y - 2);
            } else {
                this.player.setY(0);
            }

            if (yCameraPosition > 0) {
                if (this.player.y < (this.Mappy.widthInPixels - this.startY)) {
                    this.moveCamera(0, -1, speedMultiplier);
                }
            } else {
                this.cameras.main.scrollY = 0;
            }
        } else if (this.keyQ.isDown || this.keyLeft.isDown) {

            this.managePlayerAnimation('left');
            if (this.player.x > 0) {
                this.player.setX(this.player.x - 2);
            } else {
                this.player.setX(0);
            }

            if (xCameraPosition > 0) {
                if (this.player.x < (this.Mappy.heightInPixels - this.startX)) {
                    this.moveCamera(-1, 0, speedMultiplier);
                }
            } else {
                this.cameras.main.scrollX = 0;
            }
        } else if (this.keyS.isDown || this.keyDown.isDown) {

            this.managePlayerAnimation('down');
            if (this.Mappy.heightInPixels > this.player.y) {
                this.player.setY(this.player.y + 2);
            } else {
                this.player.setY(this.Mappy.heightInPixels);
            }

            if (this.Mappy.heightInPixels > (yCameraPosition + (window.innerHeight / RESOLUTION))) {
                if (this.player.y > this.startY) {
                    this.moveCamera(0, 1, speedMultiplier);
                }
            } else {
                this.cameras.main.scrollY = (this.Mappy.heightInPixels - (window.innerHeight / RESOLUTION));
            }
        } else if (this.keyD.isDown || this.keyRight.isDown) {

            this.managePlayerAnimation('right');
            if (this.Mappy.widthInPixels > this.player.x) {
                this.player.setX(this.player.x + 2)
            } else {
                this.player.setX(this.Mappy.widthInPixels)
            }

            if (this.Mappy.widthInPixels > (xCameraPosition + (window.innerWidth / RESOLUTION))) {
                if (this.player.x > this.startX) {
                    this.moveCamera(1, 0, speedMultiplier);
                }
            } else {
                this.cameras.main.scrollX = (this.Mappy.widthInPixels - (window.innerWidth / RESOLUTION));
            }
        } else {
            this.managePlayerAnimation('none');
        }
        /*this.cameras.main.scrollX = Math.floor(300 + 300 * Math.cos(this.angle));
        this.cameras.main.scrollY = Math.floor(300 + 300 * Math.sin(this.angle));

        this.angle = dt * 0.0001;*/
    }
    
    managePlayerAnimation(direction: string) {
        if (!this.player.anims.currentAnim || this.player.anims.currentAnim.key !== direction) {
            this.player.anims.play(direction);
        } else if (direction === 'none' && this.player.anims.currentAnim) {
            this.player.anims.currentAnim.destroy();
        } 
    }
}
