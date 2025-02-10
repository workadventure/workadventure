<script lang="ts">
    import { activeSecondaryZoneActionBarStore } from "../../../Stores/MenuStore";
    import {
        audioManagerPlayerState,
        audioManagerRetryPlaySubject,
        audioManagerVisibilityStore,
    } from "../../../Stores/AudioManagerStore";
    import AudioManager from "../../AudioManager/AudioManager.svelte";
    import ActionBarButton from "../ActionBarButton.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import { IconMusic } from "@wa-icons";
</script>

<ActionBarButton
    on:click={() => {
        if (
            $audioManagerVisibilityStore === "visible" &&
            $audioManagerPlayerState !== "not_allowed" &&
            $activeSecondaryZoneActionBarStore !== "audio-manager"
        ) {
            activeSecondaryZoneActionBarStore.set("audio-manager");
        } else if ($audioManagerVisibilityStore === "visible" && $audioManagerPlayerState === "not_allowed") {
            audioManagerRetryPlaySubject.next();
        } else {
            activeSecondaryZoneActionBarStore.set(undefined);
        }
    }}
    classList="group/btn-music"
    tooltipTitle={$audioManagerPlayerState !== "not_allowed"
        ? $LL.actionbar.help.audioManager.title()
        : $LL.actionbar.help.audioManagerNotAllowed.title()}
    tooltipDesc={$audioManagerPlayerState !== "not_allowed"
        ? $LL.actionbar.help.audioManager.desc()
        : $LL.actionbar.help.audioManagerNotAllowed.desc()}
    state={$audioManagerVisibilityStore === "visible"
        ? $audioManagerPlayerState !== "not_allowed"
            ? $activeSecondaryZoneActionBarStore !== "audio-manager"
                ? "normal"
                : "active"
            : "forbidden"
        : $audioManagerVisibilityStore === "error"
        ? "forbidden"
        : $audioManagerVisibilityStore === "disabledBySettings"
        ? "disabled"
        : undefined}
    dataTestId="music-button"
>
    <IconMusic height="24" width="24" />
</ActionBarButton>
{#if $activeSecondaryZoneActionBarStore === "audio-manager"}
    <AudioManager />
{/if}
