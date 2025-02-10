<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { EmojiButton } from "@joeattardi/emoji-button";
    import { emoteMenuStore, emoteDataStore } from "../../Stores/EmoteStore";
    import { LL } from "../../../i18n/i18n-svelte";
    import { isMediaBreakpointUp } from "../../Utils/BreakpointsUtils";
    import { bottomActionBarVisibilityStore } from "../../Stores/BottomActionBarStore";

    let emojiContainer: HTMLElement;
    let picker: EmojiButton;

    onMount(() => {
        picker = new EmojiButton({
            rootElement: emojiContainer,
            styleProperties: {
                "--font": "Roboto Condensed",
                "--text-color": "#ffffff",
                "--secondary-text-color": "#ffffff",
                "--category-button-color": "#ffffff",
                "--category-button-active-color": "rgb(103, 233, 123)",
            },
            position: {
                top: "8.5rem",
            },
            emojisPerRow: isMediaBreakpointUp("md") ? 6 : 8,
            autoFocusSearch: false,
            style: "native",
            showPreview: false,
            autoHide: false,
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
            emoteDataStore.pushNewEmoji(selection);
        });

        picker.on("hidden", () => {
            emoteMenuStore.closeEmoteMenu();
        });
    });

    /*function onKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape") {
            emoteMenuStore.closeEmoteMenu();
        }
    }*/

    onDestroy(() => {
        picker.destroyPicker();
    });
</script>

<div class="flex w-full h-full justify-center items-center absolute z-[300]">
    <div
        class="flex flex-col items-center pointer-events-auto justify-center m-auto bottom-1 z-[251] transition-transform duration-300 sm:flex-row {$bottomActionBarVisibilityStore
            ? 'active-discussion'
            : ''}"
        bind:this={emojiContainer}
    />
</div>
