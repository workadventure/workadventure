import { get, writable } from "svelte/store";
import { analyticsClient } from "../Administration/AnalyticsClient.ts";
import { localUserStore } from "../Connection/LocalUserStore.ts";
import type { Emoji } from "./Utils/emojiSchema.ts";

function createEmoteMenuStore() {
    const { subscribe, set } = writable(false);

    return {
        subscribe,
        openEmoteMenu() {
            set(true);
        },
        closeEmoteMenu() {
            set(false);
        },
    };
}

function createEmoteDataStore() {
    const { subscribe, set, update } = writable(new Map<number, Emoji>());

    //check if favorite emoji already define
    const mapStored = localUserStore.getEmojiFavorite();
    if (mapStored != undefined) {
        set(mapStored);
    } else {
        const map = new Map<number, Emoji>();
        map.set(1, { emoji: "👍", name: "thumbs up" });
        map.set(2, { emoji: "❤️", name: "red heart" });
        map.set(3, { emoji: "😂", name: "face with tears of joy" });
        map.set(4, { emoji: "👏", name: "clapping hands" });
        map.set(5, { emoji: "😍", name: "smiling face with heart-eyes" });
        map.set(6, { emoji: "🙏", name: "folded hands" });
        set(map);
    }

    return {
        subscribe,
        pushNewEmoji(emoji: Emoji) {
            update((emojis: Map<number, Emoji>) => {
                emojis.set(get(emoteMenuSubCurrentEmojiSelectedStore), emoji);
                return emojis;
            });
        },
    };
}

function createEmoteMenuSubCurrentEmojiSelectedStore() {
    const { subscribe, set } = writable<number>(1);
    return {
        set,
        subscribe,
        select(selected: number) {
            set(selected);
        },
    };
}

export const emoteStore = writable<Emoji | null>(null);
export const emoteMenuSubCurrentEmojiSelectedStore = createEmoteMenuSubCurrentEmojiSelectedStore();
export const emoteMenuStore = createEmoteMenuStore();
export const emoteDataStore = createEmoteDataStore();

//subscribe to update localstorage favorite emoji
// This is a singleton, so we don't need to unsubscribe.
// eslint-disable-next-line svelte/no-ignored-unsubscribe
emoteDataStore.subscribe((map: Map<number, Emoji>) => {
    localUserStore.setEmojiFavorite(map);
});

export type EmoteIndex = 1 | 2 | 3 | 4 | 5 | 6;

export const isEmoteIndex = (value: number): value is EmoteIndex => {
    return value >= 1 && value <= 6;
};

export const displayEmote = (emoteIndex: EmoteIndex) => {
    const emoji: Emoji | null | undefined = get(emoteDataStore).get(emoteIndex);
    if (emoji) {
        analyticsClient.launchEmote(emoji);
        emoteStore.set(emoji);
    }
};
