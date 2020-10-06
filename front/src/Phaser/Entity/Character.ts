import {PlayerAnimationNames} from "../Player/Animation";
import {SpeechBubble} from "./SpeechBubble";
import BitmapText = Phaser.GameObjects.BitmapText;
import Container = Phaser.GameObjects.Container;
import Sprite = Phaser.GameObjects.Sprite;

export interface PlayerResourceDescriptionInterface {
    name: string,
    img: string
}

export const PLAYER_RESOURCES: Array<PlayerResourceDescriptionInterface> = [
    {name: "male1", img: "resources/characters/pipoya/Male 01-1.png" /*, x: 32, y: 32*/},
    {name: "male2", img: "resources/characters/pipoya/Male 02-2.png"/*, x: 64, y: 32*/},
    {name: "male3", img: "resources/characters/pipoya/Male 03-4.png"/*, x: 96, y: 32*/},
    {name: "male4", img: "resources/characters/pipoya/Male 09-1.png"/*, x: 128, y: 32*/},

    {name: "male5", img: "resources/characters/pipoya/Male 10-3.png"/*, x: 32, y: 64*/},
    {name: "male6", img: "resources/characters/pipoya/Male 17-2.png"/*, x: 64, y: 64*/},
    {name: "male7", img: "resources/characters/pipoya/Male 18-1.png"/*, x: 96, y: 64*/},
    {name: "male8", img: "resources/characters/pipoya/Male 16-4.png"/*, x: 128, y: 64*/},

    {name: "Female1", img: "resources/characters/pipoya/Female 01-1.png"/*, x: 32, y: 96*/},
    {name: "Female2", img: "resources/characters/pipoya/Female 02-2.png"/*, x: 64, y: 96*/},
    {name: "Female3", img: "resources/characters/pipoya/Female 03-4.png"/*, x: 96, y: 96*/},
    {name: "Female4", img: "resources/characters/pipoya/Female 09-1.png"/*, x: 128, y: 96*/},

    {name: "Female5", img: "resources/characters/pipoya/Female 10-3.png"/*, x: 32, y: 128*/},
    {name: "Female6", img: "resources/characters/pipoya/Female 17-2.png"/*, x: 64, y: 128*/},
    {name: "Female7", img: "resources/characters/pipoya/Female 18-1.png"/*, x: 96, y: 128*/},
    {name: "Female8", img: "resources/characters/pipoya/Female 16-4.png"/*, x: 128, y: 128*/}
];

interface AnimationData {
    key: string;
    frameRate: number;
    repeat: number;
    frameModel: string; //todo use an enum
    frameStart: number;
    frameEnd: number;
}

export abstract class Character extends Container {
    private bubble: SpeechBubble|null = null;
    private readonly playerName: BitmapText;
    public PlayerValue: string;
    public sprites: Map<string, Sprite>;
    private lastDirection: string = PlayerAnimationNames.WalkDown;
    private report: Sprite;
    private teleportation: Sprite;

    constructor(scene: Phaser.Scene,
                x: number,
                y: number,
                textures: string[],
                name: string,
                direction: string,
                moving: boolean,
                frame?: string | number
    ) {
        super(scene, x, y/*, texture, frame*/);

        this.sprites = new Map<string, Sprite>();

        for (const texture of textures) {
            const sprite = new Sprite(scene, 0, 0, texture, frame);
            sprite.setInteractive({useHandCursor: true});
            sprite.on('pointerover', () => {
                this.report.visible = true;
                this.teleportation.visible = true;
            });
            sprite.on('pointerup', () => {
                this.report.visible = true;
                this.teleportation.visible = true;
            });
            this.add(sprite);
            this.getPlayerAnimations(texture).forEach(d => {
                this.scene.anims.create({
                    key: d.key,
                    frames: this.scene.anims.generateFrameNumbers(d.frameModel, {start: d.frameStart, end: d.frameEnd}),
                    frameRate: d.frameRate,
                    repeat: d.repeat
                });
            })
            // Needed, otherwise, animations are not handled correctly.
            this.scene.sys.updateList.add(sprite);
            this.sprites.set(texture, sprite);
        }

        this.report = new Sprite(scene, 20, -10, 'report_flag', 3);
        this.report.setInteractive();
        this.report.visible = false;
        this.report.on('pointerup', () => {
            this.report.visible = false;
            this.teleportation.visible = false;
        });
        this.add(this.report);

        this.teleportation = new Sprite(scene, -20, -10, 'teleportation', 3);
        this.teleportation.setInteractive();
        this.teleportation.visible = false;
        this.teleportation.on('pointerup', () => {
            this.report.visible = false;
            this.teleportation.visible = false;
        });
        this.add(this.teleportation);

        this.PlayerValue = name;
        this.playerName = new BitmapText(scene, x, y - 25, 'main_font', name, 8);
        this.playerName.setOrigin(0.5).setCenterAlign().setDepth(99999);
        scene.add.existing(this.playerName);

        scene.add.existing(this);

        this.scene.physics.world.enableBody(this);
        this.getBody().setImmovable(true);
        this.getBody().setCollideWorldBounds(true);
        this.setSize(16, 16);
        this.getBody().setSize(16, 16); //edit the hitbox to better match the character model
        this.getBody().setOffset(0, 8);
        this.setDepth(-1);

        this.scene.events.on('postupdate', this.postupdate.bind(this));

        this.playAnimation(direction, moving);
    }

    private getPlayerAnimations(name: string): AnimationData[] {
        return [{
            key: `${name}-${PlayerAnimationNames.WalkDown}`,
            frameModel: name,
            frameStart: 0,
            frameEnd: 2,
            frameRate: 10,
            repeat: -1
        }, {
            key: `${name}-${PlayerAnimationNames.WalkLeft}`,
            frameModel: name,
            frameStart: 3,
            frameEnd: 5,
            frameRate: 10,
            repeat: -1
        }, {
            key: `${name}-${PlayerAnimationNames.WalkRight}`,
            frameModel: name,
            frameStart: 6,
            frameEnd: 8,
            frameRate: 10,
            repeat: -1
        }, {
            key: `${name}-${PlayerAnimationNames.WalkUp}`,
            frameModel: name,
            frameStart: 9,
            frameEnd: 11,
            frameRate: 10,
            repeat: -1
        }];
    }

    protected playAnimation(direction : string, moving: boolean): void {
        for (const [texture, sprite] of this.sprites.entries()) {
            if (!sprite.anims) {
                console.error('ANIMS IS NOT DEFINED!!!');
                return;
            }
            if (moving && (!sprite.anims.currentAnim || sprite.anims.currentAnim.key !== direction)) {
                sprite.play(texture+'-'+direction, true);
            } else if (!moving) {
                /*if (this.anims.currentAnim) {
                    this.anims.stop();
                }*/
                sprite.play(texture+'-'+direction, true);
                sprite.anims.stop();
            }
        }
    }

    protected getBody(): Phaser.Physics.Arcade.Body {
        const body = this.body;
        if (!(body instanceof Phaser.Physics.Arcade.Body)) {
            throw new Error('Container does not have arcade body');
        }
        return body;
    }

    move(x: number, y: number) {
        const body = this.getBody();

        body.setVelocity(x, y);

        // up or down animations are prioritized over left and right
        if (body.velocity.y < 0) { //moving up
            this.lastDirection = PlayerAnimationNames.WalkUp;
            this.playAnimation(PlayerAnimationNames.WalkUp, true);
            //this.play(`${this.PlayerTexture}-${PlayerAnimationNames.WalkUp}`, true);
        } else if (body.velocity.y > 0) { //moving down
            this.lastDirection = PlayerAnimationNames.WalkDown;
            this.playAnimation(PlayerAnimationNames.WalkDown, true);
            //this.play(`${this.PlayerTexture}-${PlayerAnimationNames.WalkDown}`, true);
        } else if (body.velocity.x > 0) { //moving right
            this.lastDirection = PlayerAnimationNames.WalkRight;
            this.playAnimation(PlayerAnimationNames.WalkRight, true);
            //this.play(`${this.PlayerTexture}-${PlayerAnimationNames.WalkRight}`, true);
        } else if (body.velocity.x < 0) { //moving left
            this.lastDirection = PlayerAnimationNames.WalkLeft;
            this.playAnimation(PlayerAnimationNames.WalkLeft, true);
            //this.anims.playReverse(`${this.PlayerTexture}-${PlayerAnimationNames.WalkLeft}`, true);
        }

        if (this.bubble) {
            this.bubble.moveBubble(this.x, this.y);
        }

        //update depth user
        this.setDepth(this.y);
    }

    postupdate(time: number, delta: number) {
        //super.update(delta);
        this.playerName.setPosition(this.x, this.y - 25);
    }

    stop(){
        this.getBody().setVelocity(0, 0);
        this.playAnimation(this.lastDirection, false);
    }

    say(text: string) {
        if (this.bubble) return;
        this.bubble = new SpeechBubble(this.scene, this, text)
        //todo make the bubble destroy on player movement?
        setTimeout(() => {
            if (this.bubble !== null) {
                this.bubble.destroy();
                this.bubble = null;
            }
        }, 3000)
    }

    destroy(fromScene?: boolean): void {
        if (this.scene) {
            this.scene.events.removeListener('postupdate', this.postupdate.bind(this));
        }
        for (const sprite of this.sprites.values()) {
            this.scene.sys.updateList.remove(sprite);
        }
        super.destroy(fromScene);
        this.playerName.destroy();
    }
}
