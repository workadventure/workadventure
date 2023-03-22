<script lang="ts">
    import { Color } from "@workadventure/shared-utils";
    import Woka from "../Woka/Woka.svelte";

    export let name: string;
    export let wokaSrc: string;
    export let minimal = true;

    $: size = minimal ? 20 : 32;

    let backGroundColor = Color.getColorByString(name);
    let textColor = Color.getTextColorByBackgroundColor(backGroundColor);
</script>

<div id="tag" class:minimal style="background-color: {backGroundColor}; color: {textColor};">
    <div id="woka">
        <Woka src={wokaSrc} customHeight={`${size}px`} customWidth={`${size}px`} />
    </div>
    <span id="name">{name}</span>
</div>

<style lang="scss">
    #tag{
        @apply tw-flex tw-rounded-sm tw-items-center tw-w-full tw-p-2 tw-h-fit;
        &.minimal{
            @apply tw-absolute tw-left-0 tw-bottom-0 tw-p-0 tw-pr-2 tw-pb-[1px] tw-items-end tw-w-fit tw-rounded-none tw-rounded-bl-sm tw-rounded-tr-lg;
            #name {
                @apply tw-ml-0.5 tw-text-xs tw-leading-[0.875rem] tw-px-0;
            }
            #woka{
                @apply tw--mt-3;
            }
        }
        #name{
            @apply tw-font-semibold tw-text-sm tw-not-italic tw-break-words tw-px-2 tw-overflow-y-auto tw-max-h-10 tw-flex;
        }
    }
</style>
