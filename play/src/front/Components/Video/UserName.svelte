<script lang="ts">
    import type { Snippet } from "svelte";
    import Woka from "../Woka/Woka.svelte";
    import type { PictureStore } from "../../Stores/PictureStore";
    import { LL } from "../../../i18n/i18n-svelte";
    import { IconCameraExclamation } from "@wa-icons";

    /**
     * A component that displays the Woka, the user's name and optionally a dropdown menu
     */

    interface Props {
        isCameraDisabled: boolean;
        // The background color is blue if the player has its microphone on
        isPlayingAudio: boolean;
        // The background color is green if the player has raised their hand (takes precedence over blue)
        isHandRaised?: boolean;
        picture: PictureStore;
        name: string;
        position: string;
        grayscale: boolean;
        isBlocked: boolean;
        // The camera is wanted on but delivers no image: told apart from a camera turned off on purpose
        cameraUnavailable?: boolean;
        children?: Snippet;
    }

    let {
        isCameraDisabled = false,
        isPlayingAudio = false,
        isHandRaised = false,
        picture,
        name,
        position = "",
        grayscale = false,
        isBlocked = false,
        cameraUnavailable = false,
        children,
    }: Props = $props();
</script>

{#if isCameraDisabled || isBlocked}
    <div class="{position} z-30 responsive-dimension">
        <div class="flex justify-between rounded bg-transparent">
            <div
                class="relative px-2 py-1 text-white text-sm bold rounded text-nowrap flex flex-col items-center gap-2"
            >
                <div
                    class="w-8 @[15rem]/videomediabox:w-16 @[25rem]/videomediabox:w-32"
                    style="image-rendering:pixelated"
                >
                    <Woka src={$picture ?? ""} customWidth="100%" {grayscale} />
                </div>
                <div class="flex items-center {isHandRaised ? 'rounded bg-success text-black pl-2' : ''}">
                    <span class="select-none">{name}</span>
                    {@render children?.()}
                </div>
                {#if cameraUnavailable && !isBlocked}
                    <div
                        class="flex items-center gap-1 text-xs font-normal opacity-80 select-none"
                        data-testid="camera-unavailable"
                    >
                        <IconCameraExclamation font-size="14" />
                        <span>{$LL.video.camera_unavailable()}</span>
                    </div>
                {/if}
            </div>
        </div>
    </div>
{:else}
    <div class="{position} z-30 responsive-dimension">
        <div
            class="flex justify-between rounded {isHandRaised
                ? 'bg-success/50 @[17.5rem]/videomediabox:bg-success/90 text-black'
                : isPlayingAudio
                  ? 'bg-secondary/50 @[17.5rem]/videomediabox:bg-secondary/90 text-white'
                  : 'bg-contrast/50 @[17.5rem]/videomediabox:bg-contrast/90 text-white'}"
        >
            <div
                class="relative @[17.5rem]/videomediabox:backdrop-blur px-2 py-[2px] text-sm {isHandRaised
                    ? ''
                    : 'text-shadow-md @[17.5rem]/videomediabox:text-shadow-none'} {$picture
                    ? 'pl-12'
                    : ''} bold rounded text-nowrap select-none"
            >
                {#if $picture}
                    <div class="absolute left-1 -top-1 z-30" style="image-rendering:pixelated">
                        <Woka src={$picture} customWidth="42px" {grayscale} />
                    </div>
                {/if}
                <span class="text-xs @[17.5rem]/videomediabox:text-sm">{name}</span>

                <!--{#if $requestedScreenSharingState === true}-->
                <!--    <ScreenShareIcon />-->
                <!--{/if}-->
            </div>

            {@render children?.()}
        </div>
    </div>
{/if}
