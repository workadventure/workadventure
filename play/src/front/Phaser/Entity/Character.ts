import type { Unsubscriber, Readable } from "svelte/store";
import { get, readable } from "svelte/store";
import type CancelablePromise from "cancelable-promise";
import type { AvailabilityStatus as AvailabilityStatusType } from "@workadventure/messages";
import { SayMessageType, AvailabilityStatus, PositionMessage_Direction } from "@workadventure/messages";
import { defaultWoka, Deferred } from "@workadventure/shared-utils";
import { currentPlayerWokaStore } from "../../Stores/CurrentPlayerWokaStore";
import { TalkIcon } from "../Components/TalkIcon";
import type { OutlineableInterface } from "../Game/OutlineableInterface";
import { createColorStore } from "../../Stores/OutlineColorStore";
import type { PictureStore } from "../../Stores/PictureStore";
import { TexturesHelper } from "../Helpers/TexturesHelper";
import type { GameScene } from "../Game/GameScene";
import { Companion } from "../Companion/Companion";
import { CharacterTextureError } from "../../Exception/CharacterTextureError";
import { getPlayerAnimations, PlayerAnimationTypes } from "../Player/Animation";
import { ProtobufClientUtils } from "../../Network/ProtobufClientUtils";
import { SpeakerIcon } from "../Components/SpeakerIcon";
import { WOKA_SPEED } from "../../Enum/EnvironmentVariable";

import { UsernameDisplay } from "../Components/UsernameDisplay";
import { lazyLoadPlayerCharacterTextures } from "./PlayerTexturesLoadingManager";
import { SpeechBubble } from "./SpeechBubble";
import { SpeechDomElement } from "./SpeechDomElement";
import { ThinkingCloud } from "./ThinkingCloud";
import Container = Phaser.GameObjects.Container;
import Sprite = Phaser.GameObjects.Sprite;
import DOMElement = Phaser.GameObjects.DOMElement;
import RenderTexture = Phaser.GameObjects.RenderTexture;

const playerNameY = -16;
const interactiveRadius = 25;
const meetingSpeakingIconY = -49;

export const CHARACTER_BODY_WIDTH = 16;
export const CHARACTER_BODY_HEIGHT = 16;
export const CHARACTER_BODY_OFFSET_X = 0;
export const CHARACTER_BODY_OFFSET_Y = 8;

export const PLAYTEXT_NEW_MEDIA_DEVICE_PREFIX = "playtext-mediadevice-";

export type PathFollowResult = { x: number; y: number; cancelled: boolean };

export abstract class Character extends Container implements OutlineableInterface {
    private bubble: RenderTexture | null | DOMElement = null;
    private usernameDisplay: UsernameDisplay | undefined;
    private readonly talkIcon: TalkIcon;
    protected readonly speakerIcon: SpeakerIcon;
    private availabilityStatus: AvailabilityStatusType = AvailabilityStatus.ONLINE;
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
    scene: GameScene;
    private lastRenderedSprite: string | undefined;
    private readonly _pictureStore: Readable<string | undefined>;
    protected readonly outlineColorStore = createColorStore();
    private outlineColorStoreUnsubscribe: Unsubscriber | undefined;
    private texturePromise: CancelablePromise<string[] | void> | undefined;
    private destroyed = false;
    protected pathToFollow?: { x: number; y: number }[];
    protected pathWalkingSpeed?: number;
    private currentPathSegmentDistanceFromStart = 0;
    private pathFollowingResolve?: (result: PathFollowResult) => void;

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
        companionTexturePromise: CancelablePromise<string> | undefined,
        userId?: string | null
    ) {
        super(scene, x, y /*, texture, frame*/);
        this.scene = scene;
        this.playerName = name;
        this.invisible = true;
        this.clickable = false;

        this.sprites = new Map<string, Sprite>();

        // Note: the picture store is rarely used because most of the time, we display the character sent in the space
        // by the remote player.
        // The sole place where we need the picture store is when you click on a Woka on the map and want to display
        // the Woka sprite in the popup that opens.
        this._pictureStore = readable<string | undefined>(undefined, (set) => {
            this.waitAndGetSnapshot()
                .then((htmlImageElementSrc) => {
                    set(htmlImageElementSrc);
                })
                .catch((e) => {
                    console.warn(e);
                    set(defaultWoka);
                });
        });

        if (userId != undefined) {
            this.waitAndGetSnapshot()
                .then((htmlImageElementSrc) => {
                    currentPlayerWokaStore.set(htmlImageElementSrc);
                })
                .catch((e) => {
                    console.warn(e);
                    currentPlayerWokaStore.set(defaultWoka);
                });
        }

        //textures are inside a Promise in case they need to be lazyloaded before use.
        this.texturePromise = texturesPromise
            .then((textures) => {
                this.addTextures(textures, frame);
                this.invisible = false;
                this.playAnimation(direction, moving);
                this.textureLoadedDeferred.resolve();
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
                    })
                    .catch((e) => {
                        this.textureLoadedDeferred.reject(e);
                        throw e;
                    });
            })
            .finally(() => {
                this.texturePromise = undefined;
            });

        if (companionTexturePromise != undefined) {
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

            const playerNameOutlineColor = get(this.outlineColorStore);
            this.usernameDisplay = new UsernameDisplay(
                scene,
                this.x,
                this.y + playerNameY,
                this.playerName,
                playerNameOutlineColor
            );
            this.usernameDisplay.setAvailabilityStatus(this.availabilityStatus, true, true);

            this.outlineColorStoreUnsubscribe = this.outlineColorStore.subscribe((color) => {
                this.usernameDisplay?.setPlayerNameOutlineColor(color);
                this.scene.markDirty();
            });
            this.scene.markDirty();
        }, 0);

        this.talkIcon = new TalkIcon(scene, 0, meetingSpeakingIconY);
        this.speakerIcon = new SpeakerIcon(scene, 0, meetingSpeakingIconY);
        this.add([this.talkIcon, this.speakerIcon]);

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
        this.setDepth(this.y + 16);
    }

    private waitAndGetSnapshot(): Promise<string> {
        if (this.lastRenderedSprite) {
            return Promise.resolve(this.lastRenderedSprite);
        }
        return new Promise((resolve) => {
            // getSnapshot can be quite long (~16ms) so we delay it to avoid freezing the game.
            // Since requestAnimationFrame has the priority over setTimeout, the game will keep running smoothly.
            this.textureLoadedDeferred.promise
                .then(() => {
                    setTimeout(() => {
                        this.getSnapshot()
                            .then((htmlImageElementSrc) => {
                                this.lastRenderedSprite = htmlImageElementSrc;
                                resolve(htmlImageElementSrc);
                            })
                            .catch((e) => {
                                console.warn(e);
                                this.lastRenderedSprite = defaultWoka;
                                resolve(defaultWoka);
                            });
                    }, 0);
                })
                .catch((e) => {
                    console.warn(e);
                    this.lastRenderedSprite = defaultWoka;
                    resolve(defaultWoka);
                });
        });
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
        if (availabilityStatus !== AvailabilityStatus.UNCHANGED) {
            this.availabilityStatus = availabilityStatus;
        }
        this.usernameDisplay?.setAvailabilityStatus(availabilityStatus, instant, false);
    }

    public getAvailabilityStatus() {
        return this.usernameDisplay?.getAvailabilityStatus() ?? this.availabilityStatus;
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

    protected updateUsernameDisplayPosition(x = this.x, y = this.y): void {
        this.usernameDisplay?.setPosition(x, y + playerNameY);
    }

    setPosition(x: number, y: number): this {
        super.setPosition(x, y);
        this.setDepth(this.y + 16);
        this.updateUsernameDisplayPosition();
        return this;
    }

    stop() {
        this.getBody().setVelocity(0, 0);
        this.playAnimation(this._lastDirection, false);
    }

    protected setPathToFollow(path: { x: number; y: number }[], speed?: number): Promise<PathFollowResult> {
        const isPreviousPathInProgress = this.isFollowingPath();
        this.pathToFollow = this.adjustPathToColliderBounds(path);
        this.pathToFollow.unshift({ x: this.x, y: this.y });
        this.pathWalkingSpeed = speed;
        this.currentPathSegmentDistanceFromStart = 0;

        return new Promise((resolve) => {
            this.pathFollowingResolve?.call(this, { x: this.x, y: this.y, cancelled: isPreviousPathInProgress });
            this.pathFollowingResolve = resolve;
        });
    }

    public finishFollowingPath(cancelled = false): void {
        this.pathToFollow = undefined;
        this.pathWalkingSpeed = undefined;
        this.currentPathSegmentDistanceFromStart = 0;
        this.stop();

        const resolve = this.pathFollowingResolve;
        this.pathFollowingResolve = undefined;
        resolve?.({ x: this.x, y: this.y, cancelled });
    }

    protected isFollowingPath(): boolean {
        return this.pathToFollow !== undefined || this.pathFollowingResolve !== undefined;
    }

    protected getPathWalkingSpeed(): number {
        return this.pathWalkingSpeed ?? WOKA_SPEED;
    }

    protected adjustPathToColliderBounds(path: { x: number; y: number }[]): { x: number; y: number }[] {
        const body = this.getBody();
        return path.map((step) => ({
            x: step.x,
            y: step.y - body.height / 2 - body.offset.y,
        }));
    }

    protected followPath(delta: number): void {
        if (this.pathToFollow !== undefined && this.pathToFollow.length === 1) {
            this.finishFollowingPath();
            return;
        }
        if (!this.pathToFollow) {
            return;
        }

        let segmentStartPos = this.pathToFollow[0];
        let segmentEndPos = this.pathToFollow[1];
        let xDistance = segmentEndPos.x - segmentStartPos.x;
        let yDistance = segmentEndPos.y - segmentStartPos.y;
        let pathSegmentLength = Math.sqrt(xDistance * xDistance + yDistance * yDistance);

        this.currentPathSegmentDistanceFromStart += (this.getPathWalkingSpeed() * delta * 20) / 1000;

        while (this.currentPathSegmentDistanceFromStart >= pathSegmentLength) {
            this.currentPathSegmentDistanceFromStart -= pathSegmentLength;
            this.pathToFollow.shift();

            if (this.pathToFollow.length === 1) {
                this.setPosition(this.pathToFollow[0].x, this.pathToFollow[0].y);
                this.finishFollowingPath();
                return;
            }

            segmentStartPos = this.pathToFollow[0];
            segmentEndPos = this.pathToFollow[1];
            xDistance = segmentEndPos.x - segmentStartPos.x;
            yDistance = segmentEndPos.y - segmentStartPos.y;
            pathSegmentLength = Math.sqrt(xDistance * xDistance + yDistance * yDistance);
        }

        const newX =
            segmentStartPos.x +
            (this.currentPathSegmentDistanceFromStart / pathSegmentLength) * (segmentEndPos.x - segmentStartPos.x);
        const newY =
            segmentStartPos.y +
            (this.currentPathSegmentDistanceFromStart / pathSegmentLength) * (segmentEndPos.y - segmentStartPos.y);

        this.moveToPathPosition(newX, newY);
        this.scene.markDirty();
    }

    protected moveToPathPosition(x: number, y: number): void {
        const oldX = this.x;
        const oldY = this.y;
        this.setPosition(x, y);

        // In path finding mode, diagonal movement can make x and y deltas almost equal.
        // Biasing y prevents the animation from flickering between horizontal and vertical directions.
        if (Math.abs(x - oldX) > Math.abs((y - oldY) * 1.1)) {
            if (x < oldX) {
                this._lastDirection = PositionMessage_Direction.LEFT;
            } else if (x > oldX) {
                this._lastDirection = PositionMessage_Direction.RIGHT;
            }
        } else {
            if (y < oldY) {
                this._lastDirection = PositionMessage_Direction.UP;
            } else if (y > oldY) {
                this._lastDirection = PositionMessage_Direction.DOWN;
            }
        }

        this.playAnimation(this._lastDirection, true);
        this.companion?.setTarget(this.x, this.y, this._lastDirection);
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
        this.usernameDisplay?.destroy();
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
        type: "warning" | "message" = "message",
        escapeCallback?: () => void
    ) {
        if (this.texts.has(id)) {
            this.destroyText(id);
        }
        this.textsToBuild.set(id, { text, duration, callback, type, escapeCallback });

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
            type,
            escapeCallback
        );
        this.add(speechDomElement);
        this.texts.set(id, speechDomElement);

        let y = -60 + this.texts.size * 2;
        if (escapeCallback !== undefined) {
            y = -70 + this.texts.size * 2;
        }
        speechDomElement.play(-1, y, duration, (id) => {
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
            .forEach(([id, { text, duration, callback, type = "message", escapeCallback }]) => {
                this.playText(id, text, duration, callback, false, type, escapeCallback);
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

    /**
     * Dismisses "new media device" prompts without switching devices, and reports each device id for persistence.
     * @returns true if at least one prompt was dismissed.
     */
    public dismissNewMediaDevicePrompts(onIgnoreDeviceId: (deviceId: string) => void): boolean {
        let dismissed = false;
        for (const id of this.texts.keys()) {
            if (!id.startsWith(PLAYTEXT_NEW_MEDIA_DEVICE_PREFIX)) {
                continue;
            }
            const deviceId = id.slice(PLAYTEXT_NEW_MEDIA_DEVICE_PREFIX.length);
            if (deviceId) {
                onIgnoreDeviceId(deviceId);
            }
            this.destroyText(id);
            dismissed = true;
        }
        return dismissed;
    }

    /**
     * Returns the collision rectangle for this character.
     * Uses the physics body dimensions and actual position.
     */
    public getCollisionRectangle(): { x: number; y: number; width: number; height: number } {
        const body = this.getBody();
        // Use body.left and body.top which give the actual world position of the collision box
        return {
            x: body.left,
            y: body.top,
            width: body.width,
            height: body.height,
        };
    }
}
