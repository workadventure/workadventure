<script lang="ts">
    import FirstConnection from "./FirstConnection.svelte";
    import { userStore } from "../../Stores/LocalUserStore";
    import { iframeListener } from "../../IframeListener";
    import Chat from "./Chat.svelte";

    window.addEventListener("load", () => {
        iframeListener.sendChatIsReady();
    });

    let chatWindowElement: HTMLElement;
</script>

<aside class="chatWindow tw-h-full tw-backdrop-blur-sm" bind:this={chatWindowElement}>
    <section class="tw-p-0 tw-m-0 tw-w-full tw-overflow-x-hidden">
        {#if !$userStore?.matrixUserId}
            <div class="tw-border tw-border-transparent tw-border-b-light-purple tw-border-solid">
                <div class="tw-p-3 tw-text-sm tw-text-center tw-text-white tw-font-bold">
                    You need to be connected to use the chat.
                    <button type="button" class="light tw-m-auto tw-cursor-pointer tw-px-3"> Log in </button>
                </div>
            </div>
        {:else}
            {#if !$userStore.isMatrixRegistered}
                <FirstConnection />
            {:else}
                <Chat />
            {/if}
        {/if}
    </section>
</aside>
