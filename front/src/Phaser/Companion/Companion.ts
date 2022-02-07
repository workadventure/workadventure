import Sprite = Phaser.GameObjects.Sprite;
import Container = Phaser.GameObjects.Container;
import { PlayerAnimationDirections, PlayerAnimationTypes } from "../Player/Animation";
import { TexturesHelper } from "../Helpers/TexturesHelper";
import { Writable, writable } from "svelte/store";
import type { PictureStore } from "../../Stores/PictureStore";
import type CancelablePromise from "cancelable-promise";

export interface CompanionStatus {
    x: number;
    y: number;
    name: string;
    moving: boolean;
    direction: PlayerAnimationDirections;
}

export class Companion extends Container {
    public sprites: Map<string, Sprite>;

    private delta: number;
    private invisible: boolean;
    private updateListener: Function;
    private target: { x: number; y: number; direction: PlayerAnimationDirections };

    private companionName: string;
    private direction: PlayerAnimationDirections;
    private animationType: PlayerAnimationTypes;
    private readonly _pictureStore: Writable<string | undefined>;
    private texturePromise: CancelablePromise<string | void> | undefined;

    constructor(scene: Phaser.Scene, x: number, y: number, name: string, texturePromise: CancelablePromise<string>) {
        super(scene, x + 14, y + 4);

        this.sprites = new Map<string, Sprite>();

        this.delta = 0;
        this.invisible = true;
        this.target = { x, y, direction: PlayerAnimationDirections.Down };

        this.direction = PlayerAnimationDirections.Down;
        this.animationType = PlayerAnimationTypes.Idle;

        this.companionName = name;
        this._pictureStore = writable(undefined);

        this.texturePromise = texturePromise
            .then((resource) => {
                this.addResource(resource);
                this.invisible = false;
                return this.getSnapshot().then((htmlImageElementSrc) => {
                    this._pictureStore.set(htmlImageElementSrc);
                });
            })
            .catch((e) => console.error(e));

        this.scene.physics.world.enableBody(this);

        this.getBody().setImmovable(true);
        this.getBody().setCollideWorldBounds(false);
        this.setSize(16, 16);
        this.getBody().setSize(16, 16);
        this.getBody().setOffset(0, 8);

        this.setDepth(-1);

        this.updateListener = this.step.bind(this);
        this.scene.events.addListener("update", this.updateListener);

        this.scene.add.existing(this);
    }

    public setTarget(x: number, y: number, direction: PlayerAnimationDirections) {
        this.target = { x, y: y + 4, direction };
    }

    public step(time: number, delta: number) {
        if (typeof this.target === "undefined") return;

        this.delta += delta;
        if (this.delta < 128) {
            return;
        }
        this.delta = 0;

        const xDist = this.target.x - this.x;
        const yDist = this.target.y - this.y;

        const distance = Math.pow(xDist, 2) + Math.pow(yDist, 2);

        if (distance < 650) {
            this.animationType = PlayerAnimationTypes.Idle;
            this.direction = this.target.direction;

            this.getBody().stop();
        } else {
            this.animationType = PlayerAnimationTypes.Walk;

            const xDir = xDist / Math.max(Math.abs(xDist), 1);
            const yDir = yDist / Math.max(Math.abs(yDist), 1);

            const speed = 256;
            this.getBody().setVelocity(
                Math.min(Math.abs(xDist * 2.5), speed) * xDir,
                Math.min(Math.abs(yDist * 2.5), speed) * yDir
            );

            if (Math.abs(xDist) > Math.abs(yDist)) {
                if (xDist < 0) {
                    this.direction = PlayerAnimationDirections.Left;
                } else {
                    this.direction = PlayerAnimationDirections.Right;
                }
            } else {
                if (yDist < 0) {
                    this.direction = PlayerAnimationDirections.Up;
                } else {
                    this.direction = PlayerAnimationDirections.Down;
                }
            }
        }

        this.setDepth(this.y);
        this.playAnimation(this.direction, this.animationType);
    }

    public getStatus(): CompanionStatus {
        const { x, y, direction, animationType, companionName } = this;

        return {
            x,
            y,
            direction,
            moving: animationType === PlayerAnimationTypes.Walk,
            name: companionName,
        };
    }

    public async getSnapshot(): Promise<string> {
        const sprites = Array.from(this.sprites.values()).map((sprite) => {
            return { sprite, frame: 1 };
        });
        return TexturesHelper.getSnapshot(this.scene, ...sprites).catch((reason) => {
            console.warn(reason);
            for (const sprite of this.sprites.values()) {
                // it can be either cat or dog prefix
                if (sprite.texture.key.includes("cat") || sprite.texture.key.includes("dog")) {
                    return this.scene.textures.getBase64(sprite.texture.key);
                }
            }
            return "cat1";
        });
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

        this.getAnimations(resource).forEach((animation) => {
            this.scene.anims.create(animation);
        });

        this.scene.sys.updateList.add(sprite);
        this.sprites.set(resource, sprite);
    }

    private getAnimations(resource: string): Phaser.Types.Animations.Animation[] {
        return [
            {
                key: `${resource}-${PlayerAnimationDirections.Down}-${PlayerAnimationTypes.Idle}`,
                frames: this.scene.anims.generateFrameNumbers(resource, { frames: [1] }),
                frameRate: 10,
                repeat: 1,
            },
            {
                key: `${resource}-${PlayerAnimationDirections.Left}-${PlayerAnimationTypes.Idle}`,
                frames: this.scene.anims.generateFrameNumbers(resource, { frames: [4] }),
                frameRate: 10,
                repeat: 1,
            },
            {
                key: `${resource}-${PlayerAnimationDirections.Right}-${PlayerAnimationTypes.Idle}`,
                frames: this.scene.anims.generateFrameNumbers(resource, { frames: [7] }),
                frameRate: 10,
                repeat: 1,
            },
            {
                key: `${resource}-${PlayerAnimationDirections.Up}-${PlayerAnimationTypes.Idle}`,
                frames: this.scene.anims.generateFrameNumbers(resource, { frames: [10] }),
                frameRate: 10,
                repeat: 1,
            },
            {
                key: `${resource}-${PlayerAnimationDirections.Down}-${PlayerAnimationTypes.Walk}`,
                frames: this.scene.anims.generateFrameNumbers(resource, { frames: [0, 1, 2] }),
                frameRate: 15,
                repeat: -1,
            },
            {
                key: `${resource}-${PlayerAnimationDirections.Left}-${PlayerAnimationTypes.Walk}`,
                frames: this.scene.anims.generateFrameNumbers(resource, { frames: [3, 4, 5] }),
                frameRate: 15,
                repeat: -1,
            },
            {
                key: `${resource}-${PlayerAnimationDirections.Right}-${PlayerAnimationTypes.Walk}`,
                frames: this.scene.anims.generateFrameNumbers(resource, { frames: [6, 7, 8] }),
                frameRate: 15,
                repeat: -1,
            },
            {
                key: `${resource}-${PlayerAnimationDirections.Up}-${PlayerAnimationTypes.Walk}`,
                frames: this.scene.anims.generateFrameNumbers(resource, { frames: [9, 10, 11] }),
                frameRate: 15,
                repeat: -1,
            },
        ];
    }

    private getBody(): Phaser.Physics.Arcade.Body {
        const body = this.body;

        if (!(body instanceof Phaser.Physics.Arcade.Body)) {
            throw new Error("Container does not have arcade body");
        }

        return body;
    }

    public destroy(): void {
        this.texturePromise?.cancel();
        for (const sprite of this.sprites.values()) {
            if (this.scene) {
                this.scene.sys.updateList.remove(sprite);
            }
        }

        if (this.scene) {
            this.scene.events.removeListener("update", this.updateListener);
        }

        super.destroy();
    }

    public get pictureStore(): PictureStore {
        return this._pictureStore;
    }
}
