<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { EmojiClickEvent } from "emoji-picker-element/shared";
    import { showFloatingUi } from "../../../Utils/svelte-floatingui-show";
    import LazyEmote from "../../../Components/EmoteMenu/LazyEmote.svelte";
    import { IconMoodSmile } from "@wa-icons";

    const dispatch = createEventDispatcher<{
        change: string;
    }>();

    export let messageRef: HTMLDivElement | undefined;

    let trigger: HTMLButtonElement;

    let closeEmojiPicker: (() => void) | undefined = undefined;

    function togglePicker() {
        if (closeEmojiPicker) {
            closeEmojiPicker();
            closeEmojiPicker = undefined;
        } else if (messageRef) {
            closeEmojiPicker = showFloatingUi(
                messageRef,
                LazyEmote,
                {
                    onEmojiClick: (event: EmojiClickEvent) => {
                        dispatch("change", event.detail.unicode ?? "");
                        closeEmojiPicker?.();
                        closeEmojiPicker = undefined;
                    },
                    onClose: () => {
                        closeEmojiPicker?.();
                        closeEmojiPicker = undefined;
                    },
                },
                {
                    placement: "top-end",
                },
                12,
                true
            );
        }
    }
</script>

<button
    data-testid="openEmojiPickerButton"
    class="p-0 m-0 text-white/50 hover:text-white transition-all flex"
    bind:this={trigger}
    on:click={togglePicker}
>
    <IconMoodSmile font-size={16} />
</button>
