<script lang="ts">
    import LL from "../i18n/i18n-svelte";
    import { iframeListener } from "../IframeListener";


    function login() {
        if (window.location !== window.parent?.location) {
            iframeListener.sendLogin();
        }
    }
</script>

<div class="tw-grid tw-place-items-center tw-h-screen">
    <div class="tw-px-5 tw-flex tw-items-center tw-flex-col">
        <p class="tw-text-center">{$LL.signIn()}</p>
        <button type="button" class="light tw-m-auto tw-cursor-pointer tw-px-3" on:click={login}>
            {$LL.logIn()}
        </button>
    </div>
</div>
