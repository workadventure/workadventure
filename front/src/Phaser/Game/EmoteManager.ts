import {BodyResourceDescriptionInterface} from "../Entity/PlayerTextures";
import {createLoadingPromise} from "../Entity/PlayerTexturesLoadingManager";
import {emoteEventStream} from "../../Connexion/EmoteEventStream";
import {GameScene} from "./GameScene";
import {RadialMenuItem} from "../Components/RadialMenu";

enum RegisteredEmoteTypes {
    short = 1,
    long = 2,
}

interface RegisteredEmote extends BodyResourceDescriptionInterface {
    name: string;
    img: string;
    type: RegisteredEmoteTypes
}

//the last 3 emotes are courtesy of @tabascoeye
export const emotes: {[key: string]: RegisteredEmote} = {
    'emote-exclamation': {name: 'emote-exclamation', img: 'resources/emotes/pipo-popupemotes001.png', type: RegisteredEmoteTypes.short, },
    'emote-interrogation': {name: 'emote-interrogation', img: 'resources/emotes/pipo-popupemotes002.png', type: RegisteredEmoteTypes.short},
    'emote-sleep': {name: 'emote-sleep', img: 'resources/emotes/pipo-popupemotes021.png', type: RegisteredEmoteTypes.short},
    'emote-clap': {name: 'emote-clap', img: 'resources/emotes/taba-clap-emote.png', type: RegisteredEmoteTypes.short},
    'emote-thumbsdown': {name: 'emote-thumbsdown', img: 'resources/emotes/taba-thumbsdown-emote.png', type: RegisteredEmoteTypes.long},
    'emote-thumbsup': {name: 'emote-thumbsup', img: 'resources/emotes/taba-thumbsup-emote.png', type: RegisteredEmoteTypes.long},
};

export const getEmoteAnimName = (emoteKey: string): string => {
    return 'anim-'+emoteKey;
}

export class EmoteManager {
    
    constructor(private scene: GameScene) {
        emoteEventStream.stream.subscribe((event) => {
            const actor = this.scene.MapPlayersByKey.get(event.userId);
            if (actor) {
                this.lazyLoadEmoteTexture(event.emoteName).then(emoteKey => {
                    actor.playEmote(emoteKey);
                })
            }
        })
    }
    
    lazyLoadEmoteTexture(textureKey: string): Promise<string> {
        const emoteDescriptor = emotes[textureKey];
        if (emoteDescriptor === undefined) {
            throw 'Emote not found!';
        }
        const loadPromise = createLoadingPromise(this.scene.load, emoteDescriptor, {
            frameWidth: 32,
            frameHeight: 32,
        });
        this.scene.load.start();
        return loadPromise.then(() => {
            if (this.scene.anims.exists(getEmoteAnimName(textureKey))) {
                return Promise.resolve(textureKey);
            }
            const frameConfig = emoteDescriptor.type === RegisteredEmoteTypes.short ? {frames: [0,1,2]} : {frames : [0,1,2,3,4,5,6,7]};
            this.scene.anims.create({
                key: getEmoteAnimName(textureKey),
                frames: this.scene.anims.generateFrameNumbers(textureKey, frameConfig),
                frameRate: 3,
                repeat: 2,
            });
            return textureKey;
        });
    }
    
    getMenuImages(): Promise<RadialMenuItem[]> {
        const promises = [];
        for (const key in emotes) {
            const promise = this.lazyLoadEmoteTexture(key).then((textureKey) => {
                const emoteDescriptor = emotes[textureKey];
                return {
                    sprite: textureKey,
                    name: textureKey,
                    frame: emoteDescriptor.type === RegisteredEmoteTypes.short ? 1 : 4,
                }
            });
            promises.push(promise);
        }
        return Promise.all(promises);
    }
}