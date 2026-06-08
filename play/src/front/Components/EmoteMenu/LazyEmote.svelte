<script lang="ts">
    import type { EmojiClickEvent } from "emoji-picker-element/shared";
    import Lazy from "../Lazy.svelte";

    interface Props {
        onEmojiClick: (event: EmojiClickEvent) => void;
        onClose: () => void;
        onLoad: () => void;
        onLoaded: () => void;
        onError: () => void;
    }

    let {
        onEmojiClick = () => {},
        onClose = () => {},
        onLoad = () => {},
        onLoaded = () => {},
        onError = () => {},
    }: Props = $props();
</script>

<Lazy
    onload={onLoad}
    onloaded={onLoaded}
    onerror={onError}
    when={true}
    component={() => import("../EmoteMenu/EmoteMenu.svelte")}
    {onEmojiClick}
    {onClose}
/>
