<script lang="ts">
    import type { Readable } from "svelte/store";
    import { derived } from "svelte/store";
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
    import { getStatusLabel } from "../../../Utils/AvailabilityStatus";
    import MicOnIcon from "../../Icons/MicOnIcon.svelte";
    import MicOffIcon from "../../Icons/MicOffIcon.svelte";

    import {
        createMediaToggleAvailableStore,
        mediaToggleStatusBlockedStore,
        toggleMedia,
    } from "../../../Stores/MediaToggleStore";

    const microphoneToggleAvailableStore = createMediaToggleAvailableStore("microphone");

    const disabledByStatusStore = derived(
        [mediaToggleStatusBlockedStore, silentStore],
        ([$mediaToggleStatusBlocked, $silentStore]) => $mediaToggleStatusBlocked || $silentStore,
    );

    const microphoneButtonStateStore: Readable<"active" | "disabled" | "normal" | "forbidden"> = derived(
        [microphoneToggleAvailableStore, requestedMicrophoneState],
        ([$microphoneToggleAvailable, $requestedMicrophoneState]) => {
            if (!$microphoneToggleAvailable) {
                return "disabled";
            }
            return $requestedMicrophoneState ? "normal" : "forbidden";
        },
    );

    const microphoneActionBarTooltipStore = derived(
        [LL, microphoneButtonHelpContextStore, disabledByStatusStore, availabilityStatusStore],
        ([$LL, ctx, disabledByStatus, status]) => {
            if (disabledByStatus) {
                return {
                    title: $LL.actionbar.help.micDisabledByStatus.title(),
                    desc: $LL.actionbar.help.micDisabledByStatus.desc({ status: getStatusLabel(status) }),
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
        toggleMedia("microphone");
    }
</script>

<ActionBarButton
    onclick={microphoneClick}
    classList="group/btn-mic peer/mic"
    disabledHelp={$openedMenuStore !== undefined}
    state={$microphoneButtonStateStore}
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
