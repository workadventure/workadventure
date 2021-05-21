import {PlayerAnimationDirections, PlayerAnimationTypes} from "../Player/Animation";
import {SpeechBubble} from "./SpeechBubble";
import BitmapText = Phaser.GameObjects.BitmapText;
import Container = Phaser.GameObjects.Container;
import Sprite = Phaser.GameObjects.Sprite;
import {TextureError} from "../../Exception/TextureError";
import {Companion} from "../Companion/Companion";

interface AnimationData {
    key: string;
    frameRate: number;
    repeat: number;
    frameModel: string; //todo use an enum
    frames : number[]
}

export abstract class Character extends Container {
    private bubble: SpeechBubble|null = null;
    private readonly playerName: BitmapText;
    public PlayerValue: string;
    public sprites: Map<string, Sprite>;
    private lastDirection: PlayerAnimationDirections = PlayerAnimationDirections.Down;
    //private teleportation: Sprite;
    private invisible: boolean;
    public companion?: Companion;

    constructor(scene: Phaser.Scene,
                x: number,
                y: number,
                texturesPromise: Promise<string[]>,
                name: string,
                direction: PlayerAnimationDirections,
                moving: boolean,
                frame?: string | number
    ) {
        super(scene, x, y/*, texture, frame*/);
        this.PlayerValue = name;
        this.invisible = true

        this.sprites = new Map<string, Sprite>();

        //textures are inside a Promise in case they need to be lazyloaded before use.
        texturesPromise.then((textures) => {
            this.addTextures(textures, frame);
            this.invisible = false
        })

        /*this.teleportation = new Sprite(scene, -20, -10, 'teleportation', 3);
        this.teleportation.setInteractive();
        this.teleportation.visible = false;
        this.teleportation.on('pointerup', () => {
            this.report.visible = false;
            this.teleportation.visible = false;
        });
        this.add(this.teleportation);*/

        this.playerName = new BitmapText(scene, 0,  - 25, 'main_font', name, 7);
        this.playerName.setOrigin(0.5).setCenterAlign().setDepth(99999);
        this.add(this.playerName);

        scene.add.existing(this);

        this.scene.physics.world.enableBody(this);
        this.getBody().setImmovable(true);
        this.getBody().setCollideWorldBounds(true);
        this.setSize(16, 16);
        this.getBody().setSize(16, 16); //edit the hitbox to better match the character model
        this.getBody().setOffset(0, 8);
        this.setDepth(-1);

        this.playAnimation(direction, moving);
    }

    public addCompanion(name: string, texturePromise?: Promise<string>): void {
        if (typeof texturePromise !== 'undefined') {
            this.companion = new Companion(this.scene, this.x, this.y, name, texturePromise);
        }
    }

    public addTextures(textures: string[], frame?: string | number): void {
        for (const texture of textures) {
            if(!this.scene.textures.exists(texture)){
                throw new TextureError('texture not found');
            }
            const sprite = new Sprite(this.scene, 0, 0, texture, frame);
            sprite.setInteractive({useHandCursor: true});
            this.add(sprite);
            this.getPlayerAnimations(texture).forEach(d => {
                this.scene.anims.create({
                    key: d.key,
                    frames: this.scene.anims.generateFrameNumbers(d.frameModel, {frames: d.frames}),
                    frameRate: d.frameRate,
                    repeat: d.repeat
                });
            })
            // Needed, otherwise, animations are not handled correctly.
            if(this.scene) {
                this.scene.sys.updateList.add(sprite);
            }
            this.sprites.set(texture, sprite);
        }
    }

    private getPlayerAnimations(name: string): AnimationData[] {
        return [{
            key: `${name}-${PlayerAnimationDirections.Down}-${PlayerAnimationTypes.Walk}`,
            frameModel: name,
            frames: [0, 1, 2, 1],
            frameRate: 10,
            repeat: -1
        }, {
            key: `${name}-${PlayerAnimationDirections.Left}-${PlayerAnimationTypes.Walk}`,
            frameModel: name,
            frames: [3, 4, 5, 4],
            frameRate: 10,
            repeat: -1
        }, {
            key: `${name}-${PlayerAnimationDirections.Right}-${PlayerAnimationTypes.Walk}`,
            frameModel: name,
            frames: [6, 7, 8, 7],
            frameRate: 10,
            repeat: -1
        }, {
            key: `${name}-${PlayerAnimationDirections.Up}-${PlayerAnimationTypes.Walk}`,
            frameModel: name,
            frames: [9, 10, 11, 10],
            frameRate: 10,
            repeat: -1
        },{
            key: `${name}-${PlayerAnimationDirections.Down}-${PlayerAnimationTypes.Idle}`,
            frameModel: name,
            frames: [1],
            frameRate: 10,
            repeat: 1
        }, {
            key: `${name}-${PlayerAnimationDirections.Left}-${PlayerAnimationTypes.Idle}`,
            frameModel: name,
            frames: [4],
            frameRate: 10,
            repeat: 1
        }, {
            key: `${name}-${PlayerAnimationDirections.Right}-${PlayerAnimationTypes.Idle}`,
            frameModel: name,
            frames: [7],
            frameRate: 10,
            repeat: 1
        }, {
            key: `${name}-${PlayerAnimationDirections.Up}-${PlayerAnimationTypes.Idle}`,
            frameModel: name,
            frames: [10],
            frameRate: 10,
            repeat: 1
        }];
    }

    protected playAnimation(direction : PlayerAnimationDirections, moving: boolean): void {
        if (this.invisible) return;
        for (const [texture, sprite] of this.sprites.entries()) {
            if (!sprite.anims) {
                console.error('ANIMS IS NOT DEFINED!!!');
                return;
            }
            if (moving && (!sprite.anims.currentAnim || sprite.anims.currentAnim.key !== direction)) {
                sprite.play(texture+'-'+direction+'-'+PlayerAnimationTypes.Walk, true);
            } else if (!moving) {
                sprite.anims.play(texture + '-' + direction + '-'+PlayerAnimationTypes.Idle, true);
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
            this.lastDirection = PlayerAnimationDirections.Up;
            this.playAnimation(PlayerAnimationDirections.Up, true);
        } else if (body.velocity.y > 0) { //moving down
            this.lastDirection = PlayerAnimationDirections.Down;
            this.playAnimation(PlayerAnimationDirections.Down, true);
        } else if (body.velocity.x > 0) { //moving right
            this.lastDirection = PlayerAnimationDirections.Right;
            this.playAnimation(PlayerAnimationDirections.Right, true);
        } else if (body.velocity.x < 0) { //moving left
            this.lastDirection = PlayerAnimationDirections.Left;
            this.playAnimation(PlayerAnimationDirections.Left, true);
        }

        this.setDepth(this.y);

        if (this.companion) {
            this.companion.setTarget(this.x, this.y, this.lastDirection);
        }
    }

    stop(){
        this.getBody().setVelocity(0, 0);
        this.playAnimation(this.lastDirection, false);
    }

    say(text: string) {
        if (this.bubble) return;
        this.bubble = new SpeechBubble(this.scene, this, text)
        setTimeout(() => {
            if (this.bubble !== null) {
                this.bubble.destroy();
                this.bubble = null;
            }
        }, 3000)
    }

    destroy(): void {
        for (const sprite of this.sprites.values()) {
            if(this.scene) {
                this.scene.sys.updateList.remove(sprite);
            }
        }
        super.destroy();
        this.playerName.destroy();
    }
}
