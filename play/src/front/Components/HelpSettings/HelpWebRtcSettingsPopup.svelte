<script lang="ts">
    import { fly } from "svelte/transition";
    import { onMount } from "svelte";
    import { helpWebRtcSettingsVisibleStore } from "../../Stores/HelpSettingsStore";
    import { LL } from "../../../i18n/i18n-svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { warningMessageStore } from "../../Stores/ErrorStore";

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
        if (notAskAgainValue === "true") {
            // Close this popup but show warning message
            warningMessageStore.addWarningMessage($LL.camera.webrtc.content());
            close();
        }
    });

    /* eslint-disable svelte/no-at-html-tags */
</script>

<form
    class="helpCameraSettings z-[600] bg-dark-purple rounded text-white self-center p-3 pointer-events-auto flex flex-col m-auto w-full md:w-2/3 2xl:w-1/4 text-sm md:text-base"
    style={getBackgroundColor() ? `background-color: ${getBackgroundColor()};` : ""}
    on:submit|preventDefault={close}
    transition:fly={{ y: -50, duration: 500 }}
>
    <section class="mb-0">
        {#if $helpWebRtcSettingsVisibleStore === "error"}
            <h2 class="mb-2">{$LL.camera.webrtc.title()}</h2>
        {:else if $helpWebRtcSettingsVisibleStore === "pending"}
            <h2 class="mb-2">
                <div class="text-left">
                    <div role="status">
                        <svg
                            aria-hidden="true"
                            class="inline w-7 h-7 mr-2 text-gray animate-spin dark:text-gray fill-light-blue"
                            viewBox="0 0 100 101"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                                fill="currentColor"
                            />
                            <path
                                d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                                fill="currentFill"
                            />
                        </svg>
                        <span>{$LL.camera.webrtc.titlePending()}</span>
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
    <section class="flex row justify-center content-center items-center text-xs">
        <input type="checkbox" id="askagain" class="mx-1" bind:checked={notAskAgain} on:change={onChangesAskAgain} />
        <label for="askagain" class="m-0 mx-1">{$LL.camera.webrtc.solutionVpnNotAskAgain()}</label>
    </section>
    <section class="flex row justify-center content-center items-center text-xs">
        <input type="checkbox" id="askagain" class="mx-1" bind:checked={notAskAgain} on:change={onChangesAskAgain} />
        <label for="askagain" class="m-0 mx-1">{$LL.camera.webrtc.solutionVpnNotAskAgain()}</label>
    </section>
    <section class="flex row justify-center">
        <button class="light" on:click|preventDefault={refresh}>{$LL.camera.webrtc.refresh()}</button>
        <button type="submit" class="outline" on:click|preventDefault={close}>{$LL.camera.webrtc.continue()}</button>
    </section>
</form>
