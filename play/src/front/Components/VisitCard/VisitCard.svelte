<script lang="ts">
    import { fly } from "svelte/transition";
    import { onMount } from "svelte";
    import { get } from "svelte/store";
    import { requestVisitCardsStore, selectedChatIDRemotePlayerStore } from "../../Stores/GameStore";
    import { LL } from "../../../i18n/i18n-svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { openDirectChatRoom } from "../../Chat/Utils";
    import { IconLoader } from "@wa-icons";

    export let visitCardUrl: string;
    let w = "500px";
    let h = "250px";
    let hidden = true;
    let cvIframe: HTMLIFrameElement;

    const chatConnection = gameManager.chatConnection;
    const selectPlayerChatID = get(selectedChatIDRemotePlayerStore);
    const roomCreationInProgress = chatConnection.roomCreationInProgress;

    function closeCard() {
        requestVisitCardsStore.set(null);
    }

    function openChat() {
        if (!selectPlayerChatID) return;
        openDirectChatRoom(selectPlayerChatID).catch((error) => console.error(error));
        closeCard();
    }

    function handleIframeMessage(message: MessageEvent) {
        if (message.data.type === "cvIframeSize") {
            w = message.data.data.w + "px";
            h = message.data.data.h + "px";
        }
    }

    onMount(() => {
        cvIframe.onload = () => (hidden = false);
        cvIframe.onerror = () => (hidden = false);
    });
</script>

<section class="visitCard" transition:fly={{ y: -200, duration: 1000 }} style="width: {w}">
    {#if hidden}
        <div class="loader" />
    {/if}
    {#if !hidden}
        <div class="buttonContainer flex flex-row-reverse gap-2">
            <button class="light cursor-pointer px-3 mb-2 mr-0" data-testid="closeVisitCard" on:click={closeCard}
                >{$LL.menu.visitCard.close()}</button
            >
            {#if selectPlayerChatID}
                {#if !$roomCreationInProgress}
                    <button
                        class="light cursor-pointer px-3 mb-2 mr-0"
                        data-testid="sendMessagefromVisitCardButton"
                        on:click={openChat}>{$LL.menu.visitCard.sendMessage()}</button
                    >
                {:else}
                    <button class="light cursor-pointer px-3 mb-2 mr-0" data-testid="sendMessagefromVisitCardButton">
                        <IconLoader class="animate-spin" />
                    </button>
                {/if}
            {/if}
        </div>
    {/if}
    <iframe
        title="visitCard"
        src={visitCardUrl}
        allow="clipboard-read; clipboard-write self {visitCardUrl}"
        style="width: {w}; height: {h}"
        class:hidden
        bind:this={cvIframe}
    />
</section>

<svelte:window on:message={handleIframeMessage} />

<style lang="scss">
    .loader {
        border: 16px solid #f3f3f3; /* Light grey */
        border-top: 16px solid #3498db; /* Blue */
        border-radius: 50%;
        width: 120px;
        height: 120px;
        margin: auto;
        animation: spin 2s linear infinite;
        z-index: 350;
    }

    @keyframes spin {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }

    .visitCard {
        pointer-events: all;
        position: absolute;
        left: 50%;
        transform: translate(-50%, 0);
        margin-top: 200px;
        max-width: 80vw;
        z-index: 350;

        iframe {
            border: 0;
            max-width: 80vw;
            overflow: hidden;

            &.hidden {
                visibility: hidden;
                position: absolute;
            }
        }

        button {
            float: right;
        }
    }
</style>
