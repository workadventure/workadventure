<script lang="ts">
    import { EmojiButton } from "@joeattardi/emoji-button";
    import { createEventDispatcher } from "svelte";
    import { getChatEmojiPicker } from "../../EmojiPicker";
    import { IconMoodSmile } from "$lib/Components/Icons.ts";

    const dispatch = createEventDispatcher();

    let picker: EmojiButton | undefined;
    let trigger: HTMLButtonElement;

    function togglePicker() {
        // Lazy instantiation of the emoji picker. It takes ~250ms to load so we don't want to load it if we don't need it.
        if (!picker) {
            picker = getChatEmojiPicker(
                // FIXME: The position is not working as expected after migration to the new design.
                // We should probably migrate to a supported Emoji picker once we migrate to Svelte 5
                {
                    bottom: "0",
                    right: "0",
                }
            );
            picker.on("emoji", (selection: { emoji: string; name: string }) => {
                dispatch("change", selection.emoji);
            });
        }
        picker.togglePicker(trigger);
    }
</script>

<button
    data-testid="openEmojiPickerButton"
    class="p-0 m-0 text-white/50 hover:text-white transition-all"
    bind:this={trigger}
    on:click={togglePicker}
>
    <IconMoodSmile font-size={16} />
</button>
