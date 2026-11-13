<script lang="ts">
    import type { Readable } from "svelte/store";
    import { derived } from "svelte/store";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import ActionBarButton from "../ActionBarButton.svelte";
    import {
        availabilityStatusStore,
        microphoneButtonHelpContextStore,
        microphoneListStore,
        requestedMicrophoneState,
        silentStore,
    } from "../../../Stores/MediaStore";
    import { openedMenuStore } from "../../../Stores/MenuStore";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { getNavigatorType, isAndroid, NavigatorType } from "../../../WebRtc/DeviceUtils";
    import { getColorHexOfStatus, getStatusLabel } from "../../../Utils/AvailabilityStatus";
    import { canComeBackFrom, heldMediaStore, toggleMicrophone } from "../../../Stores/HeldMediaStore";

    import MicOnIcon from "../../Icons/MicOnIcon.svelte";
    import MicOffIcon from "../../Icons/MicOffIcon.svelte";

    // Turned off by the user: off (red), even under a status that would hold it. Held by the status: see statusDot.
    const microphoneButtonStateStore: Readable<"active" | "disabled" | "normal" | "forbidden"> = derived(
        [requestedMicrophoneState, microphoneListStore, silentStore],
        ([$requestedMicrophoneState, $microphoneListStore, $silentStore]) => {
            if ($silentStore || ($microphoneListStore !== undefined && $microphoneListStore.length === 0)) {
                return "disabled";
            }
            return $requestedMicrophoneState ? "normal" : "forbidden";
        },
    );

    const microphoneActionBarTooltipStore = derived(
        [LL, microphoneButtonHelpContextStore, heldMediaStore, silentStore, availabilityStatusStore],
        ([$LL, ctx, held, silent, status]) => {
            if (held.microphone && canComeBackFrom(held.status)) {
                return {
                    title: $LL.actionbar.help.micPausedByStatus.title(),
                    desc: $LL.actionbar.help.micPausedByStatus.desc({ status: getStatusLabel(held.status) }),
                    media: "",
                };
            }
            if (held.microphone || silent) {
                return {
                    title: $LL.actionbar.help.micDisabledByStatus.title(),
                    desc: $LL.actionbar.help.micDisabledByStatus.desc({
                        status: getStatusLabel(held.microphone ? held.status : status),
                    }),
                    media: "",
                };
            }
            const permissionMedia = (() => {
                try {
                    if (isAndroid()) {
                        return $LL.camera.help.microphoneTooltip.permissionMedia.android();
                    }
                    const nt = getNavigatorType();
                    if (nt === NavigatorType.firefox) {
                        return $LL.camera.help.microphoneTooltip.permissionMedia.firefox();
                    }
                    if (nt === NavigatorType.chrome) {
                        return $LL.camera.help.microphoneTooltip.permissionMedia.chrome();
                    }
                    if (nt === NavigatorType.safari) {
                        return $LL.camera.help.microphoneTooltip.permissionMedia.safari();
                    }
                } catch {
                    // getNavigatorType() throws on some embedded or uncommon browsers
                }
                return $LL.camera.help.microphoneTooltip.permissionMedia.default();
            })();

            if (ctx === "permission") {
                return {
                    title: $LL.camera.help.microphoneTooltip.permissionDeniedTitle(),
                    desc: $LL.camera.help.microphoneTooltip.permissionDeniedDesc(),
                    media: permissionMedia,
                };
            }
            if (ctx === "no_device") {
                return {
                    title: $LL.camera.help.microphoneTooltip.noDeviceTitle(),
                    desc: $LL.camera.help.microphoneTooltip.noDeviceDesc(),
                    media: "",
                };
            }
            return { title: "", desc: "", media: "" };
        },
    );

    function microphoneClick(): void {
        analyticsClient.trackAdminEvent("media.microphone.toggled");
        if ($silentStore) return;
        toggleMicrophone();
    }
</script>

<ActionBarButton
    onclick={microphoneClick}
    classList="group/btn-mic peer/mic"
    disabledHelp={$openedMenuStore !== undefined}
    state={$microphoneButtonStateStore}
    pressed={$microphoneButtonStateStore === "normal"}
    statusDot={$heldMediaStore.microphone ? getColorHexOfStatus($heldMediaStore.status) : undefined}
    statusDotClickable={canComeBackFrom($heldMediaStore.status)}
    ariaLabel={$microphoneActionBarTooltipStore.title || $LL.actionbar.help.mic.title()}
    dataTestId="microphone-button"
    tooltipTitle={$microphoneActionBarTooltipStore.title}
    desc={$microphoneActionBarTooltipStore.desc}
    media={$microphoneActionBarTooltipStore.media}
>
    {#if $requestedMicrophoneState && !$silentStore && $microphoneListStore && $microphoneListStore.length > 0}
        <MicOnIcon />
    {:else}
        <MicOffIcon />
    {/if}
</ActionBarButton>
