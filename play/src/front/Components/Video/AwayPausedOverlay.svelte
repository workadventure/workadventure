<script lang="ts">
    import { AvailabilityStatus } from "@workadventure/messages";
    import { LL } from "../../../i18n/i18n-svelte";
    import { requestedCameraState, requestedMicrophoneState } from "../../Stores/MediaStore";
    import { heldMediaStore } from "../../Stores/HeldMediaStore";
    import { privacyShutdownStore } from "../../Stores/PrivacyShutdownStore";
    import { IconEyeOff, IconMicrophoneOff } from "@wa-icons";

    /**
     * Over the user's own tile while away mode holds their camera or microphone off: what the others get, and one
     * click to come back. A shutter over the whole tile when the camera is paused, a strip at its top when only the
     * microphone is. Overlaid so that coming back moves nothing. Devices the user turned off are never mentioned.
     */
    let paused = $derived(
        $heldMediaStore.status === AvailabilityStatus.AWAY ? $heldMediaStore : { camera: false, microphone: false },
    );
    let text = $derived(
        paused.camera
            ? paused.microphone
                ? $LL.video.away.cantSeeOrHear()
                : $requestedMicrophoneState
                  ? $LL.video.away.heardNotSeen()
                  : $LL.video.away.cantSee()
            : $requestedCameraState
              ? $LL.video.away.seenNotHeard()
              : $LL.video.away.cantHear(),
    );
    let action = $derived(
        paused.camera && paused.microphone
            ? $LL.video.away.turnOnBoth()
            : paused.camera
              ? $LL.video.away.turnOnCamera()
              : $LL.video.away.turnOnMicrophone(),
    );
</script>

{#snippet button()}
    <button
        type="button"
        class="pointer-events-auto shrink-0 cursor-pointer rounded-md bg-secondary hover:bg-secondary-600 px-3 py-1 text-sm text-white"
        data-testid="away-paused-turn-on"
        onclick={() => privacyShutdownStore.comeBack()}
    >
        <!-- A small tile keeps only the icon and a short button; the sentence stays in the tooltip. -->
        <span class="hidden @[14rem]/videomediabox:inline">{action}</span>
        <span class="@[14rem]/videomediabox:hidden">{$LL.video.away.turnOn()}</span>
    </button>
{/snippet}

{#if paused.camera}
    <div
        class="absolute inset-0 z-[260] flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-warning/60 bg-contrast p-2 text-center text-white"
        title={text}
        data-testid="away-paused-overlay"
    >
        <IconEyeOff class="text-warning shrink-0" font-size="20" />
        <div class="hidden @[14rem]/videomediabox:block text-sm leading-tight">{text}</div>
        <div class="hidden @[14rem]/videomediabox:block text-xs text-white/60 mb-1">{$LL.video.away.subtitle()}</div>
        {@render button()}
    </div>
{:else if paused.microphone}
    <div
        class="absolute top-0 inset-x-0 z-[260] flex items-center gap-2 rounded-t-lg border-b border-warning/60 bg-contrast px-2 py-1 text-white"
        title={text}
        data-testid="away-paused-overlay"
    >
        <IconMicrophoneOff class="text-warning shrink-0" font-size="16" />
        <span class="hidden @[14rem]/videomediabox:block flex-1 text-xs leading-tight">{text}</span>
        <span class="flex-1 @[14rem]/videomediabox:hidden"></span>
        {@render button()}
    </div>
{/if}
