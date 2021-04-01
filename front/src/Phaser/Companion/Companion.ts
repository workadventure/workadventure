import Sprite = Phaser.GameObjects.Sprite;
import Container = Phaser.GameObjects.Container;
import { lazyLoadResource } from "./CompanionTexturesLoadingManager";
import { PlayerAnimationDirections, PlayerAnimationTypes } from "../Player/Animation";

export class Companion extends Container {
    public sprites: Map<string, Sprite>;

    private delta: number;
    private invisible: boolean;
    private stepListener: Function;
    private target: { x: number, y: number, direction: PlayerAnimationDirections };

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number
        ) {
        super(scene, x + 8, y + 8);
            
        this.delta = 0;
        this.invisible = true;
        this.target = { x, y, direction: PlayerAnimationDirections.Down };
        this.sprites = new Map<string, Sprite>();

        const animal = ["dog1", "dog2", "dog3", "cat1", "cat2", "cat3"];
        const random = Math.floor(Math.random() * animal.length);

        lazyLoadResource(this.scene.load, animal[random]).then(resource => {
            this.addResource(resource);
            this.invisible = false;
        })

        this.scene.physics.world.enableBody(this);

        this.getBody().setImmovable(true);
        this.getBody().setCollideWorldBounds(true);
        this.setSize(16, 16);
        this.getBody().setSize(16, 16);
        this.getBody().setOffset(0, 8);

        this.setDepth(-1);

        this.stepListener = this.step.bind(this);

        scene.game.events.addListener('step', this.stepListener);
        scene.add.existing(this);
    }

    public setTarget(x: number, y: number, direction: PlayerAnimationDirections) {
        this.target = { x, y, direction };
    }

    private step(time: any, delta: any) {
        if (typeof this.target === 'undefined') return;

        this.delta += delta;
        if (this.delta < 128) {
            return;
        }
        this.delta = 0;

        const xDist = this.target.x - this.x;
        const yDist = this.target.y - this.y;

        let direction: PlayerAnimationDirections;
        let type: PlayerAnimationTypes;

        const distance = Math.sqrt(Math.pow(xDist, 2) + Math.pow(yDist, 2));

        if (distance < 16) {
            type = PlayerAnimationTypes.Idle;
            direction = this.target.direction;

            this.getBody().stop();
        } else {
            type = PlayerAnimationTypes.Walk;

            const xDir = xDist / Math.max(Math.abs(xDist), 1);
            const yDir = yDist / Math.max(Math.abs(yDist), 1);

            const speed = 256;
            this.getBody().setVelocity(Math.min(Math.abs(xDist * 2), speed) * xDir, Math.min(Math.abs(yDist * 2), speed) * yDir);

            if (Math.abs(xDist) > Math.abs(yDist)) {
                if (xDist < 0) {
                    direction = PlayerAnimationDirections.Left;
                } else {
                    direction = PlayerAnimationDirections.Right;
                }
            } else {
                if (yDist < 0) {
                    direction = PlayerAnimationDirections.Up;
                } else {
                    direction = PlayerAnimationDirections.Down;
                }
            }
        }
        
        this.setDepth(this.y);
        this.playAnimation(direction, type);
    }

    private playAnimation(direction: PlayerAnimationDirections, type: PlayerAnimationTypes): void {
        if (this.invisible) return;

        for (const [resource, sprite] of this.sprites.entries()) {
            sprite.play(`${resource}-${direction}-${type}`, true);
        }
    }

    private addResource(resource: string, frame?: string | number): void {
        const sprite = new Sprite(this.scene, 0, 0, resource, frame);

        this.add(sprite);

        this.getAnimations(resource).forEach(animation => {
            this.scene.anims.create(animation);
        });
        
        this.scene.sys.updateList.add(sprite);
        this.sprites.set(resource, sprite);
    }

    private getAnimations(resource: string): Phaser.Types.Animations.Animation[] {
        return [
            {
                key: `${resource}-${PlayerAnimationDirections.Down}-${PlayerAnimationTypes.Idle}`,
                frames: this.scene.anims.generateFrameNumbers(resource, {frames: [1]}),
                frameRate: 10,
                repeat: 1
            },
            {
                key: `${resource}-${PlayerAnimationDirections.Left}-${PlayerAnimationTypes.Idle}`,
                frames: this.scene.anims.generateFrameNumbers(resource, {frames: [4]}),
                frameRate: 10,
                repeat: 1
            },
            {
                key: `${resource}-${PlayerAnimationDirections.Right}-${PlayerAnimationTypes.Idle}`,
                frames: this.scene.anims.generateFrameNumbers(resource, {frames: [7]}),
                frameRate: 10,
                repeat: 1
            },
            {
                key: `${resource}-${PlayerAnimationDirections.Up}-${PlayerAnimationTypes.Idle}`,
                frames: this.scene.anims.generateFrameNumbers(resource, {frames: [10]}),
                frameRate: 10,
                repeat: 1
            },
            {
                key: `${resource}-${PlayerAnimationDirections.Down}-${PlayerAnimationTypes.Walk}`,
                frames: this.scene.anims.generateFrameNumbers(resource, {frames: [0, 1, 2]}),
                frameRate: 15,
                repeat: -1
            },
            {
                key: `${resource}-${PlayerAnimationDirections.Left}-${PlayerAnimationTypes.Walk}`,
                frames: this.scene.anims.generateFrameNumbers(resource, {frames: [3, 4, 5]}),
                frameRate: 15,
                repeat: -1
            },
            {
                key: `${resource}-${PlayerAnimationDirections.Right}-${PlayerAnimationTypes.Walk}`,
                frames: this.scene.anims.generateFrameNumbers(resource, {frames: [6, 7, 8]}),
                frameRate: 15,
                repeat: -1
            },
            {
                key: `${resource}-${PlayerAnimationDirections.Up}-${PlayerAnimationTypes.Walk}`,
                frames: this.scene.anims.generateFrameNumbers(resource, {frames: [9, 10, 11]}),
                frameRate: 15,
                repeat: -1
            }
        ]
    }

    private getBody(): Phaser.Physics.Arcade.Body {
        const body = this.body;

        if (!(body instanceof Phaser.Physics.Arcade.Body)) {
            throw new Error('Container does not have arcade body');
        }

        return body;
    }

    public destroy(): void {
        for (const sprite of this.sprites.values()) {
            if (this.scene) {
                this.scene.sys.updateList.remove(sprite);
            }
        }

        if (this.scene) {
            this.scene.game.events.removeListener('step', this.stepListener);
        }

        super.destroy();
    }
}
