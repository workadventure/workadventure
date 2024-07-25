import { EmojiButton } from "@joeattardi/emoji-button";
import { get } from "svelte/store";
import LL from "../../i18n/i18n-svelte";

export const getChatEmojiPicker = (position?: { top?: string; right?: string; left?: string; bottom?: string }) => {
    const translationFunction = get(LL);
    return new EmojiButton({
        styleProperties: {
            "--background-color": "#23222c",
            "--text-color": "#ffffff",
            "--secondary-text-color": "#ffffff",
            "--category-button-color": "#ffffff",
            "--category-button-active-color": "#56eaff",
        },
        emojisPerRow: 5,
        autoFocusSearch: false,
        showPreview: false,
        position: position ?? "auto",
        rootElement: document.getElementById("chat") ?? document.body,
        i18n: {
            search: translationFunction.emoji.search(),
            categories: {
                recents: translationFunction.emoji.categories.recents(),
                smileys: translationFunction.emoji.categories.smileys(),
                people: translationFunction.emoji.categories.people(),
                animals: translationFunction.emoji.categories.animals(),
                food: translationFunction.emoji.categories.food(),
                activities: translationFunction.emoji.categories.activities(),
                travel: translationFunction.emoji.categories.travel(),
                objects: translationFunction.emoji.categories.objects(),
                symbols: translationFunction.emoji.categories.symbols(),
                flags: translationFunction.emoji.categories.flags(),
                custom: translationFunction.emoji.categories.custom(),
            },
            notFound: translationFunction.emoji.notFound(),
        },
    });
};
