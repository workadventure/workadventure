import type OutlinePipelinePlugin from "phaser3-rex-plugins/plugins/outlinepipeline-plugin.js";
import { Unsubscriber, Writable, get, writable } from "svelte/store";
import type CancelablePromise from "cancelable-promise";
import { Deferred } from "ts-deferred";
import {
    AvailabilityStatus as AvailabilityStatusType,
    SayMessageType,
    AvailabilityStatus,
    PositionMessage_Direction,
} from "@workadventure/messages";
import { defaultWoka } from "@workadventure/shared-utils";
import { asError } from "catch-unknown";
import { currentPlayerWokaStore } from "../../Stores/CurrentPlayerWokaStore";
import { PlayerStatusDot } from "../Components/PlayerStatusDot";
import { TalkIcon } from "../Components/TalkIcon";
import type { OutlineableInterface } from "../Game/OutlineableInterface";
import { createColorStore } from "../../Stores/OutlineColorStore";
import type { PictureStore } from "../../Stores/PictureStore";
import { TexturesHelper } from "../Helpers/TexturesHelper";
import { DEPTH_INGAME_TEXT_INDEX } from "../Game/DepthIndexes";
import type { GameScene } from "../Game/GameScene";
import { Companion } from "../Companion/Companion";
import { CharacterTextureError } from "../../Exception/CharacterTextureError";
import { getPlayerAnimations, PlayerAnimationTypes } from "../Player/Animation";
import { ProtobufClientUtils } from "../../Network/ProtobufClientUtils";
import { SpeakerIcon } from "../Components/SpeakerIcon";
import { MegaphoneIcon } from "../Components/MegaphoneIcon";

import { lazyLoadPlayerCharacterTextures } from "./PlayerTexturesLoadingManager";
import { SpeechBubble } from "./SpeechBubble";
import { SpeechDomElement } from "./SpeechDomElement";
import { ThinkingCloud } from "./ThinkingCloud";
import Text = Phaser.GameObjects.Text;
import Container = Phaser.GameObjects.Container;
import Sprite = Phaser.GameObjects.Sprite;
import DOMElement = Phaser.GameObjects.DOMElement;
import RenderTexture = Phaser.GameObjects.RenderTexture;

const playerNameY = -25;
const interactiveRadius = 25;

export const CHARACTER_BODY_WIDTH = 16;
export const CHARACTER_BODY_HEIGHT = 16;
export const CHARACTER_BODY_OFFSET_X = 0;
export const CHARACTER_BODY_OFFSET_Y = 8;

export abstract class Character extends Container implements OutlineableInterface {
    private bubble: RenderTexture | null | DOMElement = null;
    private playerNameText: Text | undefined;
    private readonly talkIcon: TalkIcon;
    protected readonly statusDot: PlayerStatusDot;
    protected readonly speakerIcon: SpeakerIcon;
    protected readonly megaphoneIcon: MegaphoneIcon;
    public readonly playerName: string;
    public sprites: Map<string, Sprite>;
    protected _lastDirection: PositionMessage_Direction = PositionMessage_Direction.DOWN;
    //private teleportation: Sprite;
    private invisible: boolean;
    private clickable: boolean;
    public companion?: Companion;
    private emote: Phaser.GameObjects.DOMElement | null = null;
    private emoteTween: Phaser.Tweens.Tween | null = null;
    private texts: Map<string, Phaser.GameObjects.DOMElement> = new Map();
    private textsToBuild = new Map();
    private timeoutDestroyText: NodeJS.Timeout | null = null;
    scene: GameScene;
    private readonly _pictureStore: Writable<string | undefined>;
    protected readonly outlineColorStore = createColorStore();
    private outlineColorStoreUnsubscribe: Unsubscriber | undefined;
    private texturePromise: CancelablePromise<string[] | void> | undefined;
    private destroyed = false;

    /**
     * A deferred promise that resolves when the texture of the character is actually displayed.
     */
    private textureLoadedDeferred = new Deferred<void>();

    constructor(
        scene: GameScene,
        x: number,
        y: number,
        texturesPromise: CancelablePromise<string[]>,
        name: string,
        direction: PositionMessage_Direction,
        moving: boolean,
        frame: string | number,
        isClickable: boolean,
        companionTexturePromise: CancelablePromise<string>,
        userId?: string | null
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
                this.textureLoadedDeferred.resolve();
                // getSnapshot can be quite long (~16ms) so we delay it to avoid freezing the game.
                // Since requestAnimationFrame has the priority over setTimeout, the game will keep running smoothly.
                return new Promise<void>((resolve, reject) => {
                    setTimeout(() => {
                        this.getSnapshot()
                            .then((htmlImageElementSrc) => {
                                this._pictureStore.set(htmlImageElementSrc);
                                if (userId != undefined) {
                                    currentPlayerWokaStore.set(htmlImageElementSrc);
                                }
                                resolve();
                            })
                            .catch((e) => {
                                reject(asError(e));
                            });
                    }, 0);
                });
            })
            .catch(() => {
                return lazyLoadPlayerCharacterTextures(scene.superLoad, [
                    {
                        id: "color_22",
                        url: "resources/customisation/character_color/character_color21.png",
                    },
                    {
                        id: "eyes_23",
                        url: "resources/customisation/character_eyes/character_eyes23.png",
                    },
                ])
                    .then((textures) => {
                        this.addTextures(textures, frame);
                        this.invisible = false;
                        this.playAnimation(direction, moving);
                        this.textureLoadedDeferred.resolve();

                        return this.getSnapshot().then((htmlImageElementSrc) => {
                            // When there is no renderer (for instance with bots), the htmlImageElementSrc is an empty string
                            if (!htmlImageElementSrc) {
                                htmlImageElementSrc = defaultWoka;
                            }
                            if (userId != undefined) {
                                currentPlayerWokaStore.set(htmlImageElementSrc);
                            }
                            this._pictureStore.set(htmlImageElementSrc);
                        });
                    })
                    .catch((e) => {
                        this.textureLoadedDeferred.reject(e);
                        throw e;
                    });
            })
            .finally(() => {
                this.texturePromise = undefined;
            });

        if (typeof companionTexturePromise !== "undefined") {
            this.addCompanion(companionTexturePromise);
        }

        // We delay the assignment of the text because it can take up to 16ms.
        // If we enter a zone with 100 people, that is a 1.6s freeze.
        // requestAnimationFrame has the priority over setTimeout so the game will keep running smoothly.
        setTimeout(() => {
            if (this.destroyed) {
                // The character has been destroyed before the timeout
                return;
            }

            // Todo: Replace the font family with a better one
            this.playerNameText = new Text(scene, 0, playerNameY, name, {
                fontFamily: '"Press Start 2P"',
                fontSize: "8px",
                strokeThickness: 2,
                stroke: "#14304C",
                metrics: {
                    ascent: 20,
                    descent: 10,
                    fontSize: 35,
                },
            });

            this.playerNameText.setOrigin(0.5).setDepth(DEPTH_INGAME_TEXT_INDEX);
            this.add([this.playerNameText]);

            // Reposition status dot and megaphone icon
            this.statusDot.x = (this.playerNameText.getLeftCenter().x ?? 0) - 6;
            this.megaphoneIcon.setX((this.playerNameText.getRightCenter().x ?? 0) + 8);
            this.statusDot.visible = true;
            this.megaphoneIcon.visible = true;

            scene.getOutlineManager().add(this.playerNameText, () => {
                return this.getCurrentOutline();
            });

            this.outlineColorStoreUnsubscribe = this.outlineColorStore.subscribe((color) => {
                this.setOutline(color);
            });
        }, 0);

        this.statusDot = new PlayerStatusDot(scene, 0, playerNameY - 1);
        this.megaphoneIcon = new MegaphoneIcon(scene, 0, playerNameY - 1);
        this.statusDot.visible = false;
        this.megaphoneIcon.visible = false;
        this.talkIcon = new TalkIcon(scene, 0, -45);
        this.speakerIcon = new SpeakerIcon(scene, 0, -45);
        this.add([this.talkIcon, this.speakerIcon, this.statusDot, this.megaphoneIcon]);

        if (isClickable) {
            this.setInteractive({
                hitArea: new Phaser.Geom.Circle(8, 8, interactiveRadius),
                hitAreaCallback: Phaser.Geom.Circle.Contains, //eslint-disable-line @typescript-eslint/unbound-method
                useHandCursor: true,
            });
        }

        this.setClickable(isClickable);

        scene.add.existing(this);

        this.scene.physics.world.enableBody(this);
        this.getBody().setImmovable(true);
        this.getBody().setCollideWorldBounds(true);
        this.setSize(CHARACTER_BODY_WIDTH, CHARACTER_BODY_HEIGHT);
        this.getBody().setSize(CHARACTER_BODY_WIDTH, CHARACTER_BODY_HEIGHT); //edit the hitbox to better match the character model
        this.getBody().setOffset(CHARACTER_BODY_OFFSET_X, CHARACTER_BODY_OFFSET_Y);
        this.setDepth(0);
    }

    public setClickable(clickable = true): void {
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
        switch (this._lastDirection) {
            case PositionMessage_Direction.DOWN: {
                return { x: this.x, y: this.y + shift };
            }
            case PositionMessage_Direction.LEFT: {
                return { x: this.x - shift, y: this.y };
            }
            case PositionMessage_Direction.RIGHT: {
                return { x: this.x + shift, y: this.y };
            }
            case PositionMessage_Direction.UP: {
                return { x: this.x, y: this.y - shift };
            }
            case PositionMessage_Direction.UNRECOGNIZED: {
                return { x: this.x, y: this.y };
            }
        }
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

    public toggleTalk(show = true, forceClose = false): void {
        if (this.getAvailabilityStatus() === AvailabilityStatus.SPEAKER) {
            this.talkIcon.show(false, forceClose);
            this.speakerIcon.show(show, forceClose);
        } else {
            this.talkIcon.show(show, forceClose);
            this.speakerIcon.show(false, forceClose);
        }
    }

    public setAvailabilityStatus(availabilityStatus: AvailabilityStatusType, instant = false): void {
        this.statusDot.setAvailabilityStatus(availabilityStatus, instant);
        if (this.getAvailabilityStatus() === AvailabilityStatus.SPEAKER) {
            this.megaphoneIcon.show(true, false);
        } else {
            this.megaphoneIcon.show(false, false);
        }
    }

    public getAvailabilityStatus() {
        return this.statusDot.availabilityStatus;
    }

    public addCompanion(texturePromise: CancelablePromise<string>): void {
        this.companion = new Companion(this.scene, this.x, this.y, texturePromise);
    }

    private addTextures(textures: string[], frame?: string | number): void {
        if (textures.length < 1) {
            throw new CharacterTextureError("No texture given");
        }

        for (const texture of textures) {
            if (this.scene && !this.scene.textures.exists(texture)) {
                throw new CharacterTextureError(`Texture "${texture}" not found`);
            }
            const sprite = new Sprite(this.scene, 0, 0, texture, frame);
            this.add(sprite);
            getPlayerAnimations(texture).forEach((d) => {
                if (!this.scene.anims.exists(d.key)) {
                    this.scene.anims.create({
                        key: d.key,
                        frames: this.scene.anims.generateFrameNumbers(d.frameModel, { frames: d.frames }),
                        frameRate: d.frameRate,
                        repeat: d.repeat,
                    });
                }
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

    protected playAnimation(direction: PositionMessage_Direction, moving: boolean): void {
        if (this.invisible) return;
        for (const [texture, sprite] of this.sprites.entries()) {
            if (!sprite.anims) {
                console.error("ANIMS IS NOT DEFINED!!!");
                return;
            }
            const directionStr = ProtobufClientUtils.toDirectionString(direction);
            if (moving && (!sprite.anims.currentAnim || sprite.anims.currentAnim.key !== directionStr)) {
                sprite.play(texture + "-" + directionStr + "-" + PlayerAnimationTypes.Walk, true);
            } else if (!moving) {
                sprite.anims.play(texture + "-" + directionStr + "-" + PlayerAnimationTypes.Idle, true);
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

    stop() {
        this.getBody().setVelocity(0, 0);
        this.playAnimation(this._lastDirection, false);
    }

    say(text: string, type: SayMessageType) {
        this.scene.markDirty();
        if (this.bubble !== null) {
            this.remove(this.bubble);
            this.bubble.destroy();
        }
        // If text is empty, let's just remove the previous bubble and say nothing.
        if (!text) {
            return;
        }

        switch (type) {
            case SayMessageType.SpeechBubble:
            case SayMessageType.UNRECOGNIZED: {
                const speechBubble = new SpeechBubble(text);
                this.bubble = new DOMElement(
                    this.scene,
                    0,
                    0 - CHARACTER_BODY_HEIGHT / 2 - 50,
                    speechBubble.getElement()
                );
                this.add(this.bubble);
                break;
            }
            case SayMessageType.ThinkingCloud: {
                const thinkElement = new ThinkingCloud({
                    text: text,
                    maxWidth: 200,
                    fontSize: 11,
                    cornerRadius: 10,
                    padding: 12,
                    fillColor: 0xffffff,
                    fillAlpha: 0.8,
                }).getElement();
                this.bubble = new DOMElement(this.scene, 0, 0 - CHARACTER_BODY_HEIGHT / 2 - 70, thinkElement);
                this.add(this.bubble);
                break;
            }
            default: {
                const _exhaustiveCheck: never = type;
            }
        }
    }

    destroy(): void {
        for (const sprite of this.sprites.values()) {
            if (this.scene) {
                this.scene.sys.updateList.remove(sprite);
            }
        }
        this.texturePromise?.cancel();
        this.list.forEach((objectContaining) => objectContaining.destroy());
        this.outlineColorStoreUnsubscribe?.();
        this.destroyed = true;
        super.destroy();
    }

    playEmote(emote: string) {
        this.cancelPreviousEmote();
        const emoteY = -45;
        const span = document.createElement("span");
        span.innerHTML = emote;
        this.emote = new DOMElement(this.scene, -1, 0, span, "z-index:10;");
        this.emote.setAlpha(0);
        this.add(this.emote);
        this.createStartTransition(emoteY);
    }

    playText(
        id: string,
        text: string,
        duration = 10000,
        callback = () => this.destroyText(id),
        createStackAnimation = true,
        type: "warning" | "message" = "message"
    ) {
        if (this.texts.has(id)) {
            this.destroyText(id);
        }
        this.textsToBuild.set(id, { text, duration, callback, type });

        // If there is already one text created, we don't need to create a stack animation
        if (this.texts.size == 1 && createStackAnimation) {
            this.createStackAnimationForMultiText();
            return;
        }

        const speechDomElement = new SpeechDomElement(
            id,
            text,
            this.scene,
            -1,
            -30 + this.texts.size * 2,
            callback,
            type
        );
        this.add(speechDomElement);
        this.texts.set(id, speechDomElement);
        speechDomElement.play(-1, -50 + this.texts.size * 2, duration, (id) => {
            this.destroyText(id);
        });
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

    private setOutline(color: number | undefined) {
        if (!this.playerNameText) {
            throw new Error("Player name text is not defined when setOuline is called");
        }
        if (color === undefined) {
            this.getOutlinePlugin()?.remove(this.playerNameText);
        } else {
            this.getOutlinePlugin()?.remove(this.playerNameText);
            this.getOutlinePlugin()?.add(this.playerNameText, {
                thickness: 2,
                outlineColor: color,
            });
        }

        //Using outline quickfix
        this.scene.refreshSceneForOutline();
    }

    private cancelPreviousEmote() {
        if (!this.emote) return;

        this.emoteTween?.remove();
        this.destroyEmote();
    }

    private destroyEmote() {
        this.emote?.destroy();
        this.emote = null;
    }

    destroyText(id: string) {
        const text = this.texts.get(id);
        text?.destroy();
        this.texts.delete(id);
        this.textsToBuild.delete(id);
    }

    destroyAllText() {
        for (const [id] of this.texts) {
            this.destroyText(id);
        }
    }

    private createStackAnimationForMultiText() {
        // Destroy all texts and recreate them
        this.texts.forEach((text, id) => {
            // Destroy and remove the text from the map
            text.destroy();
            this.texts.delete(id);
        });

        // Recreate all texts in the correct order (from the biggest length to the smallest)
        Array.from(this.textsToBuild.entries())
            .sort((a, b) => a[1].text.length - b[1].text.length)
            .forEach(([id, { text, duration, callback }]) => {
                this.playText(id, text, duration, callback, false);
            });
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

    private getCurrentOutline(): { thickness: number; color?: number } {
        return { thickness: 2, color: get(this.outlineColorStore) };
    }

    /**
     * Returns a promise that resolves as soon as a texture is displayed for the user.
     * The promise will return when the required texture is loaded OR when the fallback texture is loaded (in case
     * the required texture could not be loaded).
     */
    public getTextureLoadedPromise(): PromiseLike<void> {
        return this.textureLoadedDeferred.promise;
    }

    public get lastDirection(): PositionMessage_Direction {
        return this._lastDirection;
    }

    public handlePressSpacePlayerTextCallback() {
        for (const [, text] of this.texts) {
            (text as SpeechDomElement).callback();
        }
    }
}
