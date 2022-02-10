import { PlayerAnimationDirections, PlayerAnimationTypes } from "../Player/Animation";
import { SpeechBubble } from "./SpeechBubble";
import Text = Phaser.GameObjects.Text;
import Container = Phaser.GameObjects.Container;
import Sprite = Phaser.GameObjects.Sprite;
import DOMElement = Phaser.GameObjects.DOMElement;
import { TextureError } from "../../Exception/TextureError";
import { Companion } from "../Companion/Companion";
import type { GameScene } from "../Game/GameScene";
import { DEPTH_INGAME_TEXT_INDEX } from "../Game/DepthIndexes";
import type OutlinePipelinePlugin from "phaser3-rex-plugins/plugins/outlinepipeline-plugin.js";
import { isSilentStore } from "../../Stores/MediaStore";
import { lazyLoadPlayerCharacterTextures, loadAllDefaultModels } from "./PlayerTexturesLoadingManager";
import { TexturesHelper } from "../Helpers/TexturesHelper";
import type { PictureStore } from "../../Stores/PictureStore";
import { Unsubscriber, Writable, writable } from "svelte/store";
import { createColorStore } from "../../Stores/OutlineColorStore";
import type { OutlineableInterface } from "../Game/OutlineableInterface";
import type CancelablePromise from "cancelable-promise";

const playerNameY = -25;

interface AnimationData {
    key: string;
    frameRate: number;
    repeat: number;
    frameModel: string; //todo use an enum
    frames: number[];
}

const interactiveRadius = 35;

export abstract class Character extends Container implements OutlineableInterface {
    private bubble: SpeechBubble | null = null;
    private readonly playerNameText: Text;
    public playerName: string;
    public sprites: Map<string, Sprite>;
    protected lastDirection: PlayerAnimationDirections = PlayerAnimationDirections.Down;
    //private teleportation: Sprite;
    private invisible: boolean;
    private clickable: boolean;
    public companion?: Companion;
    private emote: Phaser.GameObjects.DOMElement | null = null;
    private emoteTween: Phaser.Tweens.Tween | null = null;
    scene: GameScene;
    private readonly _pictureStore: Writable<string | undefined>;
    private readonly outlineColorStore = createColorStore();
    private readonly outlineColorStoreUnsubscribe: Unsubscriber;
    private texturePromise: CancelablePromise<string[] | void> | undefined;

    constructor(
        scene: GameScene,
        x: number,
        y: number,
        texturesPromise: CancelablePromise<string[]>,
        name: string,
        direction: PlayerAnimationDirections,
        moving: boolean,
        frame: string | number,
        isClickable: boolean,
        companion: string | null,
        companionTexturePromise?: CancelablePromise<string>
    ) {
        super(scene, x, y /*, texture, frame*/);
        this.scene = scene;
        this.playerName = name;
        this.invisible = true;
        this.clickable = false;

        this.sprites = new Map<string, Sprite>();
        this._pictureStore = writable(undefined);

        //textures are inside a Promise in case they need to be lazyloaded before use.
        this.texturePromise = texturesPromise
            .then((textures) => {
                this.addTextures(textures, frame);
                this.invisible = false;
                this.playAnimation(direction, moving);
                return this.getSnapshot().then((htmlImageElementSrc) => {
                    this._pictureStore.set(htmlImageElementSrc);
                });
            })
            .catch(() => {
                return lazyLoadPlayerCharacterTextures(scene.load, ["color_22", "eyes_23"]).then((textures) => {
                    this.addTextures(textures, frame);
                    this.invisible = false;
                    this.playAnimation(direction, moving);
                });
            })
            .finally(() => {
                this.texturePromise = undefined;
            });

        this.playerNameText = new Text(scene, 0, playerNameY, name, {
            fontFamily: '"Press Start 2P"',
            fontSize: "8px",
            strokeThickness: 2,
            stroke: "gray",
            metrics: {
                ascent: 20,
                descent: 10,
                fontSize: 35,
            },
        });
        this.playerNameText.setOrigin(0.5).setDepth(DEPTH_INGAME_TEXT_INDEX);
        this.add(this.playerNameText);

        this.setClickable(isClickable);

        this.outlineColorStoreUnsubscribe = this.outlineColorStore.subscribe((color) => {
            if (color === undefined) {
                this.getOutlinePlugin()?.remove(this.playerNameText);
            } else {
                this.getOutlinePlugin()?.remove(this.playerNameText);
                this.getOutlinePlugin()?.add(this.playerNameText, {
                    thickness: 2,
                    outlineColor: color,
                });
            }
            this.scene.markDirty();
        });

        scene.add.existing(this);

        this.scene.physics.world.enableBody(this);
        this.getBody().setImmovable(true);
        this.getBody().setCollideWorldBounds(true);
        this.setSize(16, 16);
        this.getBody().setSize(16, 16); //edit the hitbox to better match the character model
        this.getBody().setOffset(0, 8);
        this.setDepth(0);

        if (typeof companion === "string") {
            this.addCompanion(companion, companionTexturePromise);
        }
    }

    public setClickable(clickable: boolean = true): void {
        if (this.clickable === clickable) {
            return;
        }
        this.clickable = clickable;
        if (clickable) {
            this.setInteractive({
                hitArea: new Phaser.Geom.Circle(8, 8, interactiveRadius),
                hitAreaCallback: Phaser.Geom.Circle.Contains, //eslint-disable-line @typescript-eslint/unbound-method
                useHandCursor: true,
            });
            return;
        }
        this.disableInteractive();
    }

    public isClickable() {
        return this.clickable;
    }

    public getPosition(): { x: number; y: number } {
        return { x: this.x, y: this.y };
    }

    /**
     * Returns position based on where player is currently facing
     * @param shift How far from player should the point of interest be.
     */
    public getDirectionalActivationPosition(shift: number): { x: number; y: number } {
        switch (this.lastDirection) {
            case PlayerAnimationDirections.Down: {
                return { x: this.x, y: this.y + shift };
            }
            case PlayerAnimationDirections.Left: {
                return { x: this.x - shift, y: this.y };
            }
            case PlayerAnimationDirections.Right: {
                return { x: this.x + shift, y: this.y };
            }
            case PlayerAnimationDirections.Up: {
                return { x: this.x, y: this.y - shift };
            }
        }
    }

    public getObjectToOutline(): Phaser.GameObjects.GameObject {
        return this.playerNameText;
    }

    private async getSnapshot(): Promise<string> {
        const sprites = Array.from(this.sprites.values()).map((sprite) => {
            return { sprite, frame: 1 };
        });
        return TexturesHelper.getSnapshot(this.scene, ...sprites).catch((reason) => {
            console.warn(reason);
            for (const sprite of this.sprites.values()) {
                // we can be sure that either predefined woka or body texture is at this point loaded
                if (sprite.texture.key.includes("color") || sprite.texture.key.includes("male")) {
                    return this.scene.textures.getBase64(sprite.texture.key);
                }
            }
            return "male1";
        });
    }

    public addCompanion(name: string, texturePromise?: CancelablePromise<string>): void {
        if (typeof texturePromise !== "undefined") {
            this.companion = new Companion(this.scene, this.x, this.y, name, texturePromise);
        }
    }

    public addTextures(textures: string[], frame?: string | number): void {
        if (textures.length < 1) {
            throw new TextureError("no texture given");
        }

        for (const texture of textures) {
            if (this.scene && !this.scene.textures.exists(texture)) {
                throw new TextureError("texture not found");
            }
            const sprite = new Sprite(this.scene, 0, 0, texture, frame);
            this.add(sprite);
            this.getPlayerAnimations(texture).forEach((d) => {
                this.scene.anims.create({
                    key: d.key,
                    frames: this.scene.anims.generateFrameNumbers(d.frameModel, { frames: d.frames }),
                    frameRate: d.frameRate,
                    repeat: d.repeat,
                });
            });
            // Needed, otherwise, animations are not handled correctly.
            if (this.scene) {
                this.scene.sys.updateList.add(sprite);
            }
            this.sprites.set(texture, sprite);
        }
    }

    private getOutlinePlugin(): OutlinePipelinePlugin | undefined {
        return this.scene.plugins.get("rexOutlinePipeline") as unknown as OutlinePipelinePlugin | undefined;
    }

    private getPlayerAnimations(name: string): AnimationData[] {
        return [
            {
                key: `${name}-${PlayerAnimationDirections.Down}-${PlayerAnimationTypes.Walk}`,
                frameModel: name,
                frames: [0, 1, 2, 1],
                frameRate: 10,
                repeat: -1,
            },
            {
                key: `${name}-${PlayerAnimationDirections.Left}-${PlayerAnimationTypes.Walk}`,
                frameModel: name,
                frames: [3, 4, 5, 4],
                frameRate: 10,
                repeat: -1,
            },
            {
                key: `${name}-${PlayerAnimationDirections.Right}-${PlayerAnimationTypes.Walk}`,
                frameModel: name,
                frames: [6, 7, 8, 7],
                frameRate: 10,
                repeat: -1,
            },
            {
                key: `${name}-${PlayerAnimationDirections.Up}-${PlayerAnimationTypes.Walk}`,
                frameModel: name,
                frames: [9, 10, 11, 10],
                frameRate: 10,
                repeat: -1,
            },
            {
                key: `${name}-${PlayerAnimationDirections.Down}-${PlayerAnimationTypes.Idle}`,
                frameModel: name,
                frames: [1],
                frameRate: 10,
                repeat: 1,
            },
            {
                key: `${name}-${PlayerAnimationDirections.Left}-${PlayerAnimationTypes.Idle}`,
                frameModel: name,
                frames: [4],
                frameRate: 10,
                repeat: 1,
            },
            {
                key: `${name}-${PlayerAnimationDirections.Right}-${PlayerAnimationTypes.Idle}`,
                frameModel: name,
                frames: [7],
                frameRate: 10,
                repeat: 1,
            },
            {
                key: `${name}-${PlayerAnimationDirections.Up}-${PlayerAnimationTypes.Idle}`,
                frameModel: name,
                frames: [10],
                frameRate: 10,
                repeat: 1,
            },
        ];
    }

    protected playAnimation(direction: PlayerAnimationDirections, moving: boolean): void {
        if (this.invisible) return;
        for (const [texture, sprite] of this.sprites.entries()) {
            if (!sprite.anims) {
                console.error("ANIMS IS NOT DEFINED!!!");
                return;
            }
            if (moving && (!sprite.anims.currentAnim || sprite.anims.currentAnim.key !== direction)) {
                sprite.play(texture + "-" + direction + "-" + PlayerAnimationTypes.Walk, true);
            } else if (!moving) {
                sprite.anims.play(texture + "-" + direction + "-" + PlayerAnimationTypes.Idle, true);
            }
        }
    }

    protected getBody(): Phaser.Physics.Arcade.Body {
        const body = this.body;
        if (!(body instanceof Phaser.Physics.Arcade.Body)) {
            throw new Error("Container does not have arcade body");
        }
        return body;
    }

    move(x: number, y: number) {
        const body = this.getBody();

        body.setVelocity(x, y);

        if (Math.abs(body.velocity.x) > Math.abs(body.velocity.y)) {
            if (body.velocity.x < 0) {
                this.lastDirection = PlayerAnimationDirections.Left;
            } else if (body.velocity.x > 0) {
                this.lastDirection = PlayerAnimationDirections.Right;
            }
        } else {
            if (body.velocity.y < 0) {
                this.lastDirection = PlayerAnimationDirections.Up;
            } else if (body.velocity.y > 0) {
                this.lastDirection = PlayerAnimationDirections.Down;
            }
        }
        this.playAnimation(this.lastDirection, true);

        this.setDepth(this.y);

        if (this.companion) {
            this.companion.setTarget(this.x, this.y, this.lastDirection);
        }
    }

    stop() {
        this.getBody().setVelocity(0, 0);
        this.playAnimation(this.lastDirection, false);
    }

    say(text: string) {
        if (this.bubble) return;
        this.bubble = new SpeechBubble(this.scene, this, text);
        setTimeout(() => {
            if (this.bubble !== null) {
                this.bubble.destroy();
                this.bubble = null;
            }
        }, 3000);
    }

    destroy(): void {
        for (const sprite of this.sprites.values()) {
            if (this.scene) {
                this.scene.sys.updateList.remove(sprite);
            }
        }
        this.texturePromise?.cancel();
        this.list.forEach((objectContaining) => objectContaining.destroy());
        this.outlineColorStoreUnsubscribe();
        super.destroy();
    }

    isSilent() {
        isSilentStore.set(true);
    }
    noSilent() {
        isSilentStore.set(false);
    }

    playEmote(emote: string) {
        this.cancelPreviousEmote();
        const emoteY = -45;
        const image = new Image(16, 16);
        image.src = emote;
        this.emote = new DOMElement(this.scene, -1, 0, image, "z-index:10;");
        this.emote.setAlpha(0);
        this.add(this.emote);
        this.createStartTransition(emoteY);
    }

    private createStartTransition(emoteY: number) {
        this.emoteTween = this.scene?.tweens.add({
            targets: this.emote,
            props: {
                alpha: 1,
                y: emoteY,
            },
            ease: "Power2",
            duration: 500,
            onComplete: () => {
                this.startPulseTransition(emoteY);
            },
        });
    }

    private startPulseTransition(emoteY: number) {
        if (this.emote) {
            this.emoteTween = this.scene?.tweens.add({
                targets: this.emote,
                props: {
                    y: emoteY * 1.3,
                    scale: this.emote.scale * 1.1,
                },
                duration: 250,
                yoyo: true,
                repeat: 1,
                completeDelay: 200,
                onComplete: () => {
                    this.startExitTransition(emoteY);
                },
            });
        }
    }

    private startExitTransition(emoteY: number) {
        this.emoteTween = this.scene?.tweens.add({
            targets: this.emote,
            props: {
                alpha: 0,
                y: 2 * emoteY,
            },
            ease: "Power2",
            duration: 500,
            onComplete: () => {
                this.destroyEmote();
            },
        });
    }

    cancelPreviousEmote() {
        if (!this.emote) return;

        this.emoteTween?.remove();
        this.destroyEmote();
    }

    private destroyEmote() {
        this.emote?.destroy();
        this.emote = null;
        this.playerNameText.setVisible(true);
    }

    public get pictureStore(): PictureStore {
        return this._pictureStore;
    }

    public setFollowOutlineColor(color: number): void {
        this.outlineColorStore.setFollowColor(color);
    }

    public removeFollowOutlineColor(): void {
        this.outlineColorStore.removeFollowColor();
    }

    public setApiOutlineColor(color: number): void {
        this.outlineColorStore.setApiColor(color);
    }

    public removeApiOutlineColor(): void {
        this.outlineColorStore.removeApiColor();
    }

    public pointerOverOutline(color: number): void {
        this.outlineColorStore.pointerOver(color);
    }

    public pointerOutOutline(): void {
        this.outlineColorStore.pointerOut();
    }

    public characterCloseByOutline(color: number): void {
        this.outlineColorStore.characterCloseBy(color);
    }

    public characterFarAwayOutline(): void {
        this.outlineColorStore.characterFarAway();
    }
}
