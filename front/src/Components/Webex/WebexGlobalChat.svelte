<script lang="typescript">
    import { webexIntegration } from "../../WebRtc/WebexIntegration";

    function openGlobalChat() {
        webexIntegration.startGlobal();
    }
</script>

<div class="webex-global">
    <button on:click={openGlobalChat}>Webex Global</button>
</div>

<style lang="scss">
    .webex-global {
        position: absolute;
        bottom: 10px;
        left: 70px;
        pointer-events: all;

        & button {
            min-width: 34px;
            background-color: black;
            color: white;
            border-radius: 7px;
            padding: 2px 8px;
        }

        & button img {
            width: 14px;
            padding-top: 0;
        }
    }
</style>
