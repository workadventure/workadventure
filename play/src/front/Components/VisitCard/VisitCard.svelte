<script lang="ts">
    import { onMount } from "svelte";
    import { get } from "svelte/store";
    import { requestVisitCardsStore, selectedChatIDRemotePlayerStore } from "../../Stores/GameStore";
    import { LL } from "../../../i18n/i18n-svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { openDirectChatRoom } from "../../Chat/Utils";

    import ButtonClose from "../Input/ButtonClose.svelte";
    import { IconLoader } from "@wa-icons";

    export let visitCardUrl: string;
    export let isEmbedded = false;
    export let showSendMessageButton = true;
    export let maxHeigth = 350;
    let w = "100%";
    let h = 250;
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
            console.log("visitCard message", message.data);
            // w = message.data.data.w + "px";
            h = message.data.data.h;
        }
    }

    onMount(() => {
        cvIframe.onload = () => (hidden = false);
        cvIframe.onerror = () => (hidden = false);
    });
</script>

<section class="visitCard {isEmbedded ? '' : 'w-3/4 min-w-[320px] max-w-[900px]'}">
    <div class="{isEmbedded ? '' : 'bg-contrast/80 rounded-lg'} relative">
        {#if !isEmbedded}
            <div class="absolute top-2 {h > maxHeigth ? 'right-5' : ' right-2'}">
                <ButtonClose dataTestId="closeVisitCardButton" on:click={closeCard} />
            </div>
        {/if}
        {#if hidden}
            <div class="w-full flex justify-center items-center p-4">
                <div class="spinner" />
            </div>
        {/if}
        <div class={isEmbedded ? "" : "p-2"}>
            <iframe
                title="visitCard"
                src="{visitCardUrl}&embed={isEmbedded}"
                class="max-h-lg"
                allow="clipboard-read; clipboard-write {visitCardUrl}"
                style="width: {w}; height: {Math.min(h, maxHeigth)}px"
                class:hidden
                bind:this={cvIframe}
            />
        </div>
        {#if !hidden && !isEmbedded}
            <div class="buttonContainer p-2.5 flex flex-row justify-end gap-2 bg-contrast rounded-b-lg">
                {#if selectPlayerChatID && showSendMessageButton}
                    {#if !$roomCreationInProgress}
                        <button
                            class="btn btn-secondary light cursor-pointer"
                            data-testid="sendMessagefromVisitCardButton"
                            on:click={openChat}>{$LL.menu.visitCard.sendMessage()}</button
                        >
                    {:else}
                        <button
                            class="light cursor-pointer px-3 mb-2 mr-0"
                            data-testid="sendMessagefromVisitCardButton"
                        >
                            <IconLoader class="animate-spin" />
                        </button>
                    {/if}
                {/if}
            </div>
        {/if}
    </div>
</section>

<svelte:window on:message={handleIframeMessage} />

<style lang="scss">
    .spinner {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        border: 9px solid;
        border-right-color: #ffffff;
        animation: spinner 1s infinite linear;
    }

    @keyframes spinner {
        to {
            transform: rotate(1turn);
        }
    }
    //.loader {
    //    border: 16px solid #f3f3f3; /* Light grey */
    //    border-top: 16px solid #3498db; /* Blue */
    //    border-radius: 50%;
    //    width: 120px;
    //    height: 120px;
    //    margin: auto;
    //    animation: spin 2s linear infinite;
    //    z-index: 350;
    //}
    //
    //@keyframes spin {
    //    0% {
    //        transform: rotate(0deg);
    //    }
    //    100% {
    //        transform: rotate(360deg);
    //    }
    //}

    .visitCard {
        pointer-events: all;
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
