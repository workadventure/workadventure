<script lang="ts">
    import { Color } from "@workadventure/shared-utils";
    import Woka from "../Woka/Woka.svelte";
    import { LL } from "../../../i18n/i18n-svelte";

    interface Props {
        name: string;
        isMe: boolean;
        wokaSrc: string;
        minimal: boolean;
    }

    let { name, isMe = false, wokaSrc, minimal = true }: Props = $props();

    let size = $derived(minimal ? 20 : 32);

    let backGroundColor = $derived(Color.getColorByString(name));
    let textColor = $derived(Color.getTextColorByBackgroundColor(backGroundColor));
</script>

<div id="tag" class:minimal style="background-color: {backGroundColor}; color: {textColor};">
    <div id="woka">
        <Woka src={wokaSrc} customWidth={`${size}px`} />
    </div>
    <span id="name">{isMe ? $LL.camera.my.nameTag() : name}</span>
</div>
