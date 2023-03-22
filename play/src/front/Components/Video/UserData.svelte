<script lang="ts">
    import { Color } from "@workadventure/shared-utils";

    export let username: string;
    export let minimized = true;

    let backGroundColor = Color.getColorByString(username);
    let textColor = Color.getTextColorByBackgroundColor(backGroundColor);
</script>

<div class="nametag-webcam-container container-end media-box-camera-on-size video-on-responsive-height">
    <i class="tw-flex">
        <span
            style="background-color: {backGroundColor}; color: {textColor};"
            class="nametag-text nametag-shape tw-pr-3 tw-pl-5 tw-h-4 tw-max-h-8">{username}</span
        >
    </i>
</div>
<div class="woka-webcam-container container-end video-on-responsive-height tw-pb-1 tw-left-0">
    <div class="tw-flex {minimized ? '' : 'no-video'}">
        <img
            {src}
            alt=""
            class="nes-pointer noselect"
            style="--theme-width: {customWidth ?? width}; --theme-height: {customHeight ??
                height} image-rendering: pixalated"
            draggable="false"
            on:dragstart|preventDefault={noDrag}
        />
    </div>
</div>

<style lang="scss">
    img {
        display: inline-block;
        pointer-events: auto;
        width: var(--theme-width);
        height: var(--theme-height);
        margin: 0;
        padding: 0;
        position: static;
        left: 0;
        bottom: 0;
        right: 0;
        top: 0;
        image-rendering: pixelated;
    }
</style>
