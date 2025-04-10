<script lang="ts">
    import { Color } from "@workadventure/shared-utils";
    import Woka from "../Woka/Woka.svelte";
    import { LL } from "../../../i18n/i18n-svelte";

    export let name: string;
    export let isMe = false;
    export let wokaSrc: string;
    export let minimal = true;

    $: size = minimal ? 20 : 32;

    let backGroundColor = Color.getColorByString(name);
    let textColor = Color.getTextColorByBackgroundColor(backGroundColor);
</script>

<div id="tag" class:minimal style="background-color: {backGroundColor}; color: {textColor};">
    <div id="woka">
        <Woka src={wokaSrc} customWidth={`${size}px`} />
    </div>
    <span id="name">{isMe ? $LL.camera.my.nameTag() : name}</span>
</div>
