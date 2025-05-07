<script lang="ts">
    import type { EmojiClickEvent } from "emoji-picker-element/shared";
    import Lazy from "../Lazy.svelte";

    export let onEmojiClick: (event: EmojiClickEvent) => void = () => {};
    export let onClose: () => void = () => {};
    export let onLoad: () => void = () => {};
    export let onLoaded: () => void = () => {};
    export let onError: () => void = () => {};
</script>

<Lazy
    on:onload={onLoad}
    on:loaded={onLoaded}
    on:error={onError}
    when={true}
    component={() => import("../EmoteMenu/EmoteMenu.svelte")}
    {onEmojiClick}
    {onClose}
/>
