import type {BodyResourceDescriptionInterface} from "../Entity/PlayerTextures";
import {emoteEventStream} from "../../Connexion/EmoteEventStream";
import type {GameScene} from "./GameScene";
import type {RadialMenuItem} from "../Components/RadialMenu";
import LoaderPlugin = Phaser.Loader.LoaderPlugin;
import type {Subscription} from "rxjs";


interface RegisteredEmote extends BodyResourceDescriptionInterface {
    name: string;
    img: string;
}

export const emotes: {[key: string]: RegisteredEmote} = {
    'emote-heart': {name: 'emote-heart', img: 'resources/emotes/heart-emote.png'},
    'emote-clap': {name: 'emote-clap', img: 'resources/emotes/clap-emote.png'},
    'emote-hand': {name: 'emote-hand', img: 'resources/emotes/hand-emote.png'},
    'emote-thanks': {name: 'emote-thanks', img: 'resources/emotes/thanks-emote.png'},
    'emote-thumb-up': {name: 'emote-thumb-up', img: 'resources/emotes/thumb-up-emote.png'},
    'emote-thumb-down': {name: 'emote-thumb-down', img: 'resources/emotes/thumb-down-emote.png'},
};

export class EmoteManager {
    private subscription: Subscription;
    
    constructor(private scene: GameScene) {
        this.subscription = emoteEventStream.stream.subscribe((event) => {
            const actor = this.scene.MapPlayersByKey.get(event.userId);
            if (actor) {
                this.lazyLoadEmoteTexture(event.emoteName).then(emoteKey => {
                    actor.playEmote(emoteKey);
                })
            }
        })
    }
    createLoadingPromise(loadPlugin: LoaderPlugin, playerResourceDescriptor: BodyResourceDescriptionInterface) {
        return new Promise<string>((res) => {
            if (loadPlugin.textureManager.exists(playerResourceDescriptor.name)) {
                return res(playerResourceDescriptor.name);
            }
            loadPlugin.image(playerResourceDescriptor.name, playerResourceDescriptor.img);
            loadPlugin.once('filecomplete-image-' + playerResourceDescriptor.name, () => res(playerResourceDescriptor.name));
        });
    }
    
    lazyLoadEmoteTexture(textureKey: string): Promise<string> {
        const emoteDescriptor = emotes[textureKey];
        if (emoteDescriptor === undefined) {
            throw 'Emote not found!';
        }
        const loadPromise = this.createLoadingPromise(this.scene.load, emoteDescriptor);
        this.scene.load.start();
        return loadPromise
    }
    
    getMenuImages(): Promise<RadialMenuItem[]> {
        const promises = [];
        for (const key in emotes) {
            const promise = this.lazyLoadEmoteTexture(key).then((textureKey) => {
                return {
                    image: textureKey,
                    name: textureKey,
                }
            });
            promises.push(promise);
        }
        return Promise.all(promises);
    }
    
    destroy() {
        this.subscription.unsubscribe();
    }
}