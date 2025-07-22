<script lang="ts">
    import { fly } from "svelte/transition";
    import { onMount } from "svelte";
    import { helpWebRtcSettingsVisibleStore } from "../../Stores/HelpSettingsStore";
    import { LL } from "../../../i18n/i18n-svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { warningMessageStore } from "../../Stores/ErrorStore";
    import Spinner from "../Icons/Spinner.svelte";
    import InputCheckbox from "../Input/InputCheckbox.svelte";

    let notAskAgain = false;

    function refresh() {
        window.location.reload();
    }

    function close() {
        helpWebRtcSettingsVisibleStore.set("hidden");
    }

    function getBackgroundColor() {
        if (!gameManager.currentStartedRoom) return undefined;
        return gameManager.currentStartedRoom.backgroundColor;
    }

    function onChangesAskAgain() {
        localStorage.setItem("notAskAgainHelpWebRtcSettingsPopup", `${notAskAgain}`);
    }

    onMount(() => {
        const notAskAgainValue = localStorage.getItem("notAskAgainHelpWebRtcSettingsPopup");
        console.log("On mount notAskAgainValue", notAskAgainValue);
        if (notAskAgainValue === "true") {
            // Close this popup but show warning message
            warningMessageStore.addWarningMessage($LL.camera.webrtc.content());
            close();
        }
    });

    /* eslint-disable svelte/no-at-html-tags */
</script>

<form
    class="helpCameraSettings z-[600] bg-contrast/80 backdrop-blur rounded-lg text-white self-center pointer-events-auto flex flex-col m-auto w-full md:w-2/3 2xl:w-1/4 text-sm md:text-base"
    style={getBackgroundColor() ? `background-color: ${getBackgroundColor()};` : ""}
    on:submit|preventDefault={close}
    transition:fly={{ y: -50, duration: 500 }}
>
    <section class="mb-0 p-4">
        {#if $helpWebRtcSettingsVisibleStore === "error"}
            <h2 class="mb-2">{$LL.camera.webrtc.title()}</h2>
        {:else}
            <h2 class="mb-2">
                <div class="text-left">
                    <div role="status" class="flex flex-row w-full gap-3 ">
                        <span class="grow">
                            {$LL.camera.webrtc.titlePending()}
                        </span>
                        <Spinner />
                    </div>
                </div>
            </h2>
        {/if}
        <p class="err blue-title">{$LL.camera.webrtc.error()}</p>
        <p>{$LL.camera.webrtc.content()}</p>
        <ul>
            <li>{@html $LL.camera.webrtc.solutionVpn()}</li>
            <li>{@html $LL.camera.webrtc.solutionHotspot()}</li>
            <!-- TODO: Bring the link to the network guide from the admin -->
            <!--<li>{@html $LL.camera.webrtc.solutionNetworkAdmin()}<a href="" target="_blank">{$LL.camera.webrtc.preparingYouNetworkGuide()}</a></li>-->
        </ul>
    </section>
    <section class="flex row justify-start content-center items-center text-xs px-4">
        <InputCheckbox
            id="askagain"
            bind:value={notAskAgain}
            onChange={onChangesAskAgain}
            label={$LL.camera.webrtc.solutionVpnNotAskAgain()}
        />
    </section>
    <section class="justify-center bottom-0 w-full bg-contrast p-4 flex flex-row space-x-4 mt-4 rounded-b-lg">
        <button class="btn bg-white/10 hover:bg-white/20 grow" on:click|preventDefault={refresh}
            >{$LL.camera.webrtc.refresh()}</button
        >
        <button type="submit" class="btn btn-secondary grow" on:click|preventDefault={close}
            >{$LL.camera.webrtc.continue()}</button
        >
    </section>
</form>
