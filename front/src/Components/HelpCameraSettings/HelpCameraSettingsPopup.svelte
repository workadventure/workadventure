<script lang="typescript">
    import { fly } from 'svelte/transition';
    import {helpCameraSettingsVisibleStore} from "../../Stores/HelpCameraSettingsStore";
    import firefoxImg from "./images/help-setting-camera-permission-firefox.png";
    import chromeImg from "./images/help-setting-camera-permission-chrome.png";

    let isAndroid = window.navigator.userAgent.includes('Android');
    let isFirefox = window.navigator.userAgent.includes('Firefox');
    let isChrome = window.navigator.userAgent.includes('Chrome');

    function refresh() {
        window.location.reload();
    }

    function close() {
        helpCameraSettingsVisibleStore.set(false);
    }

</script>

<form class="helpCameraSettings nes-container" on:submit|preventDefault={close} transition:fly="{{ y: -900, duration: 500 }}">
    <section>
        <h2>Camera / Microphone access needed</h2>
        <p class="err">Permission denied</p>
        <p>You must allow camera and microphone access in your browser.</p>
        <p>
            {#if isFirefox }
                <p class="err">Please click the "Remember this decision" checkbox, if you don't want Firefox to keep asking you the authorization.</p>
                <img src={firefoxImg} alt="" />
            {:else if isChrome && !isAndroid }
                <img src={chromeImg} alt="" />
            {/if}
        </p>
    </section>
    <section>
        <button class="helpCameraSettingsFormRefresh nes-btn" on:click|preventDefault={refresh}>Refresh</button>
        <button type="submit" class="helpCameraSettingsFormContinue nes-btn is-primary" on:click|preventDefault={close}>Continue without webcam</button>
    </section>
</form>


<style lang="scss">
    .helpCameraSettings {
        pointer-events: auto;
        background: #eceeee;
        margin-left: auto;
        margin-right: auto;
        margin-top: 10vh;
        max-height: 80vh;
        max-width: 80vw;
        overflow: auto;
        text-align: center;

        h2 {
            font-family: 'Press Start 2P';
        }

        section {
            p {
                margin: 15px;
                font-family: 'Press Start 2P';

                & .err {
                    color: #ff0000;
                }
            }
            img {
                max-width: 500px;
                width: 100%;
            }
        }
    }
</style>
