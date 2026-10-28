<script lang="ts">
    import type { EmojiClickEvent } from "emoji-picker-element/shared";
    import { showFloatingUi } from "../../../Utils/svelte-floatingui-show";
    import LazyEmote from "../../../Components/EmoteMenu/LazyEmote.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import { IconMoodSmile } from "@wa-icons";

    interface Props {
        messageRef?: HTMLDivElement;
        onchange?: (emoji: string) => void;
    }

    let { messageRef, onchange }: Props = $props();

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
                        onchange?.(event.detail.unicode ?? "");
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
                true,
            );
        }
    }
</script>

<button
    data-testid="openEmojiPickerButton"
    class="p-0 m-0 text-white/50 hover:text-white focus-visible:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white rounded-sm transition-all flex"
    aria-label={$LL.chat.react()}
    title={$LL.chat.react()}
    bind:this={trigger}
    onclick={togglePicker}
>
    <IconMoodSmile font-size={16} />
</button>
