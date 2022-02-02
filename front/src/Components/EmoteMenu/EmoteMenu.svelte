<script lang="typescript">
    import type { Unsubscriber } from "svelte/store";
    import { emoteStore, emoteMenuStore } from "../../Stores/EmoteStore";
    import { onDestroy, onMount } from "svelte";
    import { EmojiButton } from "@joeattardi/emoji-button";
    import LL from "../../i18n/i18n-svelte";
    import { isMediaBreakpointUp } from "../../Utils/BreakpointsUtils";

    let emojiContainer: HTMLElement;
    let picker: EmojiButton;

    let unsubscriber: Unsubscriber | null = null;

    onMount(() => {
        picker = new EmojiButton({
            rootElement: emojiContainer,
            styleProperties: {
                "--font": "Press Start 2P",
                "--text-color": "whitesmoke",
                "--secondary-text-color": "whitesmoke",
                "--category-button-color": "whitesmoke",
            },
            emojisPerRow: isMediaBreakpointUp("md") ? 6 : 8,
            autoFocusSearch: false,
            style: "twemoji",
            showPreview: false,
            i18n: {
                search: $LL.emoji.search(),
                categories: {
                    recents: $LL.emoji.categories.recents(),
                    smileys: $LL.emoji.categories.smileys(),
                    people: $LL.emoji.categories.people(),
                    animals: $LL.emoji.categories.animals(),
                    food: $LL.emoji.categories.food(),
                    activities: $LL.emoji.categories.activities(),
                    travel: $LL.emoji.categories.travel(),
                    objects: $LL.emoji.categories.objects(),
                    symbols: $LL.emoji.categories.symbols(),
                    flags: $LL.emoji.categories.flags(),
                    custom: $LL.emoji.categories.custom(),
                },
                notFound: $LL.emoji.notFound(),
            },
        });
        //the timeout is here to prevent the menu from flashing
        setTimeout(() => picker.showPicker(emojiContainer), 100);

        picker.on("emoji", (selection) => {
            emoteStore.set({
                unicode: selection.emoji,
                url: selection.url,
                name: selection.name,
            });
        });

        picker.on("hidden", () => {
            emoteMenuStore.closeEmoteMenu();
        });
    });

    function onKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape") {
            emoteMenuStore.closeEmoteMenu();
        }
    }

    onDestroy(() => {
        if (unsubscriber) {
            unsubscriber();
        }

        picker.destroyPicker();
    });
</script>

<svelte:window on:keydown={onKeyDown} />

<div class="emote-menu-container">
    <div class="emote-menu" bind:this={emojiContainer} />
</div>

<style lang="scss">
    .emote-menu-container {
        display: flex;
        width: 100%;
        height: 100%;
        justify-content: center;
        align-items: center;
        position: absolute;
        z-index: 300;
    }

    .emote-menu {
        pointer-events: all;
    }
</style>
