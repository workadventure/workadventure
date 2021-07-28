<script lang="typescript">
    import { webexIntegration } from "../../WebRtc/WebexIntegration";

    function openGlobalChat() {
        webexIntegration.startGlobal();
    }
</script>

<div class="webex-global">
    {#if webexIntegration.hasGlobalChat}
        <button on:click={openGlobalChat}>Global Chat</button>
    {/if}
</div>

<style lang="scss">
    .webex-global {
        position: absolute;
        bottom: 10px;
        left: 75px;
        pointer-events: all;

        & button {
            min-width: 34px;
            background-color: black;
            color: white;
            border-radius: 7px;
            padding: 2px 8px;
        }
    }
</style>
