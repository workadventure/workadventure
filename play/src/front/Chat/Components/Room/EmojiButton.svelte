<script lang="ts">
    import { onDestroy } from "svelte";
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

    onDestroy(() => closeEmojiPicker?.());

    function togglePicker(event: MouseEvent) {
        // A click from Enter or Space has no pointer position: the picker then takes the focus, and gives it back.
        const fromKeyboard = event.detail === 0;
        const close = () => {
            closeEmojiPicker?.();
            closeEmojiPicker = undefined;
            if (fromKeyboard) {
                trigger.focus();
            }
        };
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
                        close();
                    },
                    onClose: close,
                    keyboardNavigation: fromKeyboard,
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
    class="p-0 m-0 w-7 h-7 grid place-items-center rounded-md text-white/80 hover:text-white hover:bg-white/10 focus-visible:text-white focus-visible:ring-2 focus-visible:ring-white/70 transition-all cursor-pointer"
    aria-label={$LL.chat.react()}
    title={$LL.chat.react()}
    bind:this={trigger}
    onclick={togglePicker}
>
    <IconMoodSmile font-size={18} />
</button>
